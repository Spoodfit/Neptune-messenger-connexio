import type {
  GroupDraft,
  HighlightKind,
  HighlightMedia,
  HighlightPost,
  MapMemberMoment,
  QuickReaction
} from "../../types/experience";
import type {
  AppUser,
  Conversation,
  MessageAttachment
} from "../../types/messaging";
import { authenticatedRequest } from "./authenticatedRequest";

export interface CreateHighlightInput {
  kind: HighlightKind;
  body: string;
  media?: HighlightMedia;
  mentionedUserIds?: string[];
  coordinates?: HighlightPost["coordinates"];
}

export interface StartCallResponse {
  id: string;
  joinUrl: string;
  expiresAt?: string;
}

export class NeptuneExperienceApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  listMembers(query?: string): Promise<AppUser[]> {
    const params = new URLSearchParams({ visible: "true" });
    if (query?.trim()) params.set("query", query.trim());
    return authenticatedRequest<AppUser[]>(
      `/v1/members?${params.toString()}`,
      {},
      this.fallbackAccessToken
    );
  }

  createPrivateConversation(
    memberIds: string[],
    name?: string
  ): Promise<Conversation> {
    const path =
      memberIds.length === 1
        ? "/v1/conversations/direct"
        : "/v1/conversations/private-group";
    return authenticatedRequest<Conversation>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ member_ids: memberIds, name: name || null })
      },
      this.fallbackAccessToken
    );
  }

  createGroup(draft: GroupDraft): Promise<Conversation> {
    return authenticatedRequest<Conversation>(
      "/v1/groups",
      {
        method: "POST",
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
          avatar_url: draft.avatarUrl ?? null,
          icon_name: draft.iconName ?? "people",
          allowed_roles: draft.allowedRoles,
          members_can_post: draft.canMembersPost
        })
      },
      this.fallbackAccessToken
    );
  }

  updateGroup(conversationId: string, draft: GroupDraft): Promise<Conversation> {
    return authenticatedRequest<Conversation>(
      `/v1/groups/${encodeURIComponent(conversationId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
          avatar_url: draft.avatarUrl ?? null,
          icon_name: draft.iconName ?? "people",
          allowed_roles: draft.allowedRoles,
          members_can_post: draft.canMembersPost
        })
      },
      this.fallbackAccessToken
    );
  }

  async setConversationMuted(
    conversationId: string,
    muted: boolean
  ): Promise<void> {
    await authenticatedRequest(
      `/v1/groups/${encodeURIComponent(conversationId)}/mute`,
      { method: muted ? "POST" : "DELETE" },
      this.fallbackAccessToken
    );
  }

  async leaveGroup(conversationId: string): Promise<void> {
    await authenticatedRequest(
      `/v1/groups/${encodeURIComponent(conversationId)}/leave`,
      { method: "POST" },
      this.fallbackAccessToken
    );
  }

  async reactToMessage(
    messageId: string,
    emoji: string,
    active: boolean
  ): Promise<void> {
    await authenticatedRequest(
      active
        ? `/v1/messages/${encodeURIComponent(messageId)}/reactions`
        : `/v1/messages/${encodeURIComponent(messageId)}/reactions/${encodeURIComponent(emoji)}`,
      {
        method: active ? "POST" : "DELETE",
        body: active ? JSON.stringify({ emoji }) : undefined
      },
      this.fallbackAccessToken
    );
  }

  listHighlights(
    cursor?: string
  ): Promise<{ items: HighlightPost[]; nextCursor: string | null }> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return authenticatedRequest(
      `/v1/highlights${query}`,
      {},
      this.fallbackAccessToken
    );
  }

  createHighlight(input: CreateHighlightInput): Promise<HighlightPost> {
    return authenticatedRequest<HighlightPost>(
      "/v1/highlights",
      {
        method: "POST",
        headers: {
          "Idempotency-Key": `highlight-${Date.now()}-${Math.random().toString(36).slice(2)}`
        },
        body: JSON.stringify({
          kind: input.kind,
          body: input.body,
          media_id: input.media?.id ?? null,
          mentioned_user_ids: input.mentionedUserIds ?? [],
          coordinates: input.coordinates ?? null,
          sync_targets:
            input.kind === "besoin"
              ? ["connexio", "business"]
              : ["connexio"]
        })
      },
      this.fallbackAccessToken
    );
  }

  async reactToHighlight(
    postId: string,
    emoji: QuickReaction,
    active: boolean
  ): Promise<void> {
    await authenticatedRequest(
      active
        ? `/v1/highlights/${encodeURIComponent(postId)}/reactions`
        : `/v1/highlights/${encodeURIComponent(postId)}/reactions/${encodeURIComponent(emoji)}`,
      {
        method: active ? "POST" : "DELETE",
        body: active ? JSON.stringify({ emoji }) : undefined
      },
      this.fallbackAccessToken
    );
  }

  addComment(
    postId: string,
    body: string,
    parentCommentId?: string,
    mentionedUserIds: string[] = []
  ): Promise<HighlightPost> {
    const path = parentCommentId
      ? `/v1/comments/${encodeURIComponent(parentCommentId)}/replies`
      : `/v1/highlights/${encodeURIComponent(postId)}/comments`;
    return authenticatedRequest<HighlightPost>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ body, mentioned_user_ids: mentionedUserIds })
      },
      this.fallbackAccessToken
    );
  }

  async reactToComment(
    commentId: string,
    emoji: QuickReaction,
    active: boolean
  ): Promise<void> {
    await authenticatedRequest(
      active
        ? `/v1/comments/${encodeURIComponent(commentId)}/reactions`
        : `/v1/comments/${encodeURIComponent(commentId)}/reactions/${encodeURIComponent(emoji)}`,
      {
        method: active ? "POST" : "DELETE",
        body: active ? JSON.stringify({ emoji }) : undefined
      },
      this.fallbackAccessToken
    );
  }

  shareHighlight(
    postId: string
  ): Promise<{ url: string; shareCount: number }> {
    return authenticatedRequest(
      `/v1/highlights/${encodeURIComponent(postId)}/share`,
      { method: "POST" },
      this.fallbackAccessToken
    );
  }

  listMapMoments(bounds?: string, zoom?: number): Promise<MapMemberMoment[]> {
    const query = new URLSearchParams();
    if (bounds) query.set("bounds", bounds);
    if (typeof zoom === "number") query.set("zoom", String(zoom));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return authenticatedRequest(
      `/v1/map/moments${suffix}`,
      {},
      this.fallbackAccessToken
    );
  }

  async updateLocation(
    latitude: number,
    longitude: number,
    accuracyRadiusMeters: number
  ): Promise<void> {
    await authenticatedRequest(
      "/v1/me/location",
      {
        method: "PUT",
        body: JSON.stringify({
          latitude,
          longitude,
          accuracy_radius_meters: accuracyRadiusMeters
        })
      },
      this.fallbackAccessToken
    );
  }

  async deleteLocation(): Promise<void> {
    await authenticatedRequest(
      "/v1/me/location",
      { method: "DELETE" },
      this.fallbackAccessToken
    );
  }

  startCall(
    memberId: string,
    type: "audio" | "video"
  ): Promise<StartCallResponse> {
    return authenticatedRequest(
      "/v1/calls",
      {
        method: "POST",
        body: JSON.stringify({ member_id: memberId, type })
      },
      this.fallbackAccessToken
    );
  }

  async reportContent(
    targetType: "message" | "profile" | "group" | "highlight" | "comment",
    targetId: string,
    reason: string
  ): Promise<void> {
    await authenticatedRequest(
      "/v1/reports",
      {
        method: "POST",
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          reason
        })
      },
      this.fallbackAccessToken
    );
  }

  async blockMember(memberId: string): Promise<void> {
    await authenticatedRequest(
      `/v1/me/blocked-users/${encodeURIComponent(memberId)}`,
      { method: "PUT" },
      this.fallbackAccessToken
    );
  }
}

export function attachmentIds(
  attachments: readonly MessageAttachment[]
): string[] {
  return attachments
    .filter((attachment) => attachment.status === "ready")
    .filter(
      (attachment) =>
        attachment.kind !== "location" && attachment.kind !== "contact"
    )
    .map((attachment) => attachment.id);
}
