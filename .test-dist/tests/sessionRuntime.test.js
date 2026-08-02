"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = require("node:test");
const sessionRuntime_1 = require("../src/services/auth/sessionRuntime");
(0, node_test_1.afterEach)(() => (0, sessionRuntime_1.resetSessionRuntimeForTests)());
(0, node_test_1.test)("utilise le token de secours sans runtime configuré", async () => {
    (0, node_assert_1.strictEqual)(await (0, sessionRuntime_1.resolveSessionAccessToken)("fallback"), "fallback");
    (0, node_assert_1.strictEqual)(await (0, sessionRuntime_1.refreshSessionAccessToken)(), null);
});
(0, node_test_1.test)("le runtime devient la source de vérité de la session", async () => {
    (0, sessionRuntime_1.configureSessionRuntime)({
        getAccessToken: async () => "runtime-token",
        refreshAccessToken: async () => "refreshed-token"
    });
    (0, node_assert_1.strictEqual)(await (0, sessionRuntime_1.resolveSessionAccessToken)("fallback"), "runtime-token");
    (0, node_assert_1.strictEqual)(await (0, sessionRuntime_1.refreshSessionAccessToken)(), "refreshed-token");
});
(0, node_test_1.test)("le nettoyage d'un ancien runtime ne supprime pas le runtime courant", async () => {
    const cleanupFirst = (0, sessionRuntime_1.configureSessionRuntime)({
        getAccessToken: async () => "first",
        refreshAccessToken: async () => "first-refreshed"
    });
    (0, sessionRuntime_1.configureSessionRuntime)({
        getAccessToken: async () => "second",
        refreshAccessToken: async () => "second-refreshed"
    });
    cleanupFirst();
    (0, node_assert_1.strictEqual)(await (0, sessionRuntime_1.resolveSessionAccessToken)(), "second");
});
