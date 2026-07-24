export type UserRole =
  | "member"
  | "captain"
  | "admiral"
  | "visionary"
  | "admin";

export type ConversationType =
  | "announcement"
  | "city"
  | "role"
  | "topic"
  | "support"
  | "direct";

export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  company: string;
  city: string;
  role: UserRole;
  roleLabel: string;
  online: boolean;
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
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  body: string;
  createdAt: string;
  status: MessageStatus;
  isMine: boolean;
}

export interface PushTokenRegistration {
  token: string;
  provider: "expo" | "apns" | "fcm";
  platform: "ios" | "android";
  appVersion: string;
  deviceName?: string;
}
