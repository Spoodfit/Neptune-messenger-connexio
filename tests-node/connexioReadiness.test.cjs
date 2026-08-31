const assert = require("node:assert/strict");
const test = require("node:test");

const {
  validateConnexioReadiness
} = require("../scripts/connexio-readiness.cjs");

function validPayload(now) {
  return {
    status: "ready",
    contract: "connexio-v1",
    environment: "production",
    version: "49cd15607aa9ecc77f588816b5e7969f7ba92260",
    checked_at: new Date(now).toISOString(),
    capabilities: {
      authentication: true,
      member_directory: true,
      messaging: true,
      private_media: true,
      realtime: true,
      calls: true,
      push_notifications: true,
      moderation: true,
      coworking: true,
      events: true,
      account_deletion: true,
      blocked_members: true
    },
    dependencies: {
      postgres: "ready",
      redis: "ready",
      object_storage: "ready",
      turn: "ready",
      push: "ready"
    },
    controls: {
      authorization_matrix: true,
      idempotency: true,
      rate_limiting: true,
      migrations: true,
      rollback: true,
      backup_restore: true
    }
  };
}

test("accepte uniquement une attestation connexio-v1 complète et récente", () => {
  const now = Date.parse("2026-08-24T20:00:00.000Z");
  const result = validateConnexioReadiness(validPayload(now), { now });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.contract, "connexio-v1");
});

test("refuse une capacité ou une dépendance critique manquante", () => {
  const now = Date.parse("2026-08-24T20:00:00.000Z");
  const payload = validPayload(now);
  payload.capabilities.messaging = false;
  payload.dependencies.turn = "blocked";
  const result = validateConnexioReadiness(payload, { now });

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("capabilities.messaging n’est pas prêt"));
  assert.ok(result.errors.includes("dependencies.turn n’est pas prêt"));
});

test("refuse une attestation ancienne ou destinée au staging", () => {
  const now = Date.parse("2026-08-24T20:00:00.000Z");
  const payload = validPayload(now - 11 * 60_000);
  payload.environment = "staging";
  const result = validateConnexioReadiness(payload, { now });

  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("environment doit valoir production"));
  assert.ok(result.errors.includes("checked_at est trop ancien"));
});
