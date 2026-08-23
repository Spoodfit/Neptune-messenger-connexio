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

  if (!event || event.type !== "message.created") {
    throw new Error("Événement message attendu");
  }
  assert.equal(event.payload.status, "sent");
  assert.equal(event.payload.senderName, "Membre Neptune");
});

test("conserve original et traduction dans un message temps réel", () => {
  const event = normalizeRealtimeEvent({
    type: "message.created",
    payload: {
      id: "message-translated",
      conversation_id: "carcassonne",
      sender_id: "user-2",
      body: "See you tomorrow",
      source_language: "en",
      created_at: "2026-08-13T12:00:00.000Z",
      translation: {
        source_language: "en",
        target_language: "fr",
        body: "À demain",
        status: "ready"
      }
    }
  });

  if (!event || event.type !== "message.created") {
    throw new Error("Événement message traduit attendu");
  }
  assert.equal(event.payload.body, "See you tomorrow");
  assert.equal(event.payload.sourceLanguage, "en");
  assert.equal(event.payload.translation?.targetLanguage, "fr");
  assert.equal(event.payload.translation?.body, "À demain");
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

test("normalise Bonjour et Toquer du Coworking en snake_case", () => {
  assert.deepEqual(
    normalizeRealtimeEvent({
      type: "coworking.hello",
      payload: { from_user_id: "member-2" }
    }),
    {
      type: "coworking.hello",
      payload: { fromUserId: "member-2" }
    }
  );

  assert.deepEqual(
    normalizeRealtimeEvent({
      type: "coworking.knock",
      payload: {
        request_id: "knock-1",
        from_user_id: "member-3",
        space_id: "visio-business"
      }
    }),
    {
      type: "coworking.knock",
      payload: {
        requestId: "knock-1",
        fromUserId: "member-3",
        spaceId: "visio-business"
      }
    }
  );
});

test("normalise la résolution d’un toquement et refuse un statut inconnu", () => {
  assert.deepEqual(
    normalizeRealtimeEvent({
      type: "coworking.knock.resolved",
      payload: {
        id: "knock-2",
        status: "accepted",
        space_id: "visio-business"
      }
    }),
    {
      type: "coworking.knock.resolved",
      payload: {
        requestId: "knock-2",
        status: "accepted",
        spaceId: "visio-business"
      }
    }
  );
  assert.equal(
    normalizeRealtimeEvent({
      type: "coworking.knock.resolved",
      payload: { request_id: "knock-3", status: "waiting" }
    }),
    null
  );
});

test("ignore un type inconnu ou un payload incomplet", () => {
  assert.equal(
    normalizeRealtimeEvent({ type: "unknown", payload: {} }),
    null
  );
  assert.equal(
    normalizeRealtimeEvent({
      type: "presence.changed",
      payload: { userId: "u" }
    }),
    null
  );
  assert.equal(
    normalizeRealtimeEvent({
      type: "coworking.knock",
      payload: { request_id: "missing-participants" }
    }),
    null
  );
  assert.equal(normalizeRealtimeEvent("not-an-event"), null);
});
