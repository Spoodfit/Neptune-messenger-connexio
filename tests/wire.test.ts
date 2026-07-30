import { strictEqual, throws } from "node:assert";
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

  strictEqual(session.accessToken, "access");
  strictEqual(session.refreshToken, "refresh");
  strictEqual(session.user.initials, "LN");
  strictEqual(session.user.role, "member");
  strictEqual(session.user.roleLabel, "Triton");
});

test("refuse une session sans jetons ou durée valide", () => {
  throws(
    () => normalizeSessionPayload({ expires_in: 900, user: {} }),
    WireValidationError
  );
  throws(
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

test("normalise conversations et compteurs snake_case en lecture seule par défaut", () => {
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

  strictEqual(conversations[0]?.memberCount, 68);
  strictEqual(conversations[0]?.unreadCount, 5);
  strictEqual(conversations[0]?.lastMessage, "Bonjour");
  strictEqual(conversations[0]?.canPost, false);
});

test("refuse un type de conversation absent ou inconnu", () => {
  throws(
    () =>
      normalizeConversationList([
        { id: "club", name: "Club sans type", can_post: true }
      ]),
    WireValidationError
  );
  throws(
    () =>
      normalizeConversationList([
        { id: "club", name: "Club inconnu", type: "forbidden", can_post: true }
      ]),
    WireValidationError
  );
});

test("normalise un message temps réel minimal", () => {
  const message = normalizeChatMessage({
    id: "message-1",
    conversationId: "club",
    senderId: "user-1",
    body: "Bonjour",
    createdAt: "2026-07-30T10:00:00.000Z"
  });

  strictEqual(message.senderName, "Membre Neptune");
  strictEqual(message.senderInitials, "MN");
  strictEqual(message.status, "sent");
  strictEqual(message.isMine, false);
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
  strictEqual(page.nextCursor, "cursor-2");
  strictEqual(page.items[0]?.conversationId, "club");

  throws(
    () => normalizeMessagePage({ items: [], next_cursor: 42 }),
    WireValidationError
  );
});
