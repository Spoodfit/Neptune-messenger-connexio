import type { CursorPage } from "./contracts";
import * as base from "./BaseWireExtensions";
import {
  normalizeContentTranslation,
  normalizeMessageTranslation,
  normalizePollTranslation
} from "./translationWire";
import { getTranslationRequestLanguage } from "../../i18n/translationLocale";
import type {
  AppUser,
  ChatMessage,
  Conversation,
  MessageAttachment,
  ReplyPreview,
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

function requestedTarget(rawTranslation?: unknown): string {
  if (isRecord(rawTranslation)) {
    return (
      optionalString(first(rawTranslation, "targetLanguage", "target_language", "language")) ??
      getTranslationRequestLanguage()
    );
  }
  return getTranslationRequestLanguage();
}

function rawMessageItems(value: unknown): unknown[] | null {
  if (!isRecord(value)) return null;
  const items = first(value, "items", "messages");
  return Array.isArray(items) ? items : null;
}

function rawConversationItems(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return null;
  const items = first(value, "items", "threads", "conversations");
  return Array.isArray(items) ? items : null;
}

function augmentReplyPreview(reply: ReplyPreview | undefined, raw: unknown): ReplyPreview | undefined {
  if (!reply || !isRecord(raw)) return reply;
  const sourceLanguage = optionalString(first(raw, "sourceLanguage", "source_language", "detected_language"));
  const rawTranslation = first(raw, "translation", "translated_message", "translated_reply");
  if (!isRecord(rawTranslation)) {
    return sourceLanguage ? { ...reply, sourceLanguage } : reply;
  }
  return {
    ...reply,
    sourceLanguage,
    translation: normalizeMessageTranslation(rawTranslation, requestedTarget(rawTranslation))
  };
}

function augmentAttachments(attachments: MessageAttachment[] | undefined, raw: unknown): MessageAttachment[] | undefined {
  if (!attachments || !Array.isArray(raw)) return attachments;
  return attachments.map((attachment, index) => {
    const rawAttachment = raw[index];
    if (!isRecord(rawAttachment) || !attachment.transcript) return attachment;
    const rawTranslation =
      first(rawAttachment, "transcript_translation", "transcriptTranslation") ??
      (isRecord(first(rawAttachment, "translation")) ? first(rawAttachment, "translation") : undefined);
    if (!isRecord(rawTranslation)) return attachment;
    return {
      ...attachment,
      transcriptTranslation: normalizeContentTranslation(
        rawTranslation,
        requestedTarget(rawTranslation)
      )
    };
  });
}

function augmentMessageTranslation(message: ChatMessage, raw: unknown): ChatMessage {
  if (!isRecord(raw)) return message;
  const sourceLanguage = optionalString(
    first(raw, "sourceLanguage", "source_language", "detected_language")
  );
  const rawTranslation = first(raw, "translation", "translated_message");
  const messageTranslation = isRecord(rawTranslation)
    ? normalizeMessageTranslation(rawTranslation, requestedTarget(rawTranslation))
    : undefined;

  const rawPoll = first(raw, "poll", "survey");
  let poll = message.poll;
  if (poll && isRecord(rawPoll)) {
    const pollSourceLanguage = optionalString(
      first(rawPoll, "sourceLanguage", "source_language", "detected_language")
    );
    const rawPollTranslation =
      first(rawPoll, "translation", "translated_poll") ??
      (isRecord(rawTranslation) ? first(rawTranslation, "poll", "survey") : undefined);
    poll = {
      ...poll,
      sourceLanguage: pollSourceLanguage,
      translation: isRecord(rawPollTranslation)
        ? normalizePollTranslation(rawPollTranslation, requestedTarget(rawPollTranslation))
        : poll.translation
    };
  }

  const rawReply = first(raw, "replyPreview", "reply_preview", "reply", "reply_to");
  const rawAttachments = first(raw, "attachments");

  return {
    ...message,
    sourceLanguage: messageTranslation?.sourceLanguage ?? sourceLanguage,
    translation: messageTranslation ?? message.translation,
    replyPreview: augmentReplyPreview(message.replyPreview, rawReply),
    attachments: augmentAttachments(message.attachments, rawAttachments),
    poll
  };
}

function augmentEventVote(conversation: Conversation, raw: Record<string, unknown>): Conversation {
  if (!conversation.eventVoteAlert) return conversation;
  const rawAlert = first(raw, "eventVoteAlert", "event_vote_alert", "pending_event_vote");
  if (!isRecord(rawAlert)) return conversation;
  const rawTranslation = first(rawAlert, "translation", "translated_alert", "translated_vote");
  const sourceLanguage = optionalString(
    first(rawAlert, "sourceLanguage", "source_language", "detected_language")
  );
  return {
    ...conversation,
    eventVoteAlert: {
      ...conversation.eventVoteAlert,
      sourceLanguage,
      translation: isRecord(rawTranslation)
        ? normalizeContentTranslation(rawTranslation, requestedTarget(rawTranslation))
        : conversation.eventVoteAlert.translation
    }
  };
}

function augmentConversationTranslation(conversation: Conversation, raw: unknown): Conversation {
  if (!isRecord(raw)) return conversation;
  const sourceLanguage = optionalString(
    first(raw, "sourceLanguage", "source_language", "detected_language")
  );
  const rawTranslation = first(raw, "translation", "translated_content", "content_translation");
  const translated = isRecord(rawTranslation)
    ? {
        ...conversation,
        sourceLanguage,
        translation: normalizeContentTranslation(rawTranslation, requestedTarget(rawTranslation))
      }
    : sourceLanguage
      ? { ...conversation, sourceLanguage }
      : conversation;
  return augmentEventVote(translated, raw);
}

export const normalizeAppUser: (value: unknown) => AppUser = base.normalizeAppUser;
export const normalizeSessionPayload: (value: unknown) => SessionPayload =
  base.normalizeSessionPayload;

export function normalizeConversation(value: unknown): Conversation {
  return augmentConversationTranslation(base.normalizeConversation(value), value);
}

export function normalizeConversationList(value: unknown): Conversation[] {
  const conversations = base.normalizeConversationList(value);
  const rawItems = rawConversationItems(value);
  if (!rawItems) return conversations;
  return conversations.map((conversation, index) =>
    augmentConversationTranslation(conversation, rawItems[index])
  );
}

export function normalizeChatMessage(value: unknown): ChatMessage {
  return augmentMessageTranslation(base.normalizeChatMessage(value), value);
}

export function normalizeMessagePage(value: unknown): CursorPage<ChatMessage> {
  const page = base.normalizeMessagePage(value);
  const rawItems = rawMessageItems(value);
  if (!rawItems) return page;
  return {
    ...page,
    items: page.items.map((message, index) =>
      augmentMessageTranslation(message, rawItems[index])
    )
  };
}
