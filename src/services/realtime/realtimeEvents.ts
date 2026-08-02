import type { ChatMessage } from "../../types/messaging";
import { normalizeChatMessage, WireValidationError } from "../api/wire";

export type RealtimeEvent =
  | { type: "message.created"; payload: ChatMessage }
  | { type: "message.updated"; payload: ChatMessage }
  | {
      type: "message.deleted";
      payload: { conversationId: string; messageId: string };
    }
  | {
      type: "conversation.read";
      payload: {
        conversationId: string;
        userId: string;
        lastReadMessageId: string;
      };
    }
  | {
      type: "presence.changed";
      payload: { userId: string; online: boolean };
    }
  | {
      type: "conversation.membership.changed";
      payload: { conversationId: string; active: boolean };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readUnknown(
  record: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

function requireString(
  record: Record<string, unknown>,
  ...keys: string[]
): string {
  const value = readUnknown(record, ...keys);
  if (typeof value !== "string" || !value.trim()) {
    throw new WireValidationError("Événement temps réel incomplet.");
  }
  return value.trim();
}

function requireBoolean(
  record: Record<string, unknown>,
  ...keys: string[]
): boolean {
  const value = readUnknown(record, ...keys);
  if (typeof value !== "boolean") {
    throw new WireValidationError("Événement temps réel incomplet.");
  }
  return value;
}

export function normalizeRealtimeEvent(value: unknown): RealtimeEvent | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;
  const payload = value.payload;
  if (!isRecord(payload)) return null;

  try {
    switch (value.type) {
      case "message.created":
      case "message.updated":
        return { type: value.type, payload: normalizeChatMessage(payload) };
      case "message.deleted":
        return {
          type: value.type,
          payload: {
            conversationId: requireString(
              payload,
              "conversationId",
              "conversation_id"
            ),
            messageId: requireString(payload, "messageId", "message_id")
          }
        };
      case "conversation.read":
        return {
          type: value.type,
          payload: {
            conversationId: requireString(
              payload,
              "conversationId",
              "conversation_id"
            ),
            userId: requireString(payload, "userId", "user_id"),
            lastReadMessageId: requireString(
              payload,
              "lastReadMessageId",
              "last_read_message_id"
            )
          }
        };
      case "presence.changed":
        return {
          type: value.type,
          payload: {
            userId: requireString(payload, "userId", "user_id"),
            online: requireBoolean(payload, "online", "is_online")
          }
        };
      case "conversation.membership.changed":
        return {
          type: value.type,
          payload: {
            conversationId: requireString(
              payload,
              "conversationId",
              "conversation_id"
            ),
            active: requireBoolean(payload, "active")
          }
        };
      default:
        return null;
    }
  } catch (error) {
    if (error instanceof WireValidationError) return null;
    throw error;
  }
}
