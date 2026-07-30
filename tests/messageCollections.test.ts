import assert from "node:assert/strict";
import test from "node:test";

import { mergeMessagesNewestFirst } from "../src/domain/messageCollections";
import type { ChatMessage } from "../src/types/messaging";

const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "message-1",
  conversationId: "conversation-1",
  senderId: "user-1",
  senderName: "Membre Neptune",
  senderInitials: "MN",
  body: "Bonjour",
  createdAt: "2026-07-30T10:00:00.000Z",
  status: "sent",
  isMine: false,
  ...overrides
});

test("conserve un message optimiste absent de la page serveur", () => {
  const optimistic = message({
    id: "local-client-1",
    clientMessageId: "client-1",
    status: "sending",
    isMine: true,
    createdAt: "2026-07-30T10:02:00.000Z"
  });
  const result = mergeMessagesNewestFirst([optimistic], [message()]);
  assert.deepEqual(result.map((item) => item.id), ["local-client-1", "message-1"]);
});

test("réconcilie un accusé serveur par clientMessageId", () => {
  const optimistic = message({
    id: "local-client-1",
    clientMessageId: "client-1",
    status: "sending",
    isMine: true
  });
  const server = message({
    id: "server-1",
    clientMessageId: "client-1",
    status: "sent",
    isMine: false
  });
  const result = mergeMessagesNewestFirst([optimistic], [server]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "server-1");
  assert.equal(result[0]?.isMine, true);
  assert.equal(result[0]?.status, "sent");
});

test("déduplique les pages et trie du plus récent au plus ancien", () => {
  const result = mergeMessagesNewestFirst(
    [message({ id: "m2", createdAt: "2026-07-30T10:02:00.000Z" })],
    [
      message({ id: "m1", createdAt: "2026-07-30T10:01:00.000Z" }),
      message({ id: "m2", createdAt: "2026-07-30T10:02:00.000Z" })
    ]
  );
  assert.deepEqual(result.map((item) => item.id), ["m2", "m1"]);
});
