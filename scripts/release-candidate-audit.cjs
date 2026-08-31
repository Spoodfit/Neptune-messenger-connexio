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
  "scripts/connexio-readiness.cjs",
  "scripts/production-config-audit.cjs",
  "scripts/neptune-backend-smoke.cjs",
  "docs/INTEGRATION_MATRIX.md",
  "docs/DEPENDENCY_RISK_ACCEPTANCE.md",
  "docs/PRODUCTION_BACKEND_READINESS.md",
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
  "Build candidate/Store bloquée",
  "PUBLIC_POLICY_BASE_URL",
  "blockedPermissions",
  "android.permission.ACCESS_FINE_LOCATION",
  "coworkingEnabled",
  "releaseStage"
]) {
  if (!appConfig.includes(marker)) {
    throw new Error(`Configuration store incomplète : ${marker}`);
  }
}
if (appConfig.includes('"ACCESS_FINE_LOCATION"')) {
  throw new Error("Permission Android ACCESS_FINE_LOCATION interdite sans besoin produit prouvé.");
}

const canonicalProjectId = "1e85dc3a-4114-4387-8e15-2463a82e68fd";
if (!appConfig.includes(canonicalProjectId)) {
  throw new Error("Projet EAS Connexio canonique absent de app.config.ts.");
}
const staleProjectId = "d2288b09-8249-4879-810f-7cb0072baeeb";
const staleProjectReferences = repositoryFiles.filter((file) => {
  if (file === "scripts/release-candidate-audit.cjs") return false;
  if (file.startsWith("builds/")) return false;
  const extension = path.extname(file);
  if (![".ts", ".tsx", ".js", ".cjs", ".mjs", ".json", ".md", ".yml", ".yaml"].includes(extension)) {
    return false;
  }
  return fs.readFileSync(path.join(root, file), "utf8").includes(staleProjectId);
});
if (staleProjectReferences.length) {
  throw new Error(`Ancien projet EAS encore référencé : ${staleProjectReferences.join(", ")}`);
}

const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
for (const profileName of ["release-candidate", "production"]) {
  const profile = eas.build?.[profileName];
  if (!profile) throw new Error(`Profil EAS ${profileName} manquant.`);
  if (profile.env?.EXPO_PUBLIC_MOCK_MODE !== "false") {
    throw new Error(`Le profil ${profileName} ne doit jamais utiliser le mock.`);
  }
  if (profile.env?.EXPO_PUBLIC_BACKEND_CONTRACT !== "connexio-v1") {
    throw new Error(`Le profil ${profileName} doit utiliser connexio-v1.`);
  }
  if (!profile.env?.EXPO_PUBLIC_REALTIME_URL) {
    throw new Error(`Le profil ${profileName} doit définir le temps réel.`);
  }
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
