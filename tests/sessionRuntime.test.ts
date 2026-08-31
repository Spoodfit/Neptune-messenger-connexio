import { strictEqual } from "node:assert";
import { afterEach, test } from "node:test";

import {
  configureSessionRuntime,
  refreshSessionAccessToken,
  refreshSessionCookie,
  resetSessionRuntimeForTests,
  resolveSessionAccessToken
} from "../src/services/auth/sessionRuntime";

afterEach(() => resetSessionRuntimeForTests());

test("utilise le token de secours sans runtime configuré", async () => {
  strictEqual(await resolveSessionAccessToken("fallback"), "fallback");
  strictEqual(await refreshSessionAccessToken(), null);
  strictEqual(await refreshSessionCookie(), false);
});

test("le runtime devient la source de vérité de la session", async () => {
  configureSessionRuntime({
    getAccessToken: async () => "runtime-token",
    refreshAccessToken: async () => "refreshed-token",
    refreshCookieSession: async () => true
  });

  strictEqual(await resolveSessionAccessToken("fallback"), "runtime-token");
  strictEqual(await refreshSessionAccessToken(), "refreshed-token");
  strictEqual(await refreshSessionCookie(), true);
});

test("le nettoyage d'un ancien runtime ne supprime pas le runtime courant", async () => {
  const cleanupFirst = configureSessionRuntime({
    getAccessToken: async () => "first",
    refreshAccessToken: async () => "first-refreshed",
    refreshCookieSession: async () => false
  });
  configureSessionRuntime({
    getAccessToken: async () => "second",
    refreshAccessToken: async () => "second-refreshed",
    refreshCookieSession: async () => true
  });

  cleanupFirst();
  strictEqual(await resolveSessionAccessToken(), "second");
});
