const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "assets/icon.png",
  "assets/adaptive-icon.png",
  "assets/splash-icon.png",
  "assets/favicon.png",
  "assets/notification-icon.png",
  "assets/audio/connexio-ringtone.mp3",
  "assets/audio/connexio_notification.mp3",
  "app.config.ts",
  "eas.json",
  "docs/INTEGRATION_MATRIX.md",
  "src/config/backendCapabilities.ts",
  "src/config/integrationRegistry.ts",
  "src/domain/accessPolicy.ts",
  "src/domain/roleAppearance.ts",
  "app/community-guidelines.tsx",
  "app/membership-required.tsx",
  "public/privacy-policy.html",
  "public/connexio-terms.html",
  "public/account-deletion.html"
];

const forbiddenNames = [
  ".tmp_",
  ".rc1_",
  "rc1_apply.py",
  "rc1_postfix.py",
  "rc1_runner.py",
  "rc-lock-refresh.yml",
  "RC1_WORK_IN_PROGRESS.md"
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules", "dist", ".expo", ".test-dist"].includes(entry.name)) {
      return [];
    }
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  throw new Error(`Ressources RC manquantes : ${missing.join(", ")}`);
}

const repositoryFiles = walk(root).map((file) => path.relative(root, file).replaceAll("\\", "/"));
const forbidden = repositoryFiles.filter((file) =>
  forbiddenNames.some((marker) => file.includes(marker))
);
if (forbidden.length) {
  throw new Error(`Artefacts temporaires interdits : ${forbidden.join(", ")}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (packageJson.version !== "1.0.0-rc.1") {
  throw new Error(`Version package inattendue : ${packageJson.version}`);
}

const appConfig = fs.readFileSync(path.join(root, "app.config.ts"), "utf8");
const appVersionMatch = appConfig.match(/const APP_VERSION = "(\d+\.\d+\.\d+)";/);
if (!appVersionMatch) {
  throw new Error("Configuration store incomplète : APP_VERSION sémantique introuvable");
}
for (const marker of [
  "privacyManifests",
  "connexio_notification.mp3",
  "EXPO_PUBLIC_ACCOUNT_DELETION_URL",
  "EXPO_PUBLIC_PRIVACY_POLICY_URL",
  "EXPO_PUBLIC_TERMS_URL",
  "EXPO_PUBLIC_BACKEND_CONTRACT",
  "Build Store bloquée",
  "PUBLIC_POLICY_BASE_URL",
  "blockedPermissions",
  "android.permission.ACCESS_FINE_LOCATION"
]) {
  if (!appConfig.includes(marker)) {
    throw new Error(`Configuration store incomplète : ${marker}`);
  }
}
if (appConfig.includes('"ACCESS_FINE_LOCATION"')) {
  throw new Error("Permission Android ACCESS_FINE_LOCATION interdite sans besoin produit prouvé.");
}

const accessPolicy = fs.readFileSync(path.join(root, "src/domain/accessPolicy.ts"), "utf8");
for (const marker of [
  "canInitiatePrivateInteraction",
  "canPublishHighlightKind",
  "getGroupJoinDecision",
  "canPublishInConversation"
]) {
  if (!accessPolicy.includes(marker)) {
    throw new Error(`Politique d’accès incomplète : ${marker}`);
  }
}

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".cjs", ".mjs", ".json", ".md", ".html"]);
const scannerImplementationFiles = new Set([
  "scripts/release-candidate-audit.cjs"
]);
const textFiles = repositoryFiles.filter(
  (file) =>
    sourceExtensions.has(path.extname(file)) &&
    !scannerImplementationFiles.has(file)
);
const forbiddenStoreMarkers = [
  "checkout.stripe.com",
  "buy.stripe.com",
  "Le front est prêt ; l’action serveur doit être connectée avant le pilote",
  "Cet écran définit les parcours front"
];
for (const file of textFiles) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  const marker = forbiddenStoreMarkers.find((value) => content.includes(value));
  if (marker) {
    throw new Error(`Contenu interdit pour une release Store dans ${file} : ${marker}`);
  }
}

const privacyScreen = fs.readFileSync(path.join(root, "app/privacy.tsx"), "utf8");
for (const marker of [
  "env.privacyPolicyUrl",
  "env.termsUrl",
  "env.accountDeletionUrl",
  'router.push("/community-guidelines")'
]) {
  if (!privacyScreen.includes(marker)) {
    throw new Error(`Parcours confidentialité incomplet : ${marker}`);
  }
}

const publicTerms = fs.readFileSync(path.join(root, "public/connexio-terms.html"), "utf8");
for (const marker of ["Contenus générés par les utilisateurs", "Signalement, blocage et modération"]) {
  if (!publicTerms.includes(marker)) {
    throw new Error(`Conditions Connexio incomplètes : ${marker}`);
  }
}

console.log(`Audit RC/store réussi : ${repositoryFiles.length} fichiers contrôlés. Version app ${appVersionMatch[1]}.`);
