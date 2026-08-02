"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WireValidationError = void 0;
exports.normalizeAppUser = normalizeAppUser;
exports.normalizeSessionPayload = normalizeSessionPayload;
exports.normalizeConversation = normalizeConversation;
exports.normalizeConversationList = normalizeConversationList;
exports.normalizeChatMessage = normalizeChatMessage;
exports.normalizeMessagePage = normalizeMessagePage;
const roles_1 = require("../../domain/roles");
class WireValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "WireValidationError";
    }
}
exports.WireValidationError = WireValidationError;
const USER_ROLES = new Set([
    "visionnaire",
    "amiral",
    "capitaine",
    "legende",
    "moussaillon",
    "triton",
    "free",
    "admin",
    "member",
    "captain",
    "admiral",
    "visionary"
]);
const CONVERSATION_TYPES = new Set([
    "announcement",
    "city",
    "role",
    "topic",
    "support",
    "direct",
    "small_group"
]);
const MESSAGE_STATUSES = new Set([
    "queued",
    "sending",
    "sent",
    "delivered",
    "read",
    "failed"
]);
const ATTACHMENT_KINDS = new Set([
    "photo",
    "video",
    "document",
    "file",
    "audio",
    "location",
    "contact"
]);
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function readUnknown(record, ...keys) {
    for (const key of keys) {
        if (key in record)
            return record[key];
    }
    return undefined;
}
function requireString(record, label, ...keys) {
    const value = readUnknown(record, ...keys);
    if (typeof value !== "string" || !value.trim()) {
        throw new WireValidationError(`${label} manquant ou invalide.`);
    }
    return value.trim();
}
function requireBoundedString(record, label, maxLength, ...keys) {
    const value = requireString(record, label, ...keys);
    if (value.length > maxLength) {
        throw new WireValidationError(`${label} trop long.`);
    }
    return value;
}
function optionalString(record, ...keys) {
    const value = readUnknown(record, ...keys);
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function optionalBoundedString(record, maxLength, ...keys) {
    const value = optionalString(record, ...keys);
    return value && value.length <= maxLength ? value : undefined;
}
function optionalHttpsUrl(record, ...keys) {
    const value = optionalBoundedString(record, 2_048, ...keys);
    if (!value)
        return undefined;
    try {
        const url = new URL(value);
        return url.protocol === "https:" ? url.toString() : undefined;
    }
    catch {
        return undefined;
    }
}
function requireDateString(record, label, ...keys) {
    const value = requireString(record, label, ...keys);
    if (!Number.isFinite(Date.parse(value))) {
        throw new WireValidationError(`${label} manquante ou invalide.`);
    }
    return value;
}
function optionalDateString(record, label, ...keys) {
    const value = optionalString(record, ...keys);
    if (!value)
        return undefined;
    if (!Number.isFinite(Date.parse(value))) {
        throw new WireValidationError(`${label} invalide.`);
    }
    return value;
}
function numberOrDefault(record, fallback, ...keys) {
    const value = readUnknown(record, ...keys);
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function nonNegativeInteger(record, fallback, ...keys) {
    return Math.max(0, Math.trunc(numberOrDefault(record, fallback, ...keys)));
}
function optionalPositiveInteger(record, ...keys) {
    const value = readUnknown(record, ...keys);
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return undefined;
    }
    return Math.trunc(value);
}
function booleanOrDefault(record, fallback, ...keys) {
    const value = readUnknown(record, ...keys);
    return typeof value === "boolean" ? value : fallback;
}
function optionalStringArray(record, maxItems, maxLength, ...keys) {
    const value = readUnknown(record, ...keys);
    if (!Array.isArray(value))
        return undefined;
    const normalized = value
        .filter((item) => typeof item === "string" && Boolean(item.trim()))
        .slice(0, maxItems)
        .map((item) => item.trim())
        .filter((item) => item.length <= maxLength);
    return normalized.length ? [...new Set(normalized)] : undefined;
}
function initialsFromName(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return (parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "NB");
}
function normalizeRole(value) {
    return typeof value === "string" && USER_ROLES.has(value)
        ? value
        : "triton";
}
function requireConversationType(value) {
    if (typeof value !== "string" ||
        !CONVERSATION_TYPES.has(value)) {
        throw new WireValidationError("Type de conversation manquant ou invalide.");
    }
    return value;
}
function normalizeMessageStatus(value) {
    return typeof value === "string" && MESSAGE_STATUSES.has(value)
        ? value
        : "sent";
}
function normalizeAttachment(value) {
    if (!isRecord(value))
        throw new WireValidationError("Pièce jointe invalide.");
    const rawKind = readUnknown(value, "kind", "type");
    if (typeof rawKind !== "string" ||
        !ATTACHMENT_KINDS.has(rawKind)) {
        throw new WireValidationError("Type de pièce jointe invalide.");
    }
    const statusRaw = optionalString(value, "status");
    const status = statusRaw === "local" ||
        statusRaw === "uploading" ||
        statusRaw === "ready" ||
        statusRaw === "failed"
        ? statusRaw
        : undefined;
    const progress = numberOrDefault(value, -1, "uploadProgress", "upload_progress");
    const latitude = numberOrDefault(value, Number.NaN, "latitude");
    const longitude = numberOrDefault(value, Number.NaN, "longitude");
    return {
        id: requireBoundedString(value, "Identifiant pièce jointe", 256, "id"),
        kind: rawKind,
        name: optionalBoundedString(value, 255, "name", "file_name") ??
            "Pièce jointe",
        uri: optionalHttpsUrl(value, "uri", "url", "download_url"),
        mimeType: optionalBoundedString(value, 160, "mimeType", "mime_type"),
        sizeBytes: optionalPositiveInteger(value, "sizeBytes", "size_bytes"),
        durationSeconds: optionalPositiveInteger(value, "durationSeconds", "duration_seconds"),
        width: optionalPositiveInteger(value, "width"),
        height: optionalPositiveInteger(value, "height"),
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
        accuracyRadiusMeters: optionalPositiveInteger(value, "accuracyRadiusMeters", "accuracy_radius_meters"),
        uploadProgress: progress >= 0 && progress <= 1 ? progress : undefined,
        status
    };
}
function normalizeReaction(value) {
    if (!isRecord(value))
        throw new WireValidationError("Réaction invalide.");
    return {
        emoji: requireBoundedString(value, "Emoji de réaction", 16, "emoji"),
        count: nonNegativeInteger(value, 0, "count"),
        reactedByCurrentUser: booleanOrDefault(value, false, "reactedByCurrentUser", "reacted_by_current_user"),
        userIds: optionalStringArray(value, 500, 256, "userIds", "user_ids")
    };
}
function normalizeReplyPreview(value) {
    if (!isRecord(value))
        return undefined;
    return {
        messageId: requireBoundedString(value, "Identifiant du message cité", 256, "messageId", "message_id"),
        senderName: requireBoundedString(value, "Auteur du message cité", 160, "senderName", "sender_name"),
        body: requireBoundedString(value, "Aperçu du message cité", 500, "body")
    };
}
function normalizeAppUser(value) {
    if (!isRecord(value))
        throw new WireValidationError("Utilisateur invalide.");
    const name = requireBoundedString(value, "Nom utilisateur", 160, "name", "full_name");
    const role = normalizeRole(readUnknown(value, "role", "neptune_role"));
    return {
        id: requireBoundedString(value, "Identifiant utilisateur", 256, "id", "user_id"),
        name,
        initials: optionalBoundedString(value, 8, "initials") ?? initialsFromName(name),
        company: optionalBoundedString(value, 160, "company", "company_name") ?? "",
        city: optionalBoundedString(value, 160, "city") ?? "",
        role,
        roleLabel: roles_1.ROLE_LABELS[(0, roles_1.normalizeUserRole)(role)],
        online: booleanOrDefault(value, false, "online", "is_online"),
        avatarUrl: optionalHttpsUrl(value, "avatarUrl", "avatar_url"),
        phone: optionalBoundedString(value, 32, "phone", "phone_number"),
        videoCallEnabled: booleanOrDefault(value, false, "videoCallEnabled", "video_call_enabled"),
        lastSeenAt: optionalDateString(value, "Dernière activité", "lastSeenAt", "last_seen_at")
    };
}
function normalizeSessionPayload(value) {
    if (!isRecord(value))
        throw new WireValidationError("Session invalide.");
    const expiresIn = Math.trunc(numberOrDefault(value, 0, "expiresIn", "expires_in"));
    if (expiresIn <= 0) {
        throw new WireValidationError("Durée de session absente ou invalide.");
    }
    return {
        accessToken: requireBoundedString(value, "Jeton d'accès", 16_384, "accessToken", "access_token"),
        refreshToken: requireBoundedString(value, "Jeton de renouvellement", 16_384, "refreshToken", "refresh_token"),
        expiresIn,
        user: normalizeAppUser(readUnknown(value, "user"))
    };
}
function normalizeConversation(value) {
    if (!isRecord(value))
        throw new WireValidationError("Conversation invalide.");
    const allowedRolesRaw = readUnknown(value, "allowedRoles", "allowed_roles");
    const allowedRoles = Array.isArray(allowedRolesRaw)
        ? allowedRolesRaw.filter((role) => typeof role === "string" && USER_ROLES.has(role))
        : undefined;
    return {
        id: requireBoundedString(value, "Identifiant conversation", 256, "id"),
        name: requireBoundedString(value, "Nom conversation", 160, "name"),
        description: optionalBoundedString(value, 2_000, "description"),
        categoryLabel: optionalBoundedString(value, 80, "categoryLabel", "category_label") ??
            "Discussion",
        type: requireConversationType(readUnknown(value, "type")),
        memberCount: nonNegativeInteger(value, 0, "memberCount", "member_count"),
        unreadCount: nonNegativeInteger(value, 0, "unreadCount", "unread_count"),
        mentionCount: nonNegativeInteger(value, 0, "mentionCount", "mention_count"),
        lastMessage: optionalBoundedString(value, 4_000, "lastMessage", "last_message"),
        lastMessageAt: optionalDateString(value, "Date du dernier message", "lastMessageAt", "last_message_at"),
        pinnedMessage: optionalBoundedString(value, 4_000, "pinnedMessage", "pinned_message"),
        restricted: booleanOrDefault(value, false, "restricted"),
        allowedRoles,
        canPost: booleanOrDefault(value, false, "canPost", "can_post"),
        canManage: booleanOrDefault(value, false, "canManage", "can_manage"),
        avatarUrl: optionalHttpsUrl(value, "avatarUrl", "avatar_url"),
        iconName: optionalBoundedString(value, 80, "iconName", "icon_name"),
        memberIds: optionalStringArray(value, 10_000, 256, "memberIds", "member_ids"),
        ownerId: optionalBoundedString(value, 256, "ownerId", "owner_id"),
        adminIds: optionalStringArray(value, 500, 256, "adminIds", "admin_ids"),
        muted: booleanOrDefault(value, false, "muted", "is_muted"),
        archived: booleanOrDefault(value, false, "archived", "is_archived"),
        left: booleanOrDefault(value, false, "left", "has_left")
    };
}
function normalizeConversationList(value) {
    if (!Array.isArray(value)) {
        throw new WireValidationError("Liste des conversations invalide.");
    }
    return value.map(normalizeConversation);
}
function normalizeChatMessage(value) {
    if (!isRecord(value))
        throw new WireValidationError("Message invalide.");
    const senderName = optionalBoundedString(value, 160, "senderName", "sender_name") ??
        "Membre Neptune";
    const attachmentsRaw = readUnknown(value, "attachments");
    const attachments = Array.isArray(attachmentsRaw)
        ? attachmentsRaw.slice(0, 20).map(normalizeAttachment)
        : undefined;
    const reactionsRaw = readUnknown(value, "reactions");
    const reactions = Array.isArray(reactionsRaw)
        ? reactionsRaw.slice(0, 64).map(normalizeReaction)
        : undefined;
    const body = optionalBoundedString(value, 4_000, "body") ?? "";
    if (!body && !attachments?.length) {
        throw new WireValidationError("Message sans contenu ni pièce jointe.");
    }
    return {
        id: requireBoundedString(value, "Identifiant message", 256, "id", "message_id"),
        clientMessageId: optionalBoundedString(value, 256, "clientMessageId", "client_message_id"),
        conversationId: requireBoundedString(value, "Identifiant conversation du message", 256, "conversationId", "conversation_id"),
        senderId: requireBoundedString(value, "Expéditeur", 256, "senderId", "sender_id"),
        senderName,
        senderInitials: optionalBoundedString(value, 8, "senderInitials", "sender_initials") ??
            initialsFromName(senderName),
        senderAvatarUrl: optionalHttpsUrl(value, "senderAvatarUrl", "sender_avatar_url"),
        body,
        createdAt: requireDateString(value, "Date message", "createdAt", "created_at"),
        updatedAt: optionalDateString(value, "Date de modification du message", "updatedAt", "updated_at"),
        status: normalizeMessageStatus(readUnknown(value, "status")),
        isMine: booleanOrDefault(value, false, "isMine", "is_mine"),
        replyToMessageId: optionalBoundedString(value, 256, "replyToMessageId", "reply_to_message_id"),
        replyPreview: normalizeReplyPreview(readUnknown(value, "replyPreview", "reply_preview")),
        attachments,
        reactions,
        mentionedUserIds: optionalStringArray(value, 500, 256, "mentionedUserIds", "mentioned_user_ids"),
        retryCount: nonNegativeInteger(value, 0, "retryCount", "retry_count"),
        errorCode: optionalBoundedString(value, 160, "errorCode", "error_code"),
        deletedAt: optionalDateString(value, "Date de suppression du message", "deletedAt", "deleted_at")
    };
}
function normalizeMessagePage(value) {
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
    if (typeof cursor === "string" && cursor.length > 2_048) {
        throw new WireValidationError("Curseur de messages trop long.");
    }
    return {
        items: items.map(normalizeChatMessage),
        nextCursor: typeof cursor === "string" && cursor.trim() ? cursor.trim() : null
    };
}
