import { reconcileServerMessage } from "./messageLifecycle";
import type { ChatMessage } from "../types/messaging";

function sameMessage(a: ChatMessage, b: ChatMessage): boolean {
  return (
    a.id === b.id ||
    Boolean(
      a.clientMessageId &&
        b.clientMessageId &&
        a.clientMessageId === b.clientMessageId
    )
  );
}

export function mergeMessagesNewestFirst(
  current: readonly ChatMessage[],
  incoming: readonly ChatMessage[]
): ChatMessage[] {
  const merged = [...current];

  for (const message of incoming) {
    const index = merged.findIndex((candidate) => sameMessage(candidate, message));
    if (index < 0) {
      merged.push(message);
      continue;
    }
    const existing = merged[index];
    if (!existing) continue;
    merged[index] = reconcileServerMessage(existing, message);
  }

  return merged.sort((a, b) => {
    const byDate = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (Number.isFinite(byDate) && byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });
}
