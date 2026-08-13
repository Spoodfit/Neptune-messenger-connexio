import type { CursorPage } from "./contracts";
import * as base from "./BaseWireExtensions";
import { normalizeMessageTranslation } from "./translationWire";
import type {
  AppUser,
  ChatMessage,
  Conversation,
  SessionPayload
} from "../../types/messaging";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function first(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function rawMessageItems(value: unknown): unknown[] | null {
  if (!isRecord(value)) return null;
  const items = first(value, "items", "messages");
  return Array.isArray(items) ? items : null;
}

function augmentTranslation(message: ChatMessage, raw: unknown): ChatMessage {
  if (!isRecord(raw)) return message;
  const sourceLanguage = optionalString(
    first(raw, "sourceLanguage", "source_language", "detected_language")
  );
  const rawTranslation = first(raw, "translation", "translated_message");
  if (!isRecord(rawTranslation)) {
    return sourceLanguage ? { ...message, sourceLanguage } : message;
  }

  const requestedTarget =
    optionalString(
      first(rawTranslation, "targetLanguage", "target_language", "language")
    ) ?? "fr";
  const translation = normalizeMessageTranslation(rawTranslation, requestedTarget);

  return {
    ...message,
    sourceLanguage: translation.sourceLanguage ?? sourceLanguage,
    translation
  };
}

export const normalizeAppUser: (value: unknown) => AppUser = base.normalizeAppUser;
export const normalizeSessionPayload: (value: unknown) => SessionPayload =
  base.normalizeSessionPayload;
export const normalizeConversation: (value: unknown) => Conversation =
  base.normalizeConversation;
export const normalizeConversationList: (value: unknown) => Conversation[] =
  base.normalizeConversationList;

export function normalizeChatMessage(value: unknown): ChatMessage {
  return augmentTranslation(base.normalizeChatMessage(value), value);
}

export function normalizeMessagePage(value: unknown): CursorPage<ChatMessage> {
  const page = base.normalizeMessagePage(value);
  const rawItems = rawMessageItems(value);
  if (!rawItems) return page;
  return {
    ...page,
    items: page.items.map((message, index) =>
      augmentTranslation(message, rawItems[index])
    )
  };
}
