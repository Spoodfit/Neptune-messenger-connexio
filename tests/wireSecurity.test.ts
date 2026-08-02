import { strictEqual, throws } from "node:assert";
import test from "node:test";

import {
  normalizeAppUser,
  normalizeChatMessage,
  normalizeConversationList,
  normalizeMessagePage,
  normalizeSessionPayload,
  WireValidationError
} from "../src/services/api/wire";

test("le libellé affiché est toujours dérivé du rôle canonique", () => {
  const session = normalizeSessionPayload({
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

  strictEqual(session.expiresIn, 900);
  strictEqual(session.user.role, "member");
  strictEqual(session.user.roleLabel, "Triton");
});

test("les avatars distants doivent utiliser HTTPS", () => {
  strictEqual(
    normalizeAppUser({
      id: "user-1",
      name: "Membre",
      role: "triton",
      avatar_url: "https://cdn.example.invalid/avatar.png"
    }).avatarUrl,
    "https://cdn.example.invalid/avatar.png"
  );
  strictEqual(
    normalizeAppUser({
      id: "user-1",
      name: "Membre",
      role: "triton",
      avatar_url: "file:///private/avatar.png"
    }).avatarUrl,
    undefined
  );
  strictEqual(
    normalizeAppUser({
      id: "user-1",
      name: "Membre",
      role: "triton",
      avatar_url: "http://cdn.example.invalid/avatar.png"
    }).avatarUrl,
    undefined
  );
});

test("les compteurs sont entiers, positifs et la publication reste refusée par défaut", () => {
  const conversation = normalizeConversationList([
    {
      id: "club",
      name: "Club Neptune",
      type: "city",
      member_count: 68.9,
      unread_count: -5
    }
  ])[0];

  strictEqual(conversation?.memberCount, 68);
  strictEqual(conversation?.unreadCount, 0);
  strictEqual(conversation?.canPost, false);
});

test("refuse les messages et curseurs surdimensionnés", () => {
  throws(
    () =>
      normalizeChatMessage({
        id: "message-1",
        conversation_id: "club",
        sender_id: "user-1",
        body: "x".repeat(4_001),
        created_at: "2026-07-30T10:00:00.000Z"
      }),
    WireValidationError
  );
  throws(
    () => normalizeMessagePage({ items: [], next_cursor: "x".repeat(2_049) }),
    WireValidationError
  );
});
