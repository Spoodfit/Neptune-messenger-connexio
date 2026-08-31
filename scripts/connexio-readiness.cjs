const REQUIRED_CAPABILITIES = Object.freeze({
  authentication: ["authentication", "auth"],
  memberDirectory: ["member_directory", "memberDirectory"],
  messaging: ["messaging"],
  privateMedia: ["private_media", "privateMedia"],
  realtime: ["realtime"],
  calls: ["calls"],
  pushNotifications: ["push_notifications", "pushNotifications"],
  moderation: ["moderation"],
  coworking: ["coworking"],
  events: ["events"],
  accountDeletion: ["account_deletion", "accountDeletion"],
  blockedMembers: ["blocked_members", "blockedMembers"]
});

const REQUIRED_DEPENDENCIES = Object.freeze({
  postgres: ["postgres", "database"],
  redis: ["redis"],
  objectStorage: ["object_storage", "objectStorage"],
  turn: ["turn"],
  push: ["push", "apns_fcm", "apnsFcm"]
});

const REQUIRED_CONTROLS = Object.freeze({
  authorizationMatrix: ["authorization_matrix", "authorizationMatrix"],
  idempotency: ["idempotency"],
  rateLimiting: ["rate_limiting", "rateLimiting"],
  migrations: ["migrations"],
  rollback: ["rollback"],
  backupRestore: ["backup_restore", "backupRestore"]
});

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function valueFor(record, aliases) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(record, alias)) return record[alias];
  }
  return undefined;
}

function isReady(value) {
  return value === true || value === "ready" || value === "ok";
}

function validateGroup(label, value, requirements, errors) {
  const record = asRecord(value);
  for (const [canonical, aliases] of Object.entries(requirements)) {
    if (!isReady(valueFor(record, aliases))) {
      errors.push(`${label}.${canonical} n’est pas prêt`);
    }
  }
}

function readinessRoot(payload) {
  const outer = asRecord(payload);
  return asRecord(outer.readiness ?? outer.data ?? outer);
}

function validateConnexioReadiness(
  payload,
  {
    expectedEnvironment = "production",
    now = Date.now(),
    maxAgeMs = 10 * 60_000
  } = {}
) {
  const root = readinessRoot(payload);
  const errors = [];
  const status = root.status;
  const contract = root.contract ?? root.backend_contract;
  const environment = root.environment ?? root.stage;
  const version = root.version ?? root.commit_sha ?? root.git_sha;
  const checkedAt = root.checked_at ?? root.checkedAt ?? root.generated_at ?? root.generatedAt;

  if (!isReady(status)) errors.push("status doit valoir ready");
  if (contract !== "connexio-v1") errors.push("contract doit valoir connexio-v1");
  if (expectedEnvironment && environment !== expectedEnvironment) {
    errors.push(`environment doit valoir ${expectedEnvironment}`);
  }
  if (typeof version !== "string" || version.trim().length < 7) {
    errors.push("version/commit_sha doit identifier le déploiement backend");
  }

  const checkedAtMs = typeof checkedAt === "string" ? Date.parse(checkedAt) : Number.NaN;
  if (!Number.isFinite(checkedAtMs)) {
    errors.push("checked_at doit être une date ISO valide");
  } else if (checkedAtMs > now + 60_000) {
    errors.push("checked_at est dans le futur");
  } else if (now - checkedAtMs > maxAgeMs) {
    errors.push("checked_at est trop ancien");
  }

  validateGroup("capabilities", root.capabilities, REQUIRED_CAPABILITIES, errors);
  validateGroup("dependencies", root.dependencies, REQUIRED_DEPENDENCIES, errors);
  validateGroup("controls", root.controls, REQUIRED_CONTROLS, errors);

  return {
    ok: errors.length === 0,
    errors,
    contract: typeof contract === "string" ? contract : null,
    environment: typeof environment === "string" ? environment : null,
    version: typeof version === "string" ? version : null,
    checkedAt: typeof checkedAt === "string" ? checkedAt : null
  };
}

module.exports = {
  REQUIRED_CAPABILITIES,
  REQUIRED_DEPENDENCIES,
  REQUIRED_CONTROLS,
  validateConnexioReadiness
};
