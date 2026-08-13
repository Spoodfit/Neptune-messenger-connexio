export type CanonicalUserRole =
  | "visionnaire"
  | "amiral"
  | "capitaine"
  | "legende"
  | "moussaillon"
  | "triton"
  | "allie"
  | "free"
  | "admin";

export type LegacyUserRole =
  | "member"
  | "captain"
  | "admiral"
  | "visionary"
  | "ally";

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

export type MessageTranslationStatus = "pending" | "ready" | "failed";

export interface MessageTranslation {
  targetLanguage: string;
  sourceLanguage?: string;
  body?: string;
  status: MessageTranslationStatus;
  generatedAt?: string;
}

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
  webProfileUrl?: string;
}

export interface EventVoteAlert {
  id: string;
  title: string;
  clubName: string;
  city?: string;
  pendingCount: number;
  webUrl: string;
  closesAt?: string;
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
  /** Membres les plus actifs, ordonnés par activité récente côté serveur. */
  activeMemberIds?: string[];
  ownerId?: string;
  /** Responsables opérationnels du groupe. Visionnaires implicites sur tous les groupes. */
  adminIds?: string[];
  /** Amiraux ou Capitaines explicitement autorisés à publier dans Annonce. */
  announcementPublisherIds?: string[];
  /** Le groupe est visible aux Free, mais l’adhésion exige une montée Triton. */
  allowFreeDiscovery?: boolean;
  muted?: boolean;
  archived?: boolean;
  left?: boolean;
  eventVoteAlert?: EventVoteAlert;
}

export interface MessageAttachment {
  id: string;
  kind: AttachmentKind;
  name: string;
  uri?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  latitude?: number;
  longitude?: number;
  accuracyRadiusMeters?: number;
  uploadProgress?: number;
  status?: "local" | "uploading" | "ready" | "failed";
  transcript?: string;
  transcriptStatus?: "pending" | "ready" | "failed";
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

export interface PollVoter {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  role?: UserRole;
}

export interface PollOption {
  id: string;
  label: string;
  voteCount: number;
  votedByCurrentUser: boolean;
  voterIds?: string[];
  voters?: PollVoter[];
}

export interface MessagePoll {
  id: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  anonymous: boolean;
  totalVotes: number;
  totalVoters?: number;
  closesAt?: string;
  closedAt?: string;
  eventVoteId?: string;
  eventVoteUrl?: string;
}

export interface CreatePollInput {
  question: string;
  options: string[];
  allowMultiple: boolean;
  anonymous: boolean;
  closesAt?: string;
}

export type ModerationCategory =
  | "insult"
  | "harassment"
  | "forced_commercial"
  | "repeated_advertising"
  | "spam"
  | "unsafe";

export interface ModerationDecision {
  allowed: boolean;
  category?: ModerationCategory;
  reason?: string;
  warningLevel?: 1 | 2 | 3;
  suspendedUntil?: string;
  requiresManualReview?: boolean;
}

export type ScheduleFrequency = "once" | "daily" | "weekly" | "monthly";

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  name: string;
  body: string;
  attachments?: MessageAttachment[];
  scheduledFor: string;
  frequency: ScheduleFrequency;
  enabled: boolean;
  createdByUserId: string;
  createdByName?: string;
  updatedByUserId?: string;
  status: "scheduled" | "paused" | "sending" | "sent" | "cancelled" | "failed";
}

export interface ChatMessage {
  id: string;
  clientMessageId?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderAvatarUrl?: string;
  /** Statut Neptune de l’auteur, utilisé pour le contour et le badge. */
  senderRole?: UserRole;
  /** Texte canonique tel qu’il a été écrit par l’auteur. Ne jamais l’écraser par une traduction. */
  body: string;
  /** Langue source détectée côté serveur, au format BCP-47/ISO 639 lorsque disponible. */
  sourceLanguage?: string;
  /** Traduction dérivée pour la langue du lecteur. Le corps original reste dans `body`. */
  translation?: MessageTranslation;
  createdAt: string;
  updatedAt?: string;
  status: MessageStatus;
  isMine: boolean;
  replyToMessageId?: string;
  replyPreview?: ReplyPreview;
  attachments?: MessageAttachment[];
  reactions?: MessageReactionSummary[];
  poll?: MessagePoll;
  mentionedUserIds?: string[];
  retryCount?: number;
  errorCode?: string;
  deletedAt?: string;
  moderation?: ModerationDecision;
  scheduledFor?: string;
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
