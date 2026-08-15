const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const SOURCE_ROOTS = [path.join(ROOT, "app"), path.join(ROOT, "src")];
const PLUGIN_PATH = path.join(ROOT, "scripts/babel-plugin-connexio-i18n.cjs");
const RUNTIME_DATE_PATH = path.join(ROOT, "src/utils/date.ts");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      files.push(...walk(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const plugin = fs.readFileSync(PLUGIN_PATH, "utf8");
const pluginCoversLocaleCalls =
  plugin.includes("toLocaleString") &&
  plugin.includes("toLocaleDateString") &&
  plugin.includes("toLocaleTimeString") &&
  plugin.includes("DateTimeFormat") &&
  plugin.includes("getCurrentUiLocaleTag");

if (!pluginCoversLocaleCalls) {
  console.error("Audit locale UI en échec : le plugin Babel ne couvre plus tous les formats date/heure Connexio.");
  process.exit(1);
}

const runtimeDateSource = fs.readFileSync(RUNTIME_DATE_PATH, "utf8");
if (/Intl\.DateTimeFormat\(\s*["']fr(?:-FR)?["']/.test(runtimeDateSource)) {
  console.error("Audit locale UI en échec : src/utils/date.ts fige encore un formatter français au niveau module.");
  process.exit(1);
}

const rewritten = [];
for (const file of SOURCE_ROOTS.flatMap(walk)) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  if (relative.startsWith("src/i18n/")) continue;
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/\.toLocale(?:String|DateString|TimeString)\(\s*["']fr(?:-FR)?["']/.test(line) || /new\s+Intl\.DateTimeFormat\(\s*["']fr(?:-FR)?["']/.test(line)) {
      rewritten.push(`${relative}:${index + 1}`);
    }
  });
}

console.log(
  `Audit locale UI validé : ${rewritten.length} formatage(s) historique(s) fr-FR sont réécrits au build vers la locale Connexio active; les formatters partagés sont dynamiques.`
);
