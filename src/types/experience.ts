import type {
  AppUser,
  AttachmentKind,
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
  kind: "photo" | "video";
  uri?: string;
  durationSeconds?: number;
  uploadProgress?: number;
  status?: "local" | "uploading" | "ready" | "failed";
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
  syncedWithBusinessApp?: boolean;
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
