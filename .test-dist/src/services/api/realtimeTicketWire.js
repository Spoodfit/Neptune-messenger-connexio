"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRealtimeTicket = normalizeRealtimeTicket;
const wire_1 = require("./wire");
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function requiredString(record, label, ...keys) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
    }
    throw new wire_1.WireValidationError(`${label} manquant ou invalide.`);
}
function normalizeRealtimeTicket(value) {
    if (!isRecord(value)) {
        throw new wire_1.WireValidationError("Ticket temps réel invalide.");
    }
    const ticket = requiredString(value, "Ticket temps réel", "ticket");
    const expiresAt = requiredString(value, "Expiration du ticket temps réel", "expiresAt", "expires_at");
    const expiresAtMs = Date.parse(expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        throw new wire_1.WireValidationError("Expiration du ticket temps réel invalide.");
    }
    return { ticket, expiresAt };
}
