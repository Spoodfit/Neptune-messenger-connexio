"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const sessionErrors_1 = require("../src/domain/sessionErrors");
(0, node_test_1.default)("supprime la session uniquement quand le refresh token est invalide", () => {
    strict_1.default.equal((0, sessionErrors_1.shouldClearSessionAfterRefreshFailure)(400), true);
    strict_1.default.equal((0, sessionErrors_1.shouldClearSessionAfterRefreshFailure)(401), true);
    strict_1.default.equal((0, sessionErrors_1.shouldClearSessionAfterRefreshFailure)(403), true);
});
(0, node_test_1.default)("conserve la session locale lors d'une panne temporaire", () => {
    strict_1.default.equal((0, sessionErrors_1.shouldClearSessionAfterRefreshFailure)(0), false);
    strict_1.default.equal((0, sessionErrors_1.shouldClearSessionAfterRefreshFailure)(408), false);
    strict_1.default.equal((0, sessionErrors_1.shouldClearSessionAfterRefreshFailure)(429), false);
    strict_1.default.equal((0, sessionErrors_1.shouldClearSessionAfterRefreshFailure)(500), false);
    strict_1.default.equal((0, sessionErrors_1.shouldClearSessionAfterRefreshFailure)(503), false);
});
