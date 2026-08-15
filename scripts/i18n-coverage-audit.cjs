const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const ROOT = process.cwd();
const CATALOG_PATH = path.join(ROOT, "src/i18n/uiTranslations.ts");
const SOURCE_ROOTS = [path.join(ROOT, "app"), path.join(ROOT, "src")];
const REQUIRED_LOCALES = ["en", "es", "de", "it", "pt"];
const UI_PROP_NAMES = new Set([
  "title", "subtitle", "label", "placeholder", "accessibilityLabel", "accessibilityHint",
  "description", "message", "confirmLabel", "cancelLabel", "emptyTitle", "emptyMessage",
  "hint", "caption", "helperText", "prompt", "headerTitle"
]);
const NON_TRANSLATABLE = new Set([
  "Connexio", "Neptune", "Neptune Business", "Visionnaire", "Amiral", "Capitaine", "Moussaillon", "Triton",
  "iOS", "Android", "YouTube", "WhatsApp", "EAS", "Expo"
]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      out.push(...walk(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function decodeQuoted(value) {
  try { return JSON.parse(`"${value}"`); } catch { return value; }
}

const catalogSource = fs.readFileSync(CATALOG_PATH, "utf8");
const catalog = new Map();
for (const match of catalogSource.matchAll(/^\s*"((?:\\.|[^"\\])+)"\s*:\s*\{([^}]*)\}/gm)) {
  const key = decodeQuoted(match[1]);
  const body = match[2];
  catalog.set(key, new Set(REQUIRED_LOCALES.filter((locale) => new RegExp(`\\b${locale}\\s*:`).test(body))));
}

function clean(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function shouldIgnore(value) {
  if (!value || value.length < 2) return true;
  if (NON_TRANSLATABLE.has(value)) return true;
  if (/^(https?:\/\/|mailto:|tel:|wss?:\/\/|\/|#|[A-Za-z0-9_.-]+\.(png|jpg|jpeg|svg|mp3|mp4|pdf))/.test(value)) return true;
  if (/^[A-Z0-9_.:@/+-]+$/.test(value) && !/[À-ÿ]/.test(value)) return true;
  if (/^[0-9\s.,:+%€$-]+$/.test(value)) return true;
  if (/^[a-z0-9-]+-(outline|sharp)$/i.test(value)) return true;
  return !/[A-Za-zÀ-ÿ]/.test(value);
}

const candidates = new Map();
function addCandidate(raw, file, node, kind) {
  const value = clean(raw);
  if (shouldIgnore(value)) return;
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  const source = node.getSourceFile();
  const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
  if (!candidates.has(value)) candidates.set(value, []);
  candidates.get(value).push(`${relative}:${line + 1} (${kind})`);
}

function propName(node) {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isStringLiteral(node)) return node.text;
  return "";
}

function stringValue(node) {
  if (ts.isStringLiteralLike(node)) return node.text;
  return null;
}

function isInsideJsxExpression(node) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxExpression(current)) return true;
    if (ts.isStatement(current) || ts.isSourceFile(current)) return false;
    current = current.parent;
  }
  return false;
}

for (const file of SOURCE_ROOTS.flatMap(walk)) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  if (relative.startsWith("src/i18n/")) continue;
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  function visit(node) {
    if (ts.isJsxText(node)) addCandidate(node.text, file, node, "jsx");

    if (ts.isJsxAttribute(node) && UI_PROP_NAMES.has(node.name.text)) {
      if (node.initializer && ts.isStringLiteral(node.initializer)) addCandidate(node.initializer.text, file, node, `prop:${node.name.text}`);
    }

    if (ts.isPropertyAssignment(node) && UI_PROP_NAMES.has(propName(node.name))) {
      const value = stringValue(node.initializer);
      if (value !== null) addCandidate(value, file, node, `object:${propName(node.name)}`);
    }

    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && isInsideJsxExpression(node)) {
      addCandidate(node.text, file, node, "jsx-expression");
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sf);
      const uiCall = /(^|\.)(alert|showAlert|showToast|showConfirmation|confirm|set[A-Za-z]*Error|setError)$/i.test(callee) || callee === "Alert.alert";
      if (uiCall) {
        node.arguments.forEach((arg) => {
          const value = stringValue(arg);
          if (value !== null) addCandidate(value, file, arg, `call:${callee}`);
        });
      }
    }

    ts.forEachChild(node, visit);
  }
  visit(sf);
}

const missing = [...candidates.entries()].filter(([text]) => !catalog.has(text));
const incomplete = [...catalog.entries()].filter(([, locales]) => REQUIRED_LOCALES.some((locale) => !locales.has(locale)));

if (missing.length || incomplete.length) {
  console.error("Audit i18n Connexio en échec.");
  if (missing.length) {
    console.error(`\n${missing.length} libellé(s) d’interface sans traduction cataloguée :`);
    for (const [text, locations] of missing.sort((a, b) => a[0].localeCompare(b[0], "fr"))) {
      console.error(`- ${JSON.stringify(text)} -> ${locations.slice(0, 4).join(", ")}`);
    }
  }
  if (incomplete.length) {
    console.error(`\n${incomplete.length} entrée(s) de catalogue incomplète(s) :`);
    for (const [text, locales] of incomplete) {
      const absent = REQUIRED_LOCALES.filter((locale) => !locales.has(locale));
      console.error(`- ${JSON.stringify(text)} manque ${absent.join(", ")}`);
    }
  }
  process.exit(1);
}

console.log(`Audit i18n Connexio validé : ${candidates.size} libellés UI couverts, ${catalog.size} entrées cataloguées, ${REQUIRED_LOCALES.length + 1} langues UI.`);
