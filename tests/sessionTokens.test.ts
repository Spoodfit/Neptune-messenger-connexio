import assert from "node:assert/strict";
import test from "node:test";

import {
  ACCESS_TOKEN_REFRESH_SKEW_MS,
  calculateAccessTokenExpiry,
  shouldRefreshAccessToken
} from "../src/domain/sessionTokens";

test("calcule l'expiration à partir de expiresIn", () => {
  assert.equal(calculateAccessTokenExpiry(120, 1_000), 121_000);
  assert.equal(calculateAccessTokenExpiry(0, 1_000), 1_000);
  assert.equal(calculateAccessTokenExpiry(Number.NaN, 1_000), 1_000);
});

test("rafraîchit un token absent ou proche de l'expiration", () => {
  const now = 1_000_000;
  assert.equal(shouldRefreshAccessToken(null, null, now), true);
  assert.equal(
    shouldRefreshAccessToken("token", now + ACCESS_TOKEN_REFRESH_SKEW_MS - 1, now),
    true
  );
  assert.equal(
    shouldRefreshAccessToken("token", now + ACCESS_TOKEN_REFRESH_SKEW_MS + 1, now),
    false
  );
});

test("un skew négatif est neutralisé", () => {
  assert.equal(shouldRefreshAccessToken("token", 2_000, 1_999, -500), false);
  assert.equal(shouldRefreshAccessToken("token", 2_000, 2_000, -500), true);
});
