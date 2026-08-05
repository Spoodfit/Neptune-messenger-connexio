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
  "src/config/integrationRegistry.ts",
  "src/domain/accessPolicy.ts",
  "src/domain/roleAppearance.ts"
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
for (const marker of [
  'const APP_VERSION = "1.0.0"',
  "privacyManifests",
  "connexio_notification.mp3",
  "EXPO_PUBLIC_ACCOUNT_DELETION_URL",
  "EXPO_PUBLIC_PRIVACY_POLICY_URL"
]) {
  if (!appConfig.includes(marker)) {
    throw new Error(`Configuration store incomplète : ${marker}`);
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

console.log(`Audit RC réussi : ${repositoryFiles.length} fichiers contrôlés.`);
