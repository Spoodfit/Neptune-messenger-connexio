import type { ChatMessage } from "../../types/messaging";
import { normalizeChatMessage } from "../api/wireExtensions";
import { WireValidationError } from "../api/wire";

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
    }
  | {
      type: "coworking.hello";
      payload: { fromUserId: string; spaceId?: string };
    }
  | {
      type: "coworking.knock";
      payload: { requestId: string; fromUserId: string; spaceId: string };
    }
  | {
      type: "coworking.knock.resolved";
      payload: {
        requestId: string;
        status: "accepted" | "declined";
        spaceId?: string;
      };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readUnknown(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

function requireString(record: Record<string, unknown>, ...keys: string[]): string {
  const value = readUnknown(record, ...keys);
  if (typeof value !== "string" || !value.trim()) {
    throw new WireValidationError("Événement temps réel incomplet.");
  }
  return value.trim();
}

function optionalString(record: Record<string, unknown>, ...keys: string[]): string | undefined {
  const value = readUnknown(record, ...keys);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requireBoolean(record: Record<string, unknown>, ...keys: string[]): boolean {
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
            conversationId: requireString(payload, "conversationId", "conversation_id"),
            messageId: requireString(payload, "messageId", "message_id")
          }
        };
      case "conversation.read":
        return {
          type: value.type,
          payload: {
            conversationId: requireString(payload, "conversationId", "conversation_id"),
            userId: requireString(payload, "userId", "user_id"),
            lastReadMessageId: requireString(payload, "lastReadMessageId", "last_read_message_id")
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
            conversationId: requireString(payload, "conversationId", "conversation_id"),
            active: requireBoolean(payload, "active")
          }
        };
      case "coworking.hello":
        return {
          type: value.type,
          payload: {
            fromUserId: requireString(payload, "fromUserId", "from_user_id", "userId", "user_id"),
            spaceId: optionalString(payload, "spaceId", "space_id")
          }
        };
      case "coworking.knock":
        return {
          type: value.type,
          payload: {
            requestId: requireString(payload, "requestId", "request_id", "id"),
            fromUserId: requireString(payload, "fromUserId", "from_user_id", "userId", "user_id"),
            spaceId: requireString(payload, "spaceId", "space_id")
          }
        };
      case "coworking.knock.resolved": {
        const status = requireString(payload, "status");
        if (status !== "accepted" && status !== "declined") return null;
        return {
          type: value.type,
          payload: {
            requestId: requireString(payload, "requestId", "request_id", "id"),
            status,
            spaceId: optionalString(payload, "spaceId", "space_id")
          }
        };
      }
      default:
        return null;
    }
  } catch (error) {
    if (error instanceof WireValidationError) return null;
    throw error;
  }
}
