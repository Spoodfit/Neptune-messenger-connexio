"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.latestPersistedMessageId = latestPersistedMessageId;
exports.mergeMessagesNewestFirst = mergeMessagesNewestFirst;
const messageLifecycle_1 = require("./messageLifecycle");
const PERSISTED_STATUSES = new Set([
    "sent",
    "delivered",
    "read"
]);
function latestPersistedMessageId(messages) {
    return (messages.find((message) => PERSISTED_STATUSES.has(message.status))?.id ?? null);
}
function mergeMessagesNewestFirst(current, incoming) {
    const merged = [...current];
    const indexById = new Map();
    const indexByClientId = new Map();
    merged.forEach((message, index) => {
        indexById.set(message.id, index);
        if (message.clientMessageId) {
            indexByClientId.set(message.clientMessageId, index);
        }
    });
    for (const message of incoming) {
        const index = indexById.get(message.id) ??
            (message.clientMessageId
                ? indexByClientId.get(message.clientMessageId)
                : undefined);
        if (index === undefined) {
            const nextIndex = merged.length;
            merged.push(message);
            indexById.set(message.id, nextIndex);
            if (message.clientMessageId) {
                indexByClientId.set(message.clientMessageId, nextIndex);
            }
            continue;
        }
        const existing = merged[index];
        if (!existing)
            continue;
        const reconciled = (0, messageLifecycle_1.reconcileServerMessage)(existing, message);
        merged[index] = reconciled;
        indexById.set(reconciled.id, index);
        if (reconciled.clientMessageId) {
            indexByClientId.set(reconciled.clientMessageId, index);
        }
    }
    return merged.sort((a, b) => {
        const byDate = Date.parse(b.createdAt) - Date.parse(a.createdAt);
        if (Number.isFinite(byDate) && byDate !== 0)
            return byDate;
        return b.id.localeCompare(a.id);
    });
}
