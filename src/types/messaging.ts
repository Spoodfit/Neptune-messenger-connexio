export type CanonicalUserRole =
  | "visionnaire"
  | "amiral"
  | "capitaine"
  | "legende"
  | "moussaillon"
  | "triton"
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
}

export interface Conversation {
  id: string;
  name: string;
  description?: string;
  categoryLabel: string;
  type: ConversationType;
  memberCount: number;
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
  pinnedMessage?: string;
  restricted: boolean;
  allowedRoles?: UserRole[];
  canPost?: boolean;
  avatarUrl?: string;
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
  retryCount?: number;
  errorCode?: string;
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
