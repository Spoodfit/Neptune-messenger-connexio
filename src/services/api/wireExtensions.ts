import type { CursorPage } from "./contracts";
import {
  normalizeAppUser as normalizeBaseUser,
  normalizeChatMessage as normalizeBaseMessage,
  normalizeConversation as normalizeBaseConversation,
  normalizeSessionPayload as normalizeBaseSession,
  WireValidationError
} from "./wire";
import type {
  AppUser,
  ChatMessage,
  Conversation,
  EventVoteAlert,
  MessageAttachment,
  MessagePoll,
  PollOption,
  SessionPayload
} from "../../types/messaging";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function first(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) if (key in record) return record[key];
  return undefined;
}
function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  return values.length ? [...new Set(values)] : undefined;
}
const USER_ROLES = new Set([
  "visionnaire",
  "visionary",
  "amiral",
  "admiral",
  "capitaine",
  "captain",
  "legende",
  "moussaillon",
  "triton",
  "member",
  "allie",
  "ally",
  "free",
  "admin"
]);

function optionalUserRole(value: unknown): ChatMessage["senderRole"] {
  const role = optionalString(value);
  return role && USER_ROLES.has(role)
    ? (role as ChatMessage["senderRole"])
    : undefined;
}
function safeHttpsUrl(value: unknown): string | undefined {
  const text = optionalString(value);
  if (!text) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
function normalizePollOption(value: unknown, index: number): PollOption {
  if (!isRecord(value)) throw new WireValidationError(`Choix de sondage ${index + 1} invalide.`);
  const label = optionalString(first(value, "label", "text", "value"));
  if (!label) throw new WireValidationError("Libellé de sondage manquant.");
  return {
    id: optionalString(first(value, "id", "option_id")) ?? `poll-option-${index}`,
    label,
    voteCount: Math.max(0, Math.trunc(optionalNumber(first(value, "voteCount", "vote_count", "votes")) ?? 0)),
    votedByCurrentUser: first(value, "votedByCurrentUser", "voted_by_current_user", "selected") === true
  };
}
function normalizePoll(value: unknown): MessagePoll | undefined {
  if (!isRecord(value)) return undefined;
  const question = optionalString(first(value, "question", "title"));
  const rawOptions = first(value, "options", "choices");
  if (!question || !Array.isArray(rawOptions) || rawOptions.length < 2) return undefined;
  const options = rawOptions.slice(0, 10).map(normalizePollOption);
  const calculatedVotes = options.reduce((sum, option) => sum + option.voteCount, 0);
  const closesAt = optionalString(first(value, "closesAt", "closes_at"));
  const explicitClosedAt = optionalString(first(value, "closedAt", "closed_at"));
  const closed = first(value, "closed", "is_closed") === true || Boolean(explicitClosedAt) || Boolean(closesAt && Date.parse(closesAt) <= Date.now());
  return {
    id: optionalString(first(value, "id", "poll_id")) ?? "poll",
    question,
    options,
    allowMultiple: first(value, "allowMultiple", "allow_multiple", "multiple") !== false,
    anonymous: first(value, "anonymous", "is_anonymous") === true,
    totalVotes: Math.max(0, Math.trunc(optionalNumber(first(value, "totalVotes", "total_votes")) ?? calculatedVotes)),
    closesAt,
    closedAt: closed ? explicitClosedAt ?? closesAt : undefined,
    eventVoteId: optionalString(first(value, "eventVoteId", "event_vote_id", "synced_event_id", "event_id")),
    eventVoteUrl: safeHttpsUrl(first(value, "eventVoteUrl", "event_vote_url", "vote_url"))
  };
}
function normalizeEventVoteAlert(value: unknown): EventVoteAlert | undefined {
  if (!isRecord(value)) return undefined;
  const title = optionalString(first(value, "title", "label"));
  const webUrl = safeHttpsUrl(first(value, "webUrl", "web_url", "businessUrl", "business_url", "url"));
  if (!title || !webUrl) return undefined;
  const city = optionalString(first(value, "city", "ville"));
  return {
    id: optionalString(first(value, "id", "alert_id")) ?? title,
    title,
    clubName: optionalString(first(value, "clubName", "club_name", "club")) ?? (city ? `Club ${city}` : "Club Neptune"),
    city,
    pendingCount: Math.max(0, Math.trunc(optionalNumber(first(value, "pendingCount", "pending_count")) ?? 0)),
    webUrl,
    closesAt: optionalString(first(value, "closesAt", "closes_at"))
  };
}
function augmentAttachment(attachment: MessageAttachment, raw: unknown): MessageAttachment {
  if (!isRecord(raw)) return attachment;
  return {
    ...attachment,
    uri: attachment.uri ?? safeHttpsUrl(first(raw, "uri", "url", "download_url", "downloadUrl")),
    downloadUrl: safeHttpsUrl(first(raw, "downloadUrl", "download_url")),
    thumbnailUrl: safeHttpsUrl(first(raw, "thumbnailUrl", "thumbnail_url"))
  };
}
export function normalizeAppUser(value: unknown): AppUser {
  const user = normalizeBaseUser(value);
  if (!isRecord(value)) return user;
  return { ...user, webProfileUrl: safeHttpsUrl(first(value, "webProfileUrl", "web_profile_url", "profile_url")) };
}
export function normalizeSessionPayload(value: unknown): SessionPayload {
  const session = normalizeBaseSession(value);
  if (!isRecord(value)) return session;
  return { ...session, user: normalizeAppUser(first(value, "user")) };
}
export function normalizeConversation(value: unknown): Conversation {
  const conversation = normalizeBaseConversation(value);
  if (!isRecord(value)) return conversation;
  const memberIds = optionalStringArray(first(value, "memberIds", "member_ids", "participant_ids")) ?? conversation.memberIds;
  return {
    ...conversation,
    memberIds,
    memberCount: memberIds?.length ?? conversation.memberCount,
    activeMemberIds: optionalStringArray(first(value, "activeMemberIds", "active_member_ids", "most_active_member_ids")),
    eventVoteAlert: normalizeEventVoteAlert(first(value, "eventVoteAlert", "event_vote_alert", "pending_event_vote"))
  };
}
export function normalizeConversationList(value: unknown): Conversation[] {
  const items = Array.isArray(value) ? value : isRecord(value) && Array.isArray(first(value, "items", "threads")) ? (first(value, "items", "threads") as unknown[]) : null;
  if (!items) throw new WireValidationError("Liste des conversations invalide.");
  return items.map(normalizeConversation);
}
export function normalizeChatMessage(value: unknown): ChatMessage {
  if (!isRecord(value)) return normalizeBaseMessage(value);
  const poll = normalizePoll(first(value, "poll", "survey"));
  const hasBody = Boolean(optionalString(first(value, "body")));
  const input = poll && !hasBody ? { ...value, body: "Sondage" } : value;
  const message = normalizeBaseMessage(input);
  const rawSender = first(value, "sender", "author", "user");
  const senderRole =
    optionalUserRole(first(value, "senderRole", "sender_role", "author_role")) ??
    (isRecord(rawSender)
      ? optionalUserRole(first(rawSender, "role", "status", "membership_role"))
      : undefined);
  const rawAttachments = first(value, "attachments");
  const attachments = message.attachments && Array.isArray(rawAttachments) ? message.attachments.map((attachment, index) => augmentAttachment(attachment, rawAttachments[index])) : message.attachments;
  return {
    ...message,
    senderRole,
    body: poll && !hasBody ? "" : message.body,
    attachments,
    poll
  };
}
export function normalizeMessagePage(value: unknown): CursorPage<ChatMessage> {
  if (!isRecord(value)) throw new WireValidationError("Page de messages invalide.");
  const items = first(value, "items", "messages");
  if (!Array.isArray(items)) throw new WireValidationError("Liste de messages invalide.");
  const cursor = first(value, "nextCursor", "next_cursor");
  return { items: items.map(normalizeChatMessage), nextCursor: typeof cursor === "string" && cursor.trim() ? cursor.trim() : null };
}
