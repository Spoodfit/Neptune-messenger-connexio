import assert from "node:assert/strict";
import test from "node:test";

import {
  createMemoryOutboxStore,
  purgeOutboxData
} from "../src/storage/outboxStore.memory";
import type { OutboxItem } from "../src/domain/outbox";

const item = (clientMessageId: string): OutboxItem => ({
  clientMessageId,
  conversationId: "conversation-1",
  body: "Message confidentiel",
  createdAt: "2026-07-30T10:00:00.000Z",
  attempts: 0,
  nextAttemptAt: 0,
  state: "pending"
});

test("clear supprime les éléments d'une instance", async () => {
  const store = createMemoryOutboxStore();
  await store.enqueue(item("client-1"));
  await store.clear();
  assert.deepEqual(await store.listDue(Date.now()), []);
});

test("la purge de compte efface toutes les instances actives", async () => {
  const first = createMemoryOutboxStore();
  const second = createMemoryOutboxStore();
  await first.enqueue(item("client-1"));
  await second.enqueue(item("client-2"));

  await purgeOutboxData();

  assert.equal(await first.get("client-1"), null);
  assert.equal(await second.get("client-2"), null);
});
