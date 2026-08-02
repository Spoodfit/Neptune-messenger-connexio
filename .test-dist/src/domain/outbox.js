"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBackoffMs = calculateBackoffMs;
exports.dedupeOutbox = dedupeOutbox;
exports.isOutboxItemDue = isOutboxItemDue;
function calculateBackoffMs(attempt, randomValue = 0.5) {
    const safeAttempt = Math.max(0, Math.floor(attempt));
    const exponential = Math.min(30_000, 1_000 * 2 ** safeAttempt);
    const jitter = Math.floor(exponential * 0.2 * Math.max(0, Math.min(1, randomValue)));
    return exponential + jitter;
}
function dedupeOutbox(items) {
    const byId = new Map();
    for (const item of items) {
        const previous = byId.get(item.clientMessageId);
        if (!previous || item.attempts >= previous.attempts) {
            byId.set(item.clientMessageId, item);
        }
    }
    return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
function isOutboxItemDue(item, now) {
    return item.state !== "sending" && item.nextAttemptAt <= now;
}
