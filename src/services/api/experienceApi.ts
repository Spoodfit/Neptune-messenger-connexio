import type {
  GroupDraft,
  HighlightKind,
  HighlightLocation,
  HighlightMedia,
  HighlightPost,
  MapMemberMoment,
  PlaceSuggestion,
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
  location?: HighlightLocation;
}

function groupPayload(draft: GroupDraft) {
  return {
    name: draft.name.trim(),
    description: draft.description.trim(),
    avatar_url: draft.avatarUrl ?? null,
    icon_name: draft.iconName ?? "people",
    allowed_roles: draft.allowedRoles,
    members_can_post: draft.canMembersPost,
    responsible_ids: draft.adminIds ?? [],
    announcement_publisher_ids: draft.announcementPublisherIds ?? [],
    allow_free_discovery: draft.allowFreeDiscovery ?? false
  };
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
        body: JSON.stringify(groupPayload(draft))
      },
      this.fallbackAccessToken
    );
  }

  updateGroup(conversationId: string, draft: GroupDraft): Promise<Conversation> {
    return authenticatedRequest<Conversation>(
      `/v1/groups/${encodeURIComponent(conversationId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(groupPayload(draft))
      },
      this.fallbackAccessToken
    );
  }

  async joinGroup(conversationId: string): Promise<void> {
    await authenticatedRequest(
      `/v1/groups/${encodeURIComponent(conversationId)}/join`,
      { method: "POST" },
      this.fallbackAccessToken
    );
  }

  async setGroupResponsible(
    conversationId: string,
    memberId: string,
    responsible: boolean
  ): Promise<void> {
    await authenticatedRequest(
      `/v1/groups/${encodeURIComponent(conversationId)}/responsibles/${encodeURIComponent(memberId)}`,
      { method: responsible ? "PUT" : "DELETE" },
      this.fallbackAccessToken
    );
  }

  async removeGroupMember(
    conversationId: string,
    memberId: string
  ): Promise<void> {
    await authenticatedRequest(
      `/v1/groups/${encodeURIComponent(conversationId)}/members/${encodeURIComponent(memberId)}`,
      { method: "DELETE" },
      this.fallbackAccessToken
    );
  }

  async setAnnouncementPublisher(
    conversationId: string,
    memberId: string,
    allowed: boolean
  ): Promise<void> {
    await authenticatedRequest(
      `/v1/groups/${encodeURIComponent(conversationId)}/announcement-publishers/${encodeURIComponent(memberId)}`,
      { method: allowed ? "PUT" : "DELETE" },
      this.fallbackAccessToken
    );
  }

  async setConversationMuted(
    conversationId: string,
    muted: boolean
  ): Promise<void> {
    await authenticatedRequest(
      `/v1/conversations/${encodeURIComponent(conversationId)}/mute`,
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
    const syncTargets =
      input.kind === "besoin"
        ? ["connexio", "business-needs"]
        : input.kind === "offre"
          ? ["connexio", "advantages-committee"]
          : ["connexio"];
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
          location: input.location
            ? {
                place_id: input.location.placeId ?? null,
                label: input.location.label,
                address: input.location.address ?? null,
                latitude: input.location.latitude,
                longitude: input.location.longitude,
                accuracy_radius_meters: input.location.accuracyRadiusMeters
              }
            : null,
          sync_targets: syncTargets
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

  searchPlaces(query: string): Promise<PlaceSuggestion[]> {
    const params = new URLSearchParams({ query: query.trim(), limit: "6" });
    return authenticatedRequest(
      `/v1/places/search?${params.toString()}`,
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
