"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMemoryOutboxStore = createMemoryOutboxStore;
exports.purgeOutboxData = purgeOutboxData;
const outbox_1 = require("../domain/outbox");
const memoryStores = new Set();
function createMemoryOutboxStore() {
    const items = new Map();
    memoryStores.add(items);
    return {
        async enqueue(item) {
            items.set(item.clientMessageId, { ...item });
        },
        async listDue(now) {
            return (0, outbox_1.dedupeOutbox)([...items.values()].filter((item) => item.state !== "sending" && item.nextAttemptAt <= now));
        },
        async get(clientMessageId) {
            const item = items.get(clientMessageId);
            return item ? { ...item } : null;
        },
        async markSending(clientMessageId) {
            const item = items.get(clientMessageId);
            if (item)
                items.set(clientMessageId, { ...item, state: "sending" });
        },
        async markFailure(clientMessageId, attempts, nextAttemptAt, error) {
            const item = items.get(clientMessageId);
            if (item) {
                items.set(clientMessageId, {
                    ...item,
                    attempts,
                    nextAttemptAt,
                    state: "failed",
                    lastError: error
                });
            }
        },
        async requeue(clientMessageId) {
            const item = items.get(clientMessageId);
            if (item) {
                items.set(clientMessageId, {
                    ...item,
                    state: "pending",
                    attempts: 0,
                    nextAttemptAt: Date.now(),
                    lastError: undefined
                });
            }
        },
        async remove(clientMessageId) {
            items.delete(clientMessageId);
        },
        async clear() {
            items.clear();
        }
    };
}
async function purgeOutboxData() {
    for (const items of memoryStores)
        items.clear();
}
