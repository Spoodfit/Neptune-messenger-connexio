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

function optionalStringArray(record: Record<string, unknown>, ...keys: string[]): string[] | undefined {
  const raw = first(record, ...keys);
  if (!Array.isArray(raw)) return undefined;
  const values = raw
    .map((item) => typeof item === "string" ? item.trim() : isRecord(item) ? optionalString(first(item, "name", "label", "title", "nom")) : undefined)
    .filter((item): item is string => Boolean(item))
    .slice(0, 12);
  return values.length ? [...new Set(values)] : undefined;
}

type BusinessItem = {
  id?: string;
  kind?: "service" | "product" | "activity";
  title?: string;
  description?: string;
  url?: string;
};

type BusinessUniverseUser = AppUser & {
  headline?: string;
  bio?: string;
  sector?: string;
  website?: string;
  canHelpWith?: string[];
  lookingFor?: string[];
  expertise?: string[];
  businessItems?: BusinessItem[];
};

function businessItemKind(value: unknown, fallback: BusinessItem["kind"]): BusinessItem["kind"] {
  const normalized = optionalString(value)?.toLocaleLowerCase("fr");
  if (normalized === "product" || normalized === "produit") return "product";
  if (normalized === "service") return "service";
  if (normalized === "activity" || normalized === "activité" || normalized === "activite") return "activity";
  return fallback;
}

function normalizeBusinessItems(record: Record<string, unknown>): BusinessItem[] | undefined {
  const sources: Array<{ raw: unknown; fallback: BusinessItem["kind"] }> = [
    { raw: first(record, "businessItems", "business_items", "offers", "offres"), fallback: "activity" },
    { raw: first(record, "services", "prestations"), fallback: "service" },
    { raw: first(record, "products", "produits"), fallback: "product" }
  ];
  const items: BusinessItem[] = [];
  for (const source of sources) {
    if (!Array.isArray(source.raw)) continue;
    for (const value of source.raw) {
      if (typeof value === "string" && value.trim()) {
        items.push({ title: value.trim(), kind: source.fallback });
        continue;
      }
      if (!isRecord(value)) continue;
      const title = optionalString(first(value, "title", "name", "label", "nom"));
      if (!title) continue;
      items.push({
        id: optionalString(first(value, "id", "uuid", "slug")),
        kind: businessItemKind(first(value, "kind", "type", "category", "categorie"), source.fallback),
        title,
        description: optionalString(first(value, "description", "summary", "resume", "details")),
        url: optionalString(first(value, "url", "web_url", "website", "link"))
      });
    }
  }
  const deduped = items.filter((item, index, array) => array.findIndex((candidate) => `${candidate.kind}:${candidate.title}`.toLocaleLowerCase("fr") === `${item.kind}:${item.title}`.toLocaleLowerCase("fr")) === index).slice(0, 8);
  return deduped.length ? deduped : undefined;
}

function augmentBusinessUniverse(user: AppUser, raw: unknown): AppUser {
  if (!isRecord(raw)) return user;
  const profile = isRecord(first(raw, "profile", "profil", "business_profile"))
    ? first(raw, "profile", "profil", "business_profile") as Record<string, unknown>
    : raw;
  const expertise = optionalStringArray(profile, "expertise", "expertises", "skills", "competences", "compétences");
  const canHelpWith = optionalStringArray(profile, "canHelpWith", "can_help_with", "can_help", "helps_with", "aide_sur") ?? expertise;
  const lookingFor = optionalStringArray(profile, "lookingFor", "looking_for", "needs", "besoins", "recherche", "searching_for");
  const webProfileUrl = optionalString(first(profile, "webProfileUrl", "web_profile_url", "profile_url", "public_profile_url")) ?? user.webProfileUrl;
  const augmented: BusinessUniverseUser = {
    ...user,
    webProfileUrl,
    headline: optionalString(first(profile, "headline", "tagline", "job_title", "fonction", "titre")),
    bio: optionalString(first(profile, "bio", "description", "presentation", "présentation", "about")),
    sector: optionalString(first(profile, "sector", "secteur", "industry", "activity", "activite", "activité")),
    website: optionalString(first(profile, "website", "site_web", "website_url", "company_url")),
    expertise,
    canHelpWith,
    lookingFor,
    businessItems: normalizeBusinessItems(profile)
  };
  return augmented;
}

