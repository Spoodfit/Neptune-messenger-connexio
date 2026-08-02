"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const sessionTokens_1 = require("../src/domain/sessionTokens");
(0, node_test_1.default)("calcule l'expiration à partir de expiresIn", () => {
    strict_1.default.equal((0, sessionTokens_1.calculateAccessTokenExpiry)(120, 1_000), 121_000);
    strict_1.default.equal((0, sessionTokens_1.calculateAccessTokenExpiry)(0, 1_000), 1_000);
    strict_1.default.equal((0, sessionTokens_1.calculateAccessTokenExpiry)(Number.NaN, 1_000), 1_000);
});
(0, node_test_1.default)("rafraîchit un token absent ou proche de l'expiration", () => {
    const now = 1_000_000;
    strict_1.default.equal((0, sessionTokens_1.shouldRefreshAccessToken)(null, null, now), true);
    strict_1.default.equal((0, sessionTokens_1.shouldRefreshAccessToken)("token", now + sessionTokens_1.ACCESS_TOKEN_REFRESH_SKEW_MS - 1, now), true);
    strict_1.default.equal((0, sessionTokens_1.shouldRefreshAccessToken)("token", now + sessionTokens_1.ACCESS_TOKEN_REFRESH_SKEW_MS + 1, now), false);
});
(0, node_test_1.default)("un skew négatif est neutralisé", () => {
    strict_1.default.equal((0, sessionTokens_1.shouldRefreshAccessToken)("token", 2_000, 1_999, -500), false);
    strict_1.default.equal((0, sessionTokens_1.shouldRefreshAccessToken)("token", 2_000, 2_000, -500), true);
});
