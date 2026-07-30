import assert from "node:assert/strict";
import test from "node:test";

import {
  configureSessionRuntime,
  refreshSessionAccessToken,
  resetSessionRuntimeForTests,
  resolveSessionAccessToken
} from "../src/services/auth/sessionRuntime";

test.afterEach(() => resetSessionRuntimeForTests());

test("utilise le token de secours sans runtime configuré", async () => {
  assert.equal(await resolveSessionAccessToken("fallback"), "fallback");
  assert.equal(await refreshSessionAccessToken(), null);
});

test("le runtime devient la source de vérité de la session", async () => {
  configureSessionRuntime({
    getAccessToken: async () => "runtime-token",
    refreshAccessToken: async () => "refreshed-token"
  });

  assert.equal(await resolveSessionAccessToken("fallback"), "runtime-token");
  assert.equal(await refreshSessionAccessToken(), "refreshed-token");
});

test("le nettoyage d'un ancien runtime ne supprime pas le runtime courant", async () => {
  const cleanupFirst = configureSessionRuntime({
    getAccessToken: async () => "first",
    refreshAccessToken: async () => "first-refreshed"
  });
  configureSessionRuntime({
    getAccessToken: async () => "second",
    refreshAccessToken: async () => "second-refreshed"
  });

  cleanupFirst();
  assert.equal(await resolveSessionAccessToken(), "second");
});
