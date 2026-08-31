const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const workflowDirectory = path.join(root, ".github", "workflows");
const workflowFiles = fs
  .readdirSync(workflowDirectory)
  .filter((file) => /\.ya?ml$/.test(file))
  .sort();
const workflows = new Map(
  workflowFiles.map((file) => [file, fs.readFileSync(path.join(workflowDirectory, file), "utf8")])
);
const failures = [];

function requireIn(file, pattern, message) {
  const source = workflows.get(file);
  if (!source) failures.push(`${file}: workflow manquant`);
  else if (!pattern.test(source)) failures.push(`${file}: ${message}`);
}

for (const [file, source] of workflows) {
  if (/contents:\s*write/.test(source)) failures.push(`${file}: permission contents:write interdite`);
  if (/\bgit\s+(?:commit|push)\b/.test(source)) {
    failures.push(`${file}: un workflow de validation ne doit pas modifier une branche`);
  }
}

const pagesDeployments = [...workflows.values()].filter((source) =>
  source.includes("actions/deploy-pages@")
).length;
if (pagesDeployments !== 1) {
  failures.push(`GitHub Pages: ${pagesDeployments} chaînes de déploiement détectées au lieu d’une`);
}

requireIn(
  "web-preview.yml",
  /branches:[\s\S]*- release\/connexio-rc1/,
  "la release doit déclencher la prévisualisation publique"
);
requireIn(
  "web-preview.yml",
  /actions\/upload-pages-artifact@v3[\s\S]*actions\/deploy-pages@v4/,
  "la publication doit utiliser un artefact Pages immuable"
);
requireIn(
  "native-release-candidate.yml",
  /ref:\s*release\/connexio-rc1/,
  "la source RC doit être verrouillée sur la branche de release"
);
requireIn(
  "native-release-candidate.yml",
  /npm run smoke:production/,
  "le backend doit être certifié avant une build RC"
);
requireIn(
  "native-production.yml",
  /environment:\s*production/,
  "les binaires Store doivent passer par l’environnement protégé production"
);
requireIn(
  "native-production.yml",
  /ref:\s*release\/connexio-rc1[\s\S]*npm run smoke:production/,
  "la build Store doit verrouiller sa source et certifier le backend"
);
requireIn(
  "ci.yml",
  /expo prebuild --platform android --clean --no-install/,
  "la configuration native Android doit être générée en CI"
);

for (const obsolete of ["deploy-v14-preview-pages.yml", "fix-map-hit-testing.yml"]) {
  if (workflows.has(obsolete)) failures.push(`${obsolete}: workflow ponctuel obsolète à supprimer`);
}

const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
if (!/^builds\/$/m.test(gitignore)) {
  failures.push(".gitignore: les rapports EAS générés doivent rester des artefacts, pas du code source");
}

if (failures.length) {
  console.error("Audit de gouvernance des workflows en échec:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Audit de gouvernance réussi (${workflowFiles.length} workflows contrôlés).`);
