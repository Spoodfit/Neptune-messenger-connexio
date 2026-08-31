import assert from "node:assert/strict";
import test from "node:test";

import {
  createOptimisticMessage,
  markMessageFailed,
  queueMessageForRetry,
  reconcileServerMessage
} from "../src/domain/messageLifecycle";

const local = createOptimisticMessage({
  clientMessageId: "client-1",
  conversationId: "carcassonne",
  senderId: "user-1",
  senderName: "Johan",
  senderInitials: "JZ",
  body: "Bonjour",
  createdAt: "2026-07-30T10:00:00.000Z"
});

test("un message optimiste commence en file d'attente", () => {
  assert.equal(local.status, "queued");
  assert.equal(local.id, "local-client-1");
});

test("la réponse serveur réconcilie sans perdre l'identifiant client", () => {
  const reconciled = reconcileServerMessage(local, {
    ...local,
    id: "server-1",
    clientMessageId: "client-1",
    status: "sent"
  });
  assert.equal(reconciled.id, "server-1");
  assert.equal(reconciled.clientMessageId, "client-1");
  assert.equal(reconciled.status, "sent");
});

test("un échec est explicite et peut être remis en attente", () => {
  const failed = markMessageFailed(local, "network");
  assert.equal(failed.status, "failed");
  assert.equal(failed.retryCount, 1);
  const retried = queueMessageForRetry(failed);
  assert.equal(retried.status, "queued");
  assert.equal(retried.errorCode, undefined);
});
