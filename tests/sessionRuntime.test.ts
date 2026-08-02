import { strictEqual } from "node:assert";
import { afterEach, test } from "node:test";

import {
  configureSessionRuntime,
  refreshSessionAccessToken,
  resetSessionRuntimeForTests,
  resolveSessionAccessToken
} from "../src/services/auth/sessionRuntime";

afterEach(() => resetSessionRuntimeForTests());

test("utilise le token de secours sans runtime configuré", async () => {
  strictEqual(await resolveSessionAccessToken("fallback"), "fallback");
  strictEqual(await refreshSessionAccessToken(), null);
});

test("le runtime devient la source de vérité de la session", async () => {
  configureSessionRuntime({
    getAccessToken: async () => "runtime-token",
    refreshAccessToken: async () => "refreshed-token"
  });

  strictEqual(await resolveSessionAccessToken("fallback"), "runtime-token");
  strictEqual(await refreshSessionAccessToken(), "refreshed-token");
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
  strictEqual(await resolveSessionAccessToken(), "second");
});
