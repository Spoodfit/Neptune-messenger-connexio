import type { OutboxItem } from "../domain/outbox";

export interface OutboxStore {
  enqueue(item: OutboxItem): Promise<void>;
  listDue(now: number): Promise<OutboxItem[]>;
  get(clientMessageId: string): Promise<OutboxItem | null>;
  markSending(clientMessageId: string): Promise<void>;
  markFailure(
    clientMessageId: string,
    attempts: number,
    nextAttemptAt: number,
    error: string
  ): Promise<void>;
  requeue(clientMessageId: string): Promise<void>;
  remove(clientMessageId: string): Promise<void>;
}