function requestedTarget(rawTranslation?: unknown): string {
  if (isRecord(rawTranslation)) {
    return optionalString(first(rawTranslation, "targetLanguage", "target_language", "language")) ?? getTranslationRequestLanguage();
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
  if (!isRecord(rawTranslation)) return sourceLanguage ? { ...reply, sourceLanguage } : reply;
  return { ...reply, sourceLanguage, translation: normalizeMessageTranslation(rawTranslation, requestedTarget(rawTranslation)) };
}

function augmentAttachments(attachments: MessageAttachment[] | undefined, raw: unknown): MessageAttachment[] | undefined {
  if (!attachments || !Array.isArray(raw)) return attachments;
  return attachments.map((attachment, index) => {
    const rawAttachment = raw[index];
    if (!isRecord(rawAttachment) || !attachment.transcript) return attachment;
    const rawTranslation = first(rawAttachment, "transcript_translation", "transcriptTranslation") ?? (isRecord(first(rawAttachment, "translation")) ? first(rawAttachment, "translation") : undefined);
    if (!isRecord(rawTranslation)) return attachment;
    return { ...attachment, transcriptTranslation: normalizeContentTranslation(rawTranslation, requestedTarget(rawTranslation)) };
  });
}

function augmentMessageTranslation(message: ChatMessage, raw: unknown): ChatMessage {
  if (!isRecord(raw)) return message;
  const sourceLanguage = optionalString(first(raw, "sourceLanguage", "source_language", "detected_language"));
  const rawTranslation = first(raw, "translation", "translated_message");
  const messageTranslation = isRecord(rawTranslation) ? normalizeMessageTranslation(rawTranslation, requestedTarget(rawTranslation)) : undefined;
  const rawPoll = first(raw, "poll", "survey");
  let poll = message.poll;
  if (poll && isRecord(rawPoll)) {
    const pollSourceLanguage = optionalString(first(rawPoll, "sourceLanguage", "source_language", "detected_language"));
    const rawPollTranslation = first(rawPoll, "translation", "translated_poll") ?? (isRecord(rawTranslation) ? first(rawTranslation, "poll", "survey") : undefined);
    poll = { ...poll, sourceLanguage: pollSourceLanguage, translation: isRecord(rawPollTranslation) ? normalizePollTranslation(rawPollTranslation, requestedTarget(rawPollTranslation)) : poll.translation };
  }
  const rawReply = first(raw, "replyPreview", "reply_preview", "reply", "reply_to");
  const rawAttachments = first(raw, "attachments");
  return { ...message, sourceLanguage: messageTranslation?.sourceLanguage ?? sourceLanguage, translation: messageTranslation ?? message.translation, replyPreview: augmentReplyPreview(message.replyPreview, rawReply), attachments: augmentAttachments(message.attachments, rawAttachments), poll };
}

function augmentEventVote(conversation: Conversation, raw: Record<string, unknown>): Conversation {
  if (!conversation.eventVoteAlert) return conversation;
  const rawAlert = first(raw, "eventVoteAlert", "event_vote_alert", "pending_event_vote");
  if (!isRecord(rawAlert)) return conversation;
  const rawTranslation = first(rawAlert, "translation", "translated_alert", "translated_vote");
  const sourceLanguage = optionalString(first(rawAlert, "sourceLanguage", "source_language", "detected_language"));
  return { ...conversation, eventVoteAlert: { ...conversation.eventVoteAlert, sourceLanguage, translation: isRecord(rawTranslation) ? normalizeContentTranslation(rawTranslation, requestedTarget(rawTranslation)) : conversation.eventVoteAlert.translation } };
}

function augmentConversationTranslation(conversation: Conversation, raw: unknown): Conversation {
  if (!isRecord(raw)) return conversation;
  const sourceLanguage = optionalString(first(raw, "sourceLanguage", "source_language", "detected_language"));
  const rawTranslation = first(raw, "translation", "translated_content", "content_translation");
  const translated = isRecord(rawTranslation)
    ? { ...conversation, sourceLanguage, translation: normalizeContentTranslation(rawTranslation, requestedTarget(rawTranslation)) }
    : sourceLanguage ? { ...conversation, sourceLanguage } : conversation;
  return augmentEventVote(translated, raw);
}

export function normalizeAppUser(value: unknown): AppUser {
  return augmentBusinessUniverse(base.normalizeAppUser(value), value);
}

export function normalizeSessionPayload(value: unknown): SessionPayload {
  const session = base.normalizeSessionPayload(value);
  if (!isRecord(value)) return session;
  return { ...session, user: normalizeAppUser(first(value, "user")) };
}

export function normalizeConversation(value: unknown): Conversation {
  return augmentConversationTranslation(base.normalizeConversation(value), value);
}

export function normalizeConversationList(value: unknown): Conversation[] {
  const conversations = base.normalizeConversationList(value);
  const rawItems = rawConversationItems(value);
  if (!rawItems) return conversations;
  return conversations.map((conversation, index) => augmentConversationTranslation(conversation, rawItems[index]));
}

export function normalizeChatMessage(value: unknown): ChatMessage {
  return augmentMessageTranslation(base.normalizeChatMessage(value), value);
}

export function normalizeMessagePage(value: unknown): CursorPage<ChatMessage> {
  const page = base.normalizeMessagePage(value);
  const rawItems = rawMessageItems(value);
  if (!rawItems) return page;
  return { ...page, items: page.items.map((message, index) => augmentMessageTranslation(message, rawItems[index])) };
}
