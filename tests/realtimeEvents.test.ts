import assert from "node:assert/strict";
import test from "node:test";

import { normalizeRealtimeEvent } from "../src/services/realtime/realtimeEvents";

test("normalise un message WebSocket minimal conforme au contrat", () => {
  const event = normalizeRealtimeEvent({
    type: "message.created",
    payload: {
      id: "message-1",
      conversationId: "carcassonne",
      senderId: "user-1",
      body: "Bonjour",
      createdAt: "2026-07-30T10:00:00.000Z"
    }
  });

  assert.equal(event?.type, "message.created");
  if (event?.type !== "message.created") assert.fail("Événement message attendu");
  assert.equal(event.payload.status, "sent");
  assert.equal(event.payload.senderName, "Membre Neptune");
});

test("accepte les identifiants snake_case des événements de contrôle", () => {
  assert.deepEqual(
    normalizeRealtimeEvent({
      type: "message.deleted",
      payload: { conversation_id: "club", message_id: "message-1" }
    }),
    {
      type: "message.deleted",
      payload: { conversationId: "club", messageId: "message-1" }
    }
  );
});

test("ignore un type inconnu ou un payload incomplet", () => {
  assert.equal(
    normalizeRealtimeEvent({ type: "unknown", payload: {} }),
    null
  );
  assert.equal(
    normalizeRealtimeEvent({ type: "presence.changed", payload: { userId: "u" } }),
    null
  );
  assert.equal(normalizeRealtimeEvent("not-an-event"), null);
});
