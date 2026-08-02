import { reconcileServerMessage } from "./messageLifecycle";
import type { ChatMessage } from "../types/messaging";

const PERSISTED_STATUSES = new Set<ChatMessage["status"]>([
  "sent",
  "delivered",
  "read"
]);

export function latestPersistedMessageId(
  messages: readonly ChatMessage[]
): string | null {
  return (
    messages.find((message) => PERSISTED_STATUSES.has(message.status))?.id ?? null
  );
}

export function mergeMessagesNewestFirst(
  current: readonly ChatMessage[],
  incoming: readonly ChatMessage[]
): ChatMessage[] {
  const merged = [...current];
  const indexById = new Map<string, number>();
  const indexByClientId = new Map<string, number>();

  merged.forEach((message, index) => {
    indexById.set(message.id, index);
    if (message.clientMessageId) {
      indexByClientId.set(message.clientMessageId, index);
    }
  });

  for (const message of incoming) {
    const index =
      indexById.get(message.id) ??
      (message.clientMessageId
        ? indexByClientId.get(message.clientMessageId)
        : undefined);

    if (index === undefined) {
      const nextIndex = merged.length;
      merged.push(message);
      indexById.set(message.id, nextIndex);
      if (message.clientMessageId) {
        indexByClientId.set(message.clientMessageId, nextIndex);
      }
      continue;
    }

    const existing = merged[index];
    if (!existing) continue;
    const reconciled = reconcileServerMessage(existing, message);
    merged[index] = reconciled;
    indexById.set(reconciled.id, index);
    if (reconciled.clientMessageId) {
      indexByClientId.set(reconciled.clientMessageId, index);
    }
  }

  return merged.sort((a, b) => {
    const byDate = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (Number.isFinite(byDate) && byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });
}
