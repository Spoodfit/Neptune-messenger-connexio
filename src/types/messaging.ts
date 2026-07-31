export type CanonicalUserRole =
  | "visionnaire"
  | "amiral"
  | "capitaine"
  | "legende"
  | "moussaillon"
  | "triton"
  | "free"
  | "admin";

export type LegacyUserRole =
  | "member"
  | "captain"
  | "admiral"
  | "visionary";

export type UserRole = CanonicalUserRole | LegacyUserRole;

export type ConversationType =
  | "announcement"
  | "city"
  | "role"
  | "topic"
  | "support"
  | "direct"
  | "small_group";

export type MessageStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type AttachmentKind =
  | "photo"
  | "video"
  | "document"
  | "file"
  | "audio"
  | "location"
  | "contact";

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  company: string;
  city: string;
  role: UserRole;
  roleLabel: string;
  online: boolean;
  avatarUrl?: string;
  phone?: string;
  videoCallEnabled?: boolean;
  lastSeenAt?: string;
}

export interface Conversation {
  id: string;
  name: string;
  description?: string;
  categoryLabel: string;
  type: ConversationType;
  memberCount: number;
  unreadCount: number;
  mentionCount?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  pinnedMessage?: string;
  restricted: boolean;
  allowedRoles?: UserRole[];
  canPost?: boolean;
  canManage?: boolean;
  avatarUrl?: string;
  iconName?: string;
  memberIds?: string[];
  ownerId?: string;
  adminIds?: string[];
  muted?: boolean;
  archived?: boolean;
  left?: boolean;
}

export interface MessageAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  uri?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  uploadProgress?: number;
  status?: "local" | "uploading" | "ready" | "failed";
}

export interface MessageReactionSummary {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
  userIds?: string[];
}

export interface ReplyPreview {
  messageId: string;
  senderName: string;
  body: string;
}

export interface ChatMessage {
  id: string;
  clientMessageId?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderAvatarUrl?: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  status: MessageStatus;
  isMine: boolean;
  replyToMessageId?: string;
  replyPreview?: ReplyPreview;
  attachments?: MessageAttachment[];
  reactions?: MessageReactionSummary[];
  mentionedUserIds?: string[];
  retryCount?: number;
  errorCode?: string;
  deletedAt?: string;
}

export interface PushTokenRegistration {
  token: string;
  provider: "expo" | "apns" | "fcm";
  platform: "ios" | "android";
  appVersion: string;
  deviceName?: string;
}

export interface SessionPayload {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AppUser;
}

export interface RealtimeTicket {
  ticket: string;
  expiresAt: string;
}
