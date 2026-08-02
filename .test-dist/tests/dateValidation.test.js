"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = __importDefault(require("node:test"));
const wire_1 = require("../src/services/api/wire");
const date_1 = require("../src/utils/date");
const validMessage = {
    id: "message-1",
    conversation_id: "club",
    sender_id: "user-1",
    body: "Bonjour",
    created_at: "2026-07-30T10:00:00.000Z"
};
(0, node_test_1.default)("refuse les dates de messages invalides à la frontière réseau", () => {
    (0, node_assert_1.throws)(() => (0, wire_1.normalizeChatMessage)({ ...validMessage, created_at: "pas-une-date" }), wire_1.WireValidationError);
    (0, node_assert_1.throws)(() => (0, wire_1.normalizeChatMessage)({ ...validMessage, updated_at: "pas-une-date" }), wire_1.WireValidationError);
});
(0, node_test_1.default)("refuse une date de dernière activité invalide", () => {
    (0, node_assert_1.throws)(() => (0, wire_1.normalizeConversationList)([
        {
            id: "club",
            name: "Club Neptune",
            type: "city",
            last_message_at: "pas-une-date"
        }
    ]), wire_1.WireValidationError);
});
(0, node_test_1.default)("les formateurs UI restent défensifs", () => {
    (0, node_assert_1.strictEqual)((0, date_1.formatMessageTime)("pas-une-date"), "Heure inconnue");
    (0, node_assert_1.strictEqual)((0, date_1.formatConversationTime)("pas-une-date"), "");
    (0, node_assert_1.strictEqual)((0, date_1.formatConversationTime)(), "");
});
