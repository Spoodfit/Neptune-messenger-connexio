"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const node_test_1 = __importDefault(require("node:test"));
const wire_1 = require("../src/services/api/wire");
(0, node_test_1.default)("le libellé affiché est toujours dérivé du rôle canonique", () => {
    const session = (0, wire_1.normalizeSessionPayload)({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 900.9,
        user: {
            id: "user-1",
            name: "Membre Neptune",
            role: "member",
            role_label: "Visionnaire"
        }
    });
    (0, node_assert_1.strictEqual)(session.expiresIn, 900);
    (0, node_assert_1.strictEqual)(session.user.role, "member");
    (0, node_assert_1.strictEqual)(session.user.roleLabel, "Triton");
});
(0, node_test_1.default)("les avatars distants doivent utiliser HTTPS", () => {
    (0, node_assert_1.strictEqual)((0, wire_1.normalizeAppUser)({
        id: "user-1",
        name: "Membre",
        role: "triton",
        avatar_url: "https://cdn.example.invalid/avatar.png"
    }).avatarUrl, "https://cdn.example.invalid/avatar.png");
    (0, node_assert_1.strictEqual)((0, wire_1.normalizeAppUser)({
        id: "user-1",
        name: "Membre",
        role: "triton",
        avatar_url: "file:///private/avatar.png"
    }).avatarUrl, undefined);
    (0, node_assert_1.strictEqual)((0, wire_1.normalizeAppUser)({
        id: "user-1",
        name: "Membre",
        role: "triton",
        avatar_url: "http://cdn.example.invalid/avatar.png"
    }).avatarUrl, undefined);
});
(0, node_test_1.default)("les compteurs sont entiers, positifs et la publication reste refusée par défaut", () => {
    const conversation = (0, wire_1.normalizeConversationList)([
        {
            id: "club",
            name: "Club Neptune",
            type: "city",
            member_count: 68.9,
            unread_count: -5
        }
    ])[0];
    (0, node_assert_1.strictEqual)(conversation?.memberCount, 68);
    (0, node_assert_1.strictEqual)(conversation?.unreadCount, 0);
    (0, node_assert_1.strictEqual)(conversation?.canPost, false);
});
(0, node_test_1.default)("refuse les messages et curseurs surdimensionnés", () => {
    (0, node_assert_1.throws)(() => (0, wire_1.normalizeChatMessage)({
        id: "message-1",
        conversation_id: "club",
        sender_id: "user-1",
        body: "x".repeat(4_001),
        created_at: "2026-07-30T10:00:00.000Z"
    }), wire_1.WireValidationError);
    (0, node_assert_1.throws)(() => (0, wire_1.normalizeMessagePage)({ items: [], next_cursor: "x".repeat(2_049) }), wire_1.WireValidationError);
});
