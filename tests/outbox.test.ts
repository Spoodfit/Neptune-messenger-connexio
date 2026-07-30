import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateBackoffMs,
  dedupeOutbox,
  isOutboxItemDue,
  type OutboxItem
} from "../src/domain/outbox";

const item = (overrides: Partial<OutboxItem> = {}): OutboxItem => ({
  clientMessageId: "client-1",
  conversationId: "conversation-1",
  body: "Message",
  createdAt: "2026-07-30T10:00:00.000Z",
  attempts: 0,
  nextAttemptAt: 100,
  state: "pending",
  ...overrides
});

test("le backoff est exponentiel, borné et inclut un jitter contrôlé", () => {
  assert.equal(calculateBackoffMs(0, 0), 1_000);
  assert.equal(calculateBackoffMs(2, 0), 4_000);
  assert.equal(calculateBackoffMs(10, 0), 30_000);
  assert.equal(calculateBackoffMs(1, 0.5), 2_200);
});

test("la file déduplique un clientMessageId", () => {
  const result = dedupeOutbox([
    item(),
    item({ attempts: 2, lastError: "network" })
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.attempts, 2);
});

test("un message en cours n'est jamais renvoyé simultanément", () => {
  assert.equal(isOutboxItemDue(item({ state: "sending" }), 1_000), false);
  assert.equal(isOutboxItemDue(item(), 1_000), true);
});
