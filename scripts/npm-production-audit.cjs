const { spawnSync } = require("node:child_process");

const ALLOWED_UNPATCHED_ADVISORIES = new Set([
  "GHSA-w3rx-r6r6-pgpr",
  "GHSA-5p2g-fcmc-qvqq"
]);

const audit = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["audit", "--omit=dev", "--json"],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 }
);

if (!audit.stdout?.trim()) {
  process.stderr.write(audit.stderr || "npm audit n'a produit aucun rapport.\n");
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch (error) {
  console.error("Rapport npm audit JSON invalide.", error);
  process.exit(1);
}

const vulnerabilities = report.vulnerabilities ?? {};

function advisoryIdFromUrl(url) {
  if (typeof url !== "string") return null;
  const match = url.match(/GHSA-[a-z0-9-]+/i);
  return match?.[0] ?? null;
}

function collectAdvisories(packageName, visiting = new Set()) {
  if (visiting.has(packageName)) return new Set();
  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return new Set();

  const nextVisiting = new Set(visiting);
  nextVisiting.add(packageName);
  const advisories = new Set();

  for (const cause of vulnerability.via ?? []) {
    if (typeof cause === "string") {
      for (const advisory of collectAdvisories(cause, nextVisiting)) {
        advisories.add(advisory);
      }
      continue;
    }

    const advisory = advisoryIdFromUrl(cause?.url);
    if (advisory) advisories.add(advisory);
    else advisories.add(`UNIDENTIFIED:${packageName}:${cause?.source ?? "unknown"}`);
  }

  return advisories;
}

const blocking = [];
const allowed = [];

for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  if (!vulnerability || !["high", "critical"].includes(vulnerability.severity)) {
    continue;
  }

  const advisories = collectAdvisories(packageName);
  const advisoryList = [...advisories];
  const isAllowed =
    advisoryList.length > 0 &&
    advisoryList.every((id) => ALLOWED_UNPATCHED_ADVISORIES.has(id));

  if (isAllowed) {
    allowed.push({ packageName, severity: vulnerability.severity, advisories: advisoryList });
  } else {
    blocking.push({
      packageName,
      severity: vulnerability.severity,
      advisories: advisoryList,
      fixAvailable: vulnerability.fixAvailable ?? null
    });
  }
}

if (allowed.length > 0) {
  console.log("Exceptions temporaires sans correctif amont :");
  for (const item of allowed) {
    console.log(`- ${item.packageName}: ${item.advisories.join(", ")}`);
  }
}

if (blocking.length > 0) {
  console.error("Vulnérabilités high/critical bloquantes :");
  console.error(JSON.stringify(blocking, null, 2));
  process.exit(1);
}

console.log(
  `Audit dépendances production accepté : aucune vulnérabilité high/critical hors exceptions explicitement documentées (${[
    ...ALLOWED_UNPATCHED_ADVISORIES
  ].join(", ")}).`
);
