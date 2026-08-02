"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const outboxStore_memory_1 = require("../src/storage/outboxStore.memory");
const item = (clientMessageId) => ({
    clientMessageId,
    conversationId: "conversation-1",
    body: "Message confidentiel",
    createdAt: "2026-07-30T10:00:00.000Z",
    attempts: 0,
    nextAttemptAt: 0,
    state: "pending"
});
(0, node_test_1.default)("clear supprime les éléments d'une instance", async () => {
    const store = (0, outboxStore_memory_1.createMemoryOutboxStore)();
    await store.enqueue(item("client-1"));
    await store.clear();
    strict_1.default.deepEqual(await store.listDue(Date.now()), []);
});
(0, node_test_1.default)("la purge de compte efface toutes les instances actives", async () => {
    const first = (0, outboxStore_memory_1.createMemoryOutboxStore)();
    const second = (0, outboxStore_memory_1.createMemoryOutboxStore)();
    await first.enqueue(item("client-1"));
    await second.enqueue(item("client-2"));
    await (0, outboxStore_memory_1.purgeOutboxData)();
    strict_1.default.equal(await first.get("client-1"), null);
    strict_1.default.equal(await second.get("client-2"), null);
});
