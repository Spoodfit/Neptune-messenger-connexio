"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = __importDefault(require("node:test"));
const wire_1 = require("../src/services/api/wire");
(0, node_test_1.default)("normalise une session snake_case sans donner de privilèges par défaut", () => {
    const session = (0, wire_1.normalizeSessionPayload)({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 900,
        user: { id: "user-1", name: "Léa Neptune", role: "member" }
    });
    (0, node_assert_1.strictEqual)(session.accessToken, "access");
    (0, node_assert_1.strictEqual)(session.refreshToken, "refresh");
    (0, node_assert_1.strictEqual)(session.user.initials, "LN");
    (0, node_assert_1.strictEqual)(session.user.role, "member");
    (0, node_assert_1.strictEqual)(session.user.roleLabel, "Triton");
});
(0, node_test_1.default)("refuse une session sans jetons ou durée valide", () => {
    (0, node_assert_1.throws)(() => (0, wire_1.normalizeSessionPayload)({ expires_in: 900, user: {} }), wire_1.WireValidationError);
    (0, node_assert_1.throws)(() => (0, wire_1.normalizeSessionPayload)({
        access_token: "a",
        refresh_token: "r",
        expires_in: 0,
        user: { id: "u", name: "Membre", role: "member" }
    }), wire_1.WireValidationError);
});
(0, node_test_1.default)("normalise conversations et compteurs snake_case en lecture seule par défaut", () => {
    const conversations = (0, wire_1.normalizeConversationList)([
        {
            id: "carcassonne",
            name: "Club Carcassonne",
            type: "city",
            member_count: 68,
            unread_count: 5,
            last_message: "Bonjour",
            restricted: false
        }
    ]);
    (0, node_assert_1.strictEqual)(conversations[0]?.memberCount, 68);
    (0, node_assert_1.strictEqual)(conversations[0]?.unreadCount, 5);
    (0, node_assert_1.strictEqual)(conversations[0]?.lastMessage, "Bonjour");
    (0, node_assert_1.strictEqual)(conversations[0]?.canPost, false);
});
(0, node_test_1.default)("refuse un type de conversation absent ou inconnu", () => {
    (0, node_assert_1.throws)(() => (0, wire_1.normalizeConversationList)([
        { id: "club", name: "Club sans type", can_post: true }
    ]), wire_1.WireValidationError);
    (0, node_assert_1.throws)(() => (0, wire_1.normalizeConversationList)([
        { id: "club", name: "Club inconnu", type: "forbidden", can_post: true }
    ]), wire_1.WireValidationError);
});
(0, node_test_1.default)("normalise un message temps réel minimal", () => {
    const message = (0, wire_1.normalizeChatMessage)({
        id: "message-1",
        conversationId: "club",
        senderId: "user-1",
        body: "Bonjour",
        createdAt: "2026-07-30T10:00:00.000Z"
    });
    (0, node_assert_1.strictEqual)(message.senderName, "Membre Neptune");
    (0, node_assert_1.strictEqual)(message.senderInitials, "MN");
    (0, node_assert_1.strictEqual)(message.status, "sent");
    (0, node_assert_1.strictEqual)(message.isMine, false);
});
(0, node_test_1.default)("valide une page curseur et refuse un curseur non textuel", () => {
    const page = (0, wire_1.normalizeMessagePage)({
        items: [
            {
                id: "message-1",
                conversation_id: "club",
                sender_id: "user-1",
                body: "Bonjour",
                created_at: "2026-07-30T10:00:00.000Z"
            }
        ],
        next_cursor: "cursor-2"
    });
    (0, node_assert_1.strictEqual)(page.nextCursor, "cursor-2");
    (0, node_assert_1.strictEqual)(page.items[0]?.conversationId, "club");
    (0, node_assert_1.throws)(() => (0, wire_1.normalizeMessagePage)({ items: [], next_cursor: 42 }), wire_1.WireValidationError);
});
