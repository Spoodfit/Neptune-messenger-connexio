import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";

import type { OutboxItem, OutboxState } from "../domain/outbox";
import type { OutboxStore } from "./outboxStore.types";

const DATABASE_NAME = "connexio-outbox.db";
const DATABASE_KEY = "connexio.outbox.database-key";

interface OutboxRow {
  client_message_id: string;
  conversation_id: string;
  body: string;
  reply_to_message_id: string | null;
  created_at: string;
  attempts: number;
  next_attempt_at: number;
  state: OutboxState;
  last_error: string | null;
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let purgePromise: Promise<void> | null = null;

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getDatabaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DATABASE_KEY);
  if (existing) return existing;
  const generated = bytesToHex(Crypto.getRandomBytes(32));
  await SecureStore.setItemAsync(DATABASE_KEY, generated, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
  return generated;
}

async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (purgePromise) await purgePromise;
  if (!databasePromise) {
    databasePromise = (async () => {
      const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
      const key = await getDatabaseKey();
      await database.execAsync(`PRAGMA key = "x'${key}'";`);
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS message_outbox (
          client_message_id TEXT PRIMARY KEY NOT NULL,
          conversation_id TEXT NOT NULL,
          body TEXT NOT NULL,
          reply_to_message_id TEXT,
          created_at TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          next_attempt_at INTEGER NOT NULL,
          state TEXT NOT NULL,
          last_error TEXT
        );
        UPDATE message_outbox SET state = 'pending' WHERE state = 'sending';
      `);
      return database;
    })();
  }
  return databasePromise;
}

function rowToItem(row: OutboxRow): OutboxItem {
  return {
    clientMessageId: row.client_message_id,
    conversationId: row.conversation_id,
    body: row.body,
    replyToMessageId: row.reply_to_message_id ?? undefined,
    createdAt: row.created_at,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    state: row.state,
    lastError: row.last_error ?? undefined
  };
}

export async function purgeOutboxData(): Promise<void> {
  if (purgePromise) return purgePromise;
  const operation = (async () => {
    const currentDatabase = databasePromise;
    databasePromise = null;
    if (currentDatabase) {
      const database = await currentDatabase;
      await database.closeAsync();
    }
    await SQLite.deleteDatabaseAsync(DATABASE_NAME);
    await SecureStore.deleteItemAsync(DATABASE_KEY);
  })().finally(() => {
    purgePromise = null;
  });
  purgePromise = operation;
  return operation;
}

export function createOutboxStore(): OutboxStore {
  return {
    async enqueue(item) {
      const database = await openDatabase();
      await database.runAsync(
        `INSERT OR REPLACE INTO message_outbox (
          client_message_id, conversation_id, body, reply_to_message_id,
          created_at, attempts, next_attempt_at, state, last_error
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.clientMessageId,
        item.conversationId,
        item.body,
        item.replyToMessageId ?? null,
        item.createdAt,
        item.attempts,
        item.nextAttemptAt,
        item.state,
        item.lastError ?? null
      );
    },
    async listDue(now) {
      const database = await openDatabase();
      const rows = await database.getAllAsync<OutboxRow>(
        `SELECT * FROM message_outbox
         WHERE state != 'sending' AND next_attempt_at <= ?
         ORDER BY created_at ASC`,
        now
      );
      return rows.map(rowToItem);
    },
    async get(clientMessageId) {
      const database = await openDatabase();
      const row = await database.getFirstAsync<OutboxRow>(
        "SELECT * FROM message_outbox WHERE client_message_id = ?",
        clientMessageId
      );
      return row ? rowToItem(row) : null;
    },
    async markSending(clientMessageId) {
      const database = await openDatabase();
      await database.runAsync(
        "UPDATE message_outbox SET state = 'sending' WHERE client_message_id = ?",
        clientMessageId
      );
    },
    async markFailure(clientMessageId, attempts, nextAttemptAt, error) {
      const database = await openDatabase();
      await database.runAsync(
        `UPDATE message_outbox
         SET state = 'failed', attempts = ?, next_attempt_at = ?, last_error = ?
         WHERE client_message_id = ?`,
        attempts,
        nextAttemptAt,
        error,
        clientMessageId
      );
    },
    async requeue(clientMessageId) {
      const database = await openDatabase();
      await database.runAsync(
        `UPDATE message_outbox
         SET state = 'pending', attempts = 0, next_attempt_at = ?, last_error = NULL
         WHERE client_message_id = ?`,
        Date.now(),
        clientMessageId
      );
    },
    async remove(clientMessageId) {
      const database = await openDatabase();
      await database.runAsync(
        "DELETE FROM message_outbox WHERE client_message_id = ?",
        clientMessageId
      );
    },
    async clear() {
      await purgeOutboxData();
    }
  };
}

export type { OutboxStore } from "./outboxStore.types";
