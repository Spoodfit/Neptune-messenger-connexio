const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();
const SOURCE_ROOTS = [path.join(ROOT, "app"), path.join(ROOT, "src")];

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

const offenders = [];
for (const file of SOURCE_ROOTS.flatMap(walk)) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  if (relative.startsWith("src/i18n/")) continue;
  const source = fs.readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/\.toLocale(?:String|DateString|TimeString)\(\s*["']fr(?:-FR)?["']/.test(line) || /new\s+Intl\.DateTimeFormat\(\s*["']fr(?:-FR)?["']/.test(line)) {
      offenders.push(`${relative}:${index + 1}: ${line.trim().slice(0, 220)}`);
    }
  });
}

if (offenders.length) {
  console.error(`Audit locale UI en échec : ${offenders.length} formatage(s) visible(s) encore forcé(s) en français.`);
  offenders.forEach((line) => console.error(`- ${line}`));
  process.exit(1);
}

console.log("Audit locale UI validé : aucun formatage date/heure visible n’est forcé en français.");
