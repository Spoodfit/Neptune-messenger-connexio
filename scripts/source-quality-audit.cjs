const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const scanRoots = ["app", "src", "scripts", "tests", "tests-node"];
const extensions = new Set([".cjs", ".js", ".jsx", ".ts", ".tsx"]);
const files = [];

function visit(relativeDirectory) {
  for (const entry of fs.readdirSync(path.join(root, relativeDirectory), { withFileTypes: true })) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) visit(relativePath);
    else if (extensions.has(path.extname(entry.name))) files.push(relativePath);
  }
}

for (const directory of scanRoots) visit(directory);
files.sort();

const failures = [];
const productionNetworkFiles = new Set([
  "src/services/api/httpClient.ts",
  "src/services/api/uploadApi.ts"
]);

function report(file, line, message) {
  failures.push(`${file}:${line}: ${message}`);
}

function scriptKind(file) {
  if (file.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (file.endsWith(".ts")) return ts.ScriptKind.TS;
  if (file.endsWith(".jsx")) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const lines = source.split(/\r?\n/);

  if (source && !source.endsWith("\n")) report(file, lines.length, "nouvelle ligne finale manquante");
  lines.forEach((line, index) => {
    if (/[ \t]+$/.test(line)) report(file, index + 1, "espace final interdit");
  });

  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(file)
  );
  for (const diagnostic of sourceFile.parseDiagnostics) {
    const position = sourceFile.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    report(
      file,
      position.line + 1,
      ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")
    );
  }

  if (!file.startsWith("app/") && !file.startsWith("src/")) continue;
  lines.forEach((line, index) => {
    if (/\/\/\s*@ts-(?:ignore|nocheck)/.test(line)) {
      report(file, index + 1, "suppression TypeScript interdite");
    }
    if (/\bdebugger\s*;?/.test(line)) report(file, index + 1, "debugger interdit");
    if (/\bconsole\.(?:log|debug|info|warn|error)\s*\(/.test(line)) {
      report(file, index + 1, "journalisation directe interdite dans le produit");
    }
    if (/\beval\s*\(|\bnew\s+Function\s*\(/.test(line)) {
      report(file, index + 1, "évaluation dynamique interdite");
    }
    if (/http:\/\//.test(line)) report(file, index + 1, "URL HTTP non chiffrée interdite");
  });

  if (/\bprocess\.env\b/.test(source) && file !== "src/config/env.ts") {
    report(file, 1, "les variables publiques doivent être centralisées dans src/config/env.ts");
  }
  if (/\bfetch\s*\(/.test(source) && !productionNetworkFiles.has(file)) {
    report(file, 1, "les accès réseau doivent passer par les services HTTP autorisés");
  }
}

if (failures.length) {
  console.error("Contrôle statique du code en échec:\n");
  failures.slice(0, 100).forEach((failure) => console.error(`- ${failure}`));
  if (failures.length > 100) console.error(`- … ${failures.length - 100} erreur(s) supplémentaire(s)`);
  process.exit(1);
}

console.log(`Contrôle statique réussi (${files.length} fichiers analysés).`);
