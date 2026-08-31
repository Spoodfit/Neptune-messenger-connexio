import { dedupeOutbox, type OutboxItem } from "../domain/outbox";
import type { OutboxStore } from "./outboxStore.types";

const memoryStores = new Set<Map<string, OutboxItem>>();

export function createMemoryOutboxStore(): OutboxStore {
  const items = new Map<string, OutboxItem>();
  memoryStores.add(items);

  return {
    async enqueue(item) {
      items.set(item.clientMessageId, { ...item });
    },
    async listDue(now) {
      return dedupeOutbox(
        [...items.values()].filter(
          (item) => item.state !== "sending" && item.nextAttemptAt <= now
        )
      );
    },
    async get(clientMessageId) {
      const item = items.get(clientMessageId);
      return item ? { ...item } : null;
    },
    async markSending(clientMessageId) {
      const item = items.get(clientMessageId);
      if (item) items.set(clientMessageId, { ...item, state: "sending" });
    },
    async markFailure(clientMessageId, attempts, nextAttemptAt, error) {
      const item = items.get(clientMessageId);
      if (item) {
        items.set(clientMessageId, {
          ...item,
          attempts,
          nextAttemptAt,
          state: "failed",
          lastError: error
        });
      }
    },
    async requeue(clientMessageId) {
      const item = items.get(clientMessageId);
      if (item) {
        items.set(clientMessageId, {
          ...item,
          state: "pending",
          attempts: 0,
          nextAttemptAt: Date.now(),
          lastError: undefined
        });
      }
    },
    async remove(clientMessageId) {
      items.delete(clientMessageId);
    },
    async clear() {
      items.clear();
    }
  };
}

export async function purgeOutboxData(): Promise<void> {
  for (const items of memoryStores) items.clear();
}
