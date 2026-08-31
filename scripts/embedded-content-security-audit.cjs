const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceRoots = ["app", "src"];
const sourceFiles = [];

function visit(relativeDirectory) {
  const absoluteDirectory = path.join(root, relativeDirectory);
  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    const relativePath = path.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) visit(relativePath);
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) sourceFiles.push(relativePath);
  }
}

for (const directory of sourceRoots) visit(directory);

const failures = [];
const contents = new Map(
  sourceFiles.map((file) => [file, fs.readFileSync(path.join(root, file), "utf8")])
);

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

for (const [file, source] of contents) {
  if (/postMessage\([^;\n]{0,800},\s*["']\*["']/.test(source)) {
    fail(file, "postMessage utilise une origine cible générique");
  }
  if (/originWhitelist\s*=\s*\{[^}]*https:\/\/\*/.test(source)) {
    fail(file, "la WebView accepte toutes les origines HTTPS");
  }
  if (/<html\s+lang=["']fr["']/i.test(source)) {
    fail(file, "la langue du document embarqué est codée en dur");
  }
  if (source.includes("<WebView") && !source.includes("onShouldStartLoadWithRequest=")) {
    fail(file, "la WebView ne filtre pas les navigations");
  }
  if (source.includes('createElement("iframe"') || source.includes("createElement('iframe'")) {
    if (!source.includes("sandbox:")) fail(file, "l’iframe ne définit pas de sandbox");
    if (!source.includes("referrerPolicy:")) fail(file, "l’iframe ne désactive pas le référent");
  }
}

const nativeBridgeFiles = [
  "src/components/CallSurface.native.tsx",
  "src/components/CoworkingGeographicMap.native.tsx",
  "src/components/CoworkingMediaSurface.native.tsx",
  "src/components/DiscoveryMap.native.tsx",
  "src/components/NeptuneMap.native.tsx",
  "src/components/VoiceRecorderModal.native.tsx"
];

for (const file of nativeBridgeFiles) {
  const source = contents.get(file) ?? fs.readFileSync(path.join(root, file), "utf8");
  if (!source.includes("event.nativeEvent.url")) {
    fail(file, "la source d’un message natif n’est pas vérifiée");
  }
}

const leafletAssetsFile = "src/services/maps/leafletAssets.ts";
const leafletAssets = contents.get(leafletAssetsFile) ?? fs.readFileSync(path.join(root, leafletAssetsFile), "utf8");
const externalAssetTags = leafletAssets.match(/<(?:script|link)\b[^>]+(?:src|href)=/g) ?? [];
const integrityAttributes = leafletAssets.match(/\bintegrity="sha384-[^"]+"/g) ?? [];
if (externalAssetTags.length !== 5 || integrityAttributes.length !== externalAssetTags.length) {
  fail(leafletAssetsFile, "chaque ressource cartographique externe doit être épinglée avec SRI");
}
if (!leafletAssets.includes("Content-Security-Policy")) {
  fail(leafletAssetsFile, "la carte n’émet pas de Content Security Policy");
}

if (failures.length) {
  console.error("Audit de sécurité des contenus embarqués en échec:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Audit de sécurité des contenus embarqués réussi (${sourceFiles.length} fichiers, ${externalAssetTags.length} ressources SRI).`
);
