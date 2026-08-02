"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = __importDefault(require("node:test"));
const httpProtocol_1 = require("../src/domain/httpProtocol");
(0, node_test_1.default)("reconnaît JSON standard, problem+json et types vendor", () => {
    (0, node_assert_1.strictEqual)((0, httpProtocol_1.isJsonMediaType)("application/json"), true);
    (0, node_assert_1.strictEqual)((0, httpProtocol_1.isJsonMediaType)("application/problem+json; charset=utf-8"), true);
    (0, node_assert_1.strictEqual)((0, httpProtocol_1.isJsonMediaType)("application/vnd.neptune+json"), true);
    (0, node_assert_1.strictEqual)((0, httpProtocol_1.isJsonMediaType)("text/plain"), false);
});
(0, node_test_1.default)("interprète Retry-After en secondes ou en date", () => {
    (0, node_assert_1.strictEqual)((0, httpProtocol_1.parseRetryAfterMs)("2"), 2_000);
    (0, node_assert_1.strictEqual)((0, httpProtocol_1.parseRetryAfterMs)("Wed, 30 Jul 2026 18:00:02 GMT", Date.parse("2026-07-30T18:00:00Z")), 2_000);
    (0, node_assert_1.strictEqual)((0, httpProtocol_1.parseRetryAfterMs)("invalide"), undefined);
});
(0, node_test_1.default)("distingue annulation explicite et timeout", () => {
    (0, node_assert_1.deepStrictEqual)((0, httpProtocol_1.classifyAbort)(false, true), {
        message: "Requête annulée.",
        status: 499,
        code: "client-aborted"
    });
    (0, node_assert_1.deepStrictEqual)((0, httpProtocol_1.classifyAbort)(true, true), {
        message: "Requête expirée.",
        status: 408,
        code: "timeout"
    });
    (0, node_assert_1.deepStrictEqual)((0, httpProtocol_1.classifyAbort)(true, false), {
        message: "Requête expirée.",
        status: 408,
        code: "timeout"
    });
});
