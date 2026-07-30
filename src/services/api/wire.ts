import { normalizeUserRole, ROLE_LABELS } from "../../domain/roles";
import type {
  AppUser,
  ChatMessage,
  Conversation,
  ConversationType,
  MessageStatus,
  SessionPayload,
  UserRole
} from "../../types/messaging";
import type { CursorPage } from "./contracts";

export class WireValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WireValidationError";
  }
}

const USER_ROLES = new Set<UserRole>([
  "visionnaire",
  "amiral",
  "capitaine",
  "legende",
  "moussaillon",
  "triton",
  "admin",
  "member",
  "captain",
  "admiral",
  "visionary"
]);
const CONVERSATION_TYPES = new Set<ConversationType>([
  "announcement",
  "city",
  "role",
  "topic",
  "support",
  "direct",
  "small_group"
]);
const MESSAGE_STATUSES = new Set<MessageStatus>([
  "queued",
  "sending",
  "sent",
  "delivered",
  "read",
  "failed"
]);

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
  label: string,
  ...keys: string[]
): string {
  const value = readUnknown(record, ...keys);
  if (typeof value !== "string" || !value.trim()) {
    throw new WireValidationError(`${label} manquant ou invalide.`);
  }
  return value.trim();
}

function optionalString(
  record: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  const value = readUnknown(record, ...keys);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requireDateString(
  record: Record<string, unknown>,
  label: string,
  ...keys: string[]
): string {
  const value = requireString(record, label, ...keys);
  if (!Number.isFinite(Date.parse(value))) {
    throw new WireValidationError(`${label} manquante ou invalide.`);
  }
  return value;
}

function optionalDateString(
  record: Record<string, unknown>,
  label: string,
  ...keys: string[]
): string | undefined {
  const value = optionalString(record, ...keys);
  if (!value) return undefined;
  if (!Number.isFinite(Date.parse(value))) {
    throw new WireValidationError(`${label} invalide.`);
  }
  return value;
}

function numberOrDefault(
  record: Record<string, unknown>,
  fallback: number,
  ...keys: string[]
): number {
  const value = readUnknown(record, ...keys);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanOrDefault(
  record: Record<string, unknown>,
  fallback: boolean,
  ...keys: string[]
): boolean {
  const value = readUnknown(record, ...keys);
  return typeof value === "boolean" ? value : fallback;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "NB"
  );
}

function normalizeRole(value: unknown): UserRole {
  return typeof value === "string" && USER_ROLES.has(value as UserRole)
    ? (value as UserRole)
    : "triton";
}

function requireConversationType(value: unknown): ConversationType {
  if (
    typeof value !== "string" ||
    !CONVERSATION_TYPES.has(value as ConversationType)
  ) {
    throw new WireValidationError("Type de conversation manquant ou invalide.");
  }
  return value as ConversationType;
}

function normalizeMessageStatus(value: unknown): MessageStatus {
  return typeof value === "string" && MESSAGE_STATUSES.has(value as MessageStatus)
    ? (value as MessageStatus)
    : "sent";
}

export function normalizeAppUser(value: unknown): AppUser {
  if (!isRecord(value)) throw new WireValidationError("Utilisateur invalide.");
  const name = requireString(value, "Nom utilisateur", "name", "full_name");
  const role = normalizeRole(readUnknown(value, "role", "neptune_role"));
  return {
    id: requireString(value, "Identifiant utilisateur", "id", "user_id"),
    name,
    initials: optionalString(value, "initials") ?? initialsFromName(name),
    company: optionalString(value, "company", "company_name") ?? "",
    city: optionalString(value, "city") ?? "",
    role,
    roleLabel:
      optionalString(value, "roleLabel", "role_label") ??
      ROLE_LABELS[normalizeUserRole(role)],
    online: booleanOrDefault(value, false, "online", "is_online"),
    avatarUrl: optionalString(value, "avatarUrl", "avatar_url"),
    phone: optionalString(value, "phone", "phone_number")
  };
}

export function normalizeSessionPayload(value: unknown): SessionPayload {
  if (!isRecord(value)) throw new WireValidationError("Session invalide.");
  const expiresIn = numberOrDefault(value, 0, "expiresIn", "expires_in");
  if (expiresIn <= 0) {
    throw new WireValidationError("Durée de session absente ou invalide.");
  }
  return {
    accessToken: requireString(
      value,
      "Jeton d'accès",
      "accessToken",
      "access_token"
    ),
    refreshToken: requireString(
      value,
      "Jeton de renouvellement",
      "refreshToken",
      "refresh_token"
    ),
    expiresIn,
    user: normalizeAppUser(readUnknown(value, "user"))
  };
}

export function normalizeConversation(value: unknown): Conversation {
  if (!isRecord(value)) throw new WireValidationError("Conversation invalide.");
  const allowedRolesRaw = readUnknown(value, "allowedRoles", "allowed_roles");
  const allowedRoles = Array.isArray(allowedRolesRaw)
    ? allowedRolesRaw.filter(
        (role): role is UserRole =>
          typeof role === "string" && USER_ROLES.has(role as UserRole)
      )
    : undefined;
  return {
    id: requireString(value, "Identifiant conversation", "id"),
    name: requireString(value, "Nom conversation", "name"),
    description: optionalString(value, "description"),
    categoryLabel:
      optionalString(value, "categoryLabel", "category_label") ?? "Discussion",
    type: requireConversationType(readUnknown(value, "type")),
    memberCount: Math.max(
      0,
      numberOrDefault(value, 0, "memberCount", "member_count")
    ),
    unreadCount: Math.max(
      0,
      numberOrDefault(value, 0, "unreadCount", "unread_count")
    ),
    lastMessage: optionalString(value, "lastMessage", "last_message"),
    lastMessageAt: optionalDateString(
      value,
      "Date du dernier message",
      "lastMessageAt",
      "last_message_at"
    ),
    pinnedMessage: optionalString(value, "pinnedMessage", "pinned_message"),
    restricted: booleanOrDefault(value, false, "restricted"),
    allowedRoles,
    canPost: booleanOrDefault(value, false, "canPost", "can_post"),
    avatarUrl: optionalString(value, "avatarUrl", "avatar_url")
  };
}

export function normalizeConversationList(value: unknown): Conversation[] {
  if (!Array.isArray(value)) {
    throw new WireValidationError("Liste des conversations invalide.");
  }
  return value.map(normalizeConversation);
}

export function normalizeChatMessage(value: unknown): ChatMessage {
  if (!isRecord(value)) throw new WireValidationError("Message invalide.");
  const senderName =
    optionalString(value, "senderName", "sender_name") ?? "Membre Neptune";
  return {
    id: requireString(value, "Identifiant message", "id", "message_id"),
    clientMessageId: optionalString(
      value,
      "clientMessageId",
      "client_message_id"
    ),
    conversationId: requireString(
      value,
      "Identifiant conversation du message",
      "conversationId",
      "conversation_id"
    ),
    senderId: requireString(value, "Expéditeur", "senderId", "sender_id"),
    senderName,
    senderInitials:
      optionalString(value, "senderInitials", "sender_initials") ??
      initialsFromName(senderName),
    senderAvatarUrl: optionalString(
      value,
      "senderAvatarUrl",
      "sender_avatar_url"
    ),
    body: requireString(value, "Contenu message", "body"),
    createdAt: requireDateString(
      value,
      "Date message",
      "createdAt",
      "created_at"
    ),
    updatedAt: optionalDateString(
      value,
      "Date de modification du message",
      "updatedAt",
      "updated_at"
    ),
    status: normalizeMessageStatus(readUnknown(value, "status")),
    isMine: booleanOrDefault(value, false, "isMine", "is_mine"),
    replyToMessageId: optionalString(
      value,
      "replyToMessageId",
      "reply_to_message_id"
    ),
    retryCount: Math.max(
      0,
      numberOrDefault(value, 0, "retryCount", "retry_count")
    ),
    errorCode: optionalString(value, "errorCode", "error_code")
  };
}

export function normalizeMessagePage(value: unknown): CursorPage<ChatMessage> {
  if (!isRecord(value)) {
    throw new WireValidationError("Page de messages invalide.");
  }
  const items = readUnknown(value, "items");
  if (!Array.isArray(items)) {
    throw new WireValidationError("Liste de messages invalide.");
  }
  const cursor = readUnknown(value, "nextCursor", "next_cursor");
  if (cursor !== null && cursor !== undefined && typeof cursor !== "string") {
    throw new WireValidationError("Curseur de messages invalide.");
  }
  return {
    items: items.map(normalizeChatMessage),
    nextCursor: typeof cursor === "string" && cursor ? cursor : null
  };
}
