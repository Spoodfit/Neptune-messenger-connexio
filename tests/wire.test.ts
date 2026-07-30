import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeChatMessage,
  normalizeConversationList,
  normalizeMessagePage,
  normalizeSessionPayload,
  WireValidationError
} from "../src/services/api/wire";

test("normalise une session snake_case sans donner de privilèges par défaut", () => {
  const session = normalizeSessionPayload({
    access_token: "access",
    refresh_token: "refresh",
    expires_in: 900,
    user: { id: "user-1", name: "Léa Neptune", role: "member" }
  });

  assert.equal(session.accessToken, "access");
  assert.equal(session.refreshToken, "refresh");
  assert.equal(session.user.initials, "LN");
  assert.equal(session.user.role, "member");
  assert.equal(session.user.roleLabel, "Triton");
});

test("refuse une session sans jetons ou durée valide", () => {
  assert.throws(
    () => normalizeSessionPayload({ expires_in: 900, user: {} }),
    WireValidationError
  );
  assert.throws(
    () =>
      normalizeSessionPayload({
        access_token: "a",
        refresh_token: "r",
        expires_in: 0,
        user: { id: "u", name: "Membre", role: "member" }
      }),
    WireValidationError
  );
});

test("normalise conversations et compteurs snake_case", () => {
  const conversations = normalizeConversationList([
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

  assert.equal(conversations[0]?.memberCount, 68);
  assert.equal(conversations[0]?.unreadCount, 5);
  assert.equal(conversations[0]?.lastMessage, "Bonjour");
});

test("normalise un message temps réel minimal", () => {
  const message = normalizeChatMessage({
    id: "message-1",
    conversationId: "club",
    senderId: "user-1",
    body: "Bonjour",
    createdAt: "2026-07-30T10:00:00.000Z"
  });

  assert.equal(message.senderName, "Membre Neptune");
  assert.equal(message.senderInitials, "MN");
  assert.equal(message.status, "sent");
  assert.equal(message.isMine, false);
});

test("valide une page curseur et refuse un curseur non textuel", () => {
  const page = normalizeMessagePage({
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
  assert.equal(page.nextCursor, "cursor-2");
  assert.equal(page.items[0]?.conversationId, "club");

  assert.throws(
    () => normalizeMessagePage({ items: [], next_cursor: 42 }),
    WireValidationError
  );
});
