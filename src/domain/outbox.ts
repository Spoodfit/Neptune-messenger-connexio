export type OutboxState = "pending" | "sending" | "failed";

export interface OutboxItem {
  clientMessageId: string;
  conversationId: string;
  body: string;
  replyToMessageId?: string;
  createdAt: string;
  attempts: number;
  nextAttemptAt: number;
  state: OutboxState;
  lastError?: string;
}

export function calculateBackoffMs(
  attempt: number,
  randomValue = 0.5
): number {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const exponential = Math.min(30_000, 1_000 * 2 ** safeAttempt);
  const jitter = Math.floor(exponential * 0.2 * Math.max(0, Math.min(1, randomValue)));
  return exponential + jitter;
}

export function dedupeOutbox(items: readonly OutboxItem[]): OutboxItem[] {
  const byId = new Map<string, OutboxItem>();
  for (const item of items) {
    const previous = byId.get(item.clientMessageId);
    if (!previous || item.attempts >= previous.attempts) {
      byId.set(item.clientMessageId, item);
    }
  }
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export function isOutboxItemDue(item: OutboxItem, now: number): boolean {
  return item.state !== "sending" && item.nextAttemptAt <= now;
}
