import assert from "node:assert/strict";
import test from "node:test";

import { shouldClearSessionAfterRefreshFailure } from "../src/domain/sessionErrors";

test("supprime la session uniquement quand le refresh token est invalide", () => {
  assert.equal(shouldClearSessionAfterRefreshFailure(400), true);
  assert.equal(shouldClearSessionAfterRefreshFailure(401), true);
  assert.equal(shouldClearSessionAfterRefreshFailure(403), true);
});

test("conserve la session locale lors d'une panne temporaire", () => {
  assert.equal(shouldClearSessionAfterRefreshFailure(0), false);
  assert.equal(shouldClearSessionAfterRefreshFailure(408), false);
  assert.equal(shouldClearSessionAfterRefreshFailure(429), false);
  assert.equal(shouldClearSessionAfterRefreshFailure(500), false);
  assert.equal(shouldClearSessionAfterRefreshFailure(503), false);
});
