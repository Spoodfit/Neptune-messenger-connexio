const { spawnSync } = require("node:child_process");

const ALLOWED_UNPATCHED_ADVISORIES = new Set([
  "GHSA-w3rx-r6r6-pgpr",
  "GHSA-5p2g-fcmc-qvqq"
]);
const BLOCKING_SEVERITIES = new Set(["high", "critical"]);

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

function collectConcreteAdvisories(packageName, visiting = new Set()) {
  if (visiting.has(packageName)) return new Map();
  const vulnerability = vulnerabilities[packageName];
  if (!vulnerability) return new Map();

  const nextVisiting = new Set(visiting);
  nextVisiting.add(packageName);
  const advisories = new Map();

  for (const cause of vulnerability.via ?? []) {
    if (typeof cause === "string") {
      for (const [id, severity] of collectConcreteAdvisories(cause, nextVisiting)) {
        advisories.set(id, severity);
      }
      continue;
    }

    const advisory = advisoryIdFromUrl(cause?.url);
    const severity = typeof cause?.severity === "string" ? cause.severity : "unknown";
    if (advisory) {
      advisories.set(advisory, severity);
    } else {
      advisories.set(
        `UNIDENTIFIED:${packageName}:${cause?.source ?? "unknown"}`,
        severity
      );
    }
  }

  return advisories;
}

const blocking = [];
const allowed = [];

for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  if (!vulnerability || !BLOCKING_SEVERITIES.has(vulnerability.severity)) {
    continue;
  }

  const concrete = collectConcreteAdvisories(packageName);
  const highOrCritical = [...concrete.entries()].filter(([, severity]) =>
    BLOCKING_SEVERITIES.has(severity)
  );

  if (highOrCritical.length === 0) {
    // npm can mark a parent package high because of an aggregate dependency graph.
    // If its concrete advisories are only low/moderate, the high-severity gate
    // must not fabricate an additional blocker.
    continue;
  }

  const unapproved = highOrCritical.filter(
    ([id]) => !ALLOWED_UNPATCHED_ADVISORIES.has(id)
  );

  if (unapproved.length === 0) {
    allowed.push({
      packageName,
      severity: vulnerability.severity,
      advisories: highOrCritical.map(([id]) => id)
    });
  } else {
    blocking.push({
      packageName,
      severity: vulnerability.severity,
      advisories: highOrCritical.map(([id, severity]) => ({ id, severity })),
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
