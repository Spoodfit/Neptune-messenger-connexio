const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const canonicalProjectId = "1e85dc3a-4114-4387-8e15-2463a82e68fd";
const canonicalEnvironment = {
  EXPO_PUBLIC_MOCK_MODE: "false",
  EXPO_PUBLIC_BACKEND_CONTRACT: "connexio-v1",
  EXPO_PUBLIC_API_BASE_URL: "https://api.neptunebusiness.com/api",
  EXPO_PUBLIC_REALTIME_URL: "https://api.neptunebusiness.com",
  EXPO_PUBLIC_COWORKING_ENABLED: "true",
  EXPO_PUBLIC_BUSINESS_WEB_BASE_URL: "https://neptunebusiness.com",
  EXPO_PUBLIC_EAS_PROJECT_ID: canonicalProjectId
};

function expoConfig(buildProfile, overrides = {}) {
  const executable = path.join(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "expo.cmd" : "expo"
  );
  const result = spawnSync(
    executable,
    ["config", "--type", "public", "--json"],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        EXPO_NO_TELEMETRY: "1",
        ...canonicalEnvironment,
        EAS_BUILD_PROFILE: buildProfile,
        ...overrides
      }
    }
  );
  return result;
}

function requireSuccessfulConfig(profile) {
  const result = expoConfig(profile);
  if (result.status !== 0) {
    throw new Error(
      `Configuration ${profile} invalide : ${(result.stderr || result.stdout).trim()}`
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error(`Configuration ${profile} non JSON.`);
  }
}

function requireRejectedConfig(label, profile, overrides, expectedMessage) {
  const result = expoConfig(profile, overrides);
  if (result.status === 0) {
    throw new Error(`${label} aurait dû être bloquée.`);
  }
  const output = `${result.stdout}\n${result.stderr}`;
  if (!output.includes(expectedMessage)) {
    throw new Error(`${label} bloquée pour une raison inattendue : ${output.trim()}`);
  }
}

const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
const releaseCandidate = eas.build?.["release-candidate"];
const production = eas.build?.production;
for (const [label, profile, environment] of [
  ["release-candidate", releaseCandidate, "preview"],
  ["production", production, "production"]
]) {
  if (!profile) throw new Error(`Profil EAS ${label} manquant.`);
  if (profile.environment !== environment) {
    throw new Error(`Le profil ${label} doit utiliser l’environnement EAS ${environment}.`);
  }
  for (const [name, value] of Object.entries(canonicalEnvironment)) {
    if (name === "EXPO_PUBLIC_EAS_PROJECT_ID") continue;
    if (profile.env?.[name] !== value) {
      throw new Error(`Le profil ${label} doit fixer ${name}=${value}.`);
    }
  }
}

const productionConfig = requireSuccessfulConfig("production");
if (productionConfig.extra?.backendContract !== "connexio-v1") {
  throw new Error("Le binaire production n’embarque pas connexio-v1.");
}
if (productionConfig.extra?.mockMode !== false) {
  throw new Error("Le binaire production embarque le mode mock.");
}
if (productionConfig.extra?.coworkingEnabled !== true) {
  throw new Error("Le Coworking n’est pas activé dans le binaire production.");
}
if (productionConfig.extra?.releaseStage !== "production") {
  throw new Error("Le releaseStage production n’est pas embarqué.");
}
if (productionConfig.extra?.eas?.projectId !== canonicalProjectId) {
  throw new Error("Le binaire production cible un projet EAS inattendu.");
}
if (productionConfig.android?.package !== "com.neptunebusiness.connexio") {
  throw new Error("Package Android production inattendu.");
}
if (productionConfig.ios?.bundleIdentifier !== "com.neptunebusiness.connexio") {
  throw new Error("Bundle iOS production inattendu.");
}

requireSuccessfulConfig("release-candidate");
requireRejectedConfig(
  "Backend Neptune historique en production",
  "production",
  { EXPO_PUBLIC_BACKEND_CONTRACT: "neptune-web-v1" },
  "backend ne déclare pas encore le contrat sécurisé connexio-v1"
);
requireRejectedConfig(
  "Backend Neptune historique en release candidate",
  "release-candidate",
  { EXPO_PUBLIC_BACKEND_CONTRACT: "neptune-web-v1" },
  "backend ne déclare pas encore le contrat sécurisé connexio-v1"
);
requireRejectedConfig(
  "Mode mock en production",
  "production",
  { EXPO_PUBLIC_MOCK_MODE: "true" },
  "EXPO_PUBLIC_MOCK_MODE doit être false"
);

console.log(
  `Audit configuration production réussi : connexio-v1, Coworking actif, projet EAS ${canonicalProjectId}.`
);
