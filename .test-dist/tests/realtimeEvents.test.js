"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const realtimeEvents_1 = require("../src/services/realtime/realtimeEvents");
(0, node_test_1.default)("normalise un message WebSocket minimal conforme au contrat", () => {
    const event = (0, realtimeEvents_1.normalizeRealtimeEvent)({
        type: "message.created",
        payload: {
            id: "message-1",
            conversationId: "carcassonne",
            senderId: "user-1",
            body: "Bonjour",
            createdAt: "2026-07-30T10:00:00.000Z"
        }
    });
    if (!event || event.type !== "message.created") {
        throw new Error("Événement message attendu");
    }
    strict_1.default.equal(event.payload.status, "sent");
    strict_1.default.equal(event.payload.senderName, "Membre Neptune");
});
(0, node_test_1.default)("accepte les identifiants snake_case des événements de contrôle", () => {
    strict_1.default.deepEqual((0, realtimeEvents_1.normalizeRealtimeEvent)({
        type: "message.deleted",
        payload: { conversation_id: "club", message_id: "message-1" }
    }), {
        type: "message.deleted",
        payload: { conversationId: "club", messageId: "message-1" }
    });
});
(0, node_test_1.default)("ignore un type inconnu ou un payload incomplet", () => {
    strict_1.default.equal((0, realtimeEvents_1.normalizeRealtimeEvent)({ type: "unknown", payload: {} }), null);
    strict_1.default.equal((0, realtimeEvents_1.normalizeRealtimeEvent)({
        type: "presence.changed",
        payload: { userId: "u" }
    }), null);
    strict_1.default.equal((0, realtimeEvents_1.normalizeRealtimeEvent)("not-an-event"), null);
});
