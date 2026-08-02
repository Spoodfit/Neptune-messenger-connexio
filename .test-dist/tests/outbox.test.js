"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const outbox_1 = require("../src/domain/outbox");
const item = (overrides = {}) => ({
    clientMessageId: "client-1",
    conversationId: "conversation-1",
    body: "Message",
    createdAt: "2026-07-30T10:00:00.000Z",
    attempts: 0,
    nextAttemptAt: 100,
    state: "pending",
    ...overrides
});
(0, node_test_1.default)("le backoff est exponentiel, borné et inclut un jitter contrôlé", () => {
    strict_1.default.equal((0, outbox_1.calculateBackoffMs)(0, 0), 1_000);
    strict_1.default.equal((0, outbox_1.calculateBackoffMs)(2, 0), 4_000);
    strict_1.default.equal((0, outbox_1.calculateBackoffMs)(10, 0), 30_000);
    strict_1.default.equal((0, outbox_1.calculateBackoffMs)(1, 0.5), 2_200);
});
(0, node_test_1.default)("la file déduplique un clientMessageId", () => {
    const result = (0, outbox_1.dedupeOutbox)([
        item(),
        item({ attempts: 2, lastError: "network" })
    ]);
    strict_1.default.equal(result.length, 1);
    strict_1.default.equal(result[0]?.attempts, 2);
});
(0, node_test_1.default)("un message en cours n'est jamais renvoyé simultanément", () => {
    strict_1.default.equal((0, outbox_1.isOutboxItemDue)(item({ state: "sending" }), 1_000), false);
    strict_1.default.equal((0, outbox_1.isOutboxItemDue)(item(), 1_000), true);
});
