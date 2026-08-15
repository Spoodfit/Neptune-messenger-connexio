import type {
  AppUser,
  AttachmentKind,
  ContentTranslation,
  Conversation,
  UserRole
} from "./messaging";

export type ConversationFilter = "groups" | "private";
export type HighlightKind = "standard" | "besoin" | "reussite" | "offre";
export type QuickReaction = "❤️" | "🔥" | "👏" | "💡" | "🤝" | "😂";

export interface GroupDraft {
  name: string;
  description: string;
  avatarUrl?: string;
  iconName?: string;
  allowedRoles: UserRole[];
  canMembersPost: boolean;
  adminIds?: string[];
  announcementPublisherIds?: string[];
  allowFreeDiscovery?: boolean;
}

export interface PrivateConversationDraft {
  memberIds: string[];
  name?: string;
}

export interface AttachmentAction {
  kind: AttachmentKind;
  label: string;
  icon: string;
  backendCapability:
    | "media-library"
    | "camera"
    | "document-picker"
    | "location"
    | "contacts";
}

export interface HighlightMedia {
  id: string;
  kind: "photo" | "video" | "audio";
  uri?: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  uploadProgress?: number;
  status?: "local" | "uploading" | "ready" | "failed";
  transcript?: string;
  transcriptStatus?: "pending" | "ready" | "failed";
  transcriptTranslation?: ContentTranslation;
}

export interface HighlightReactionSummary {
  emoji: QuickReaction;
  count: number;
  reactedByCurrentUser: boolean;
}

export interface HighlightComment {
  id: string;
  postId: string;
  author: AppUser;
  body: string;
  createdAt: string;
  parentCommentId?: string;
  mentionedUserIds?: string[];
  reactions: HighlightReactionSummary[];
  sourceLanguage?: string;
  /** Champs traduisibles: body. */
  translation?: ContentTranslation;
}

export interface HighlightLocation {
  label: string;
  placeId?: string;
  address?: string;
  latitude: number;
  longitude: number;
  accuracyRadiusMeters: number;
}

export interface HighlightPost {
  id: string;
  author: AppUser;
  kind: HighlightKind;
  body: string;
  createdAt: string;
  media?: HighlightMedia;
  mentionedUserIds?: string[];
  reactions: HighlightReactionSummary[];
  comments: HighlightComment[];
  shareCount: number;
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracyRadiusMeters: number;
  };
  locationLabel?: string;
  location?: HighlightLocation;
  syncedWithBusinessApp?: boolean;
  syncedWithAdvantagesCommittee?: boolean;
  syncState?: "local" | "queued" | "synced" | "failed";
  sourceLanguage?: string;
  /** Champs traduisibles: body. Les noms/lieux restent canoniques. */
  translation?: ContentTranslation;
}

export interface PlaceSuggestion {
  id: string;
  label: string;
  address?: string;
  latitude: number;
  longitude: number;
}

export interface MapMemberMoment {
  member: AppUser;
  latitude: number;
  longitude: number;
  approximate: boolean;
  recentPostIds: string[];
  lastPublishedAt?: string;
}

export interface CallHistoryItem {
  id: string;
  member: AppUser;
  type: "audio" | "video";
  direction: "incoming" | "outgoing" | "missed";
  occurredAt: string;
  durationSeconds?: number;
}

export interface ExperienceStateSnapshot {
  mutedConversationIds: string[];
  leftConversationIds: string[];
  localConversations: Conversation[];
}
