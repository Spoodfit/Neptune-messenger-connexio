"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRealtimeEvent = normalizeRealtimeEvent;
const wire_1 = require("../api/wire");
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function readUnknown(record, ...keys) {
    for (const key of keys) {
        if (key in record)
            return record[key];
    }
    return undefined;
}
function requireString(record, ...keys) {
    const value = readUnknown(record, ...keys);
    if (typeof value !== "string" || !value.trim()) {
        throw new wire_1.WireValidationError("Événement temps réel incomplet.");
    }
    return value.trim();
}
function requireBoolean(record, ...keys) {
    const value = readUnknown(record, ...keys);
    if (typeof value !== "boolean") {
        throw new wire_1.WireValidationError("Événement temps réel incomplet.");
    }
    return value;
}
function normalizeRealtimeEvent(value) {
    if (!isRecord(value) || typeof value.type !== "string")
        return null;
    const payload = value.payload;
    if (!isRecord(payload))
        return null;
    try {
        switch (value.type) {
            case "message.created":
            case "message.updated":
                return { type: value.type, payload: (0, wire_1.normalizeChatMessage)(payload) };
            case "message.deleted":
                return {
                    type: value.type,
                    payload: {
                        conversationId: requireString(payload, "conversationId", "conversation_id"),
                        messageId: requireString(payload, "messageId", "message_id")
                    }
                };
            case "conversation.read":
                return {
                    type: value.type,
                    payload: {
                        conversationId: requireString(payload, "conversationId", "conversation_id"),
                        userId: requireString(payload, "userId", "user_id"),
                        lastReadMessageId: requireString(payload, "lastReadMessageId", "last_read_message_id")
                    }
                };
            case "presence.changed":
                return {
                    type: value.type,
                    payload: {
                        userId: requireString(payload, "userId", "user_id"),
                        online: requireBoolean(payload, "online", "is_online")
                    }
                };
            case "conversation.membership.changed":
                return {
                    type: value.type,
                    payload: {
                        conversationId: requireString(payload, "conversationId", "conversation_id"),
                        active: requireBoolean(payload, "active")
                    }
                };
            default:
                return null;
        }
    }
    catch (error) {
        if (error instanceof wire_1.WireValidationError)
            return null;
        throw error;
    }
}
