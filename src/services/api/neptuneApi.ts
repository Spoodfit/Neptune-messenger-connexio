import { ApiError, apiRequest } from "./httpClient";
import type {
  CursorPage,
  MessagingApi,
  SendMessageInput
} from "./contracts";
import { normalizeRealtimeTicket } from "./realtimeTicketWire";
import {
  normalizeChatMessage,
  normalizeConversationList,
  normalizeMessagePage
} from "./wireExtensions";
import {
  refreshSessionAccessToken,
  resolveSessionAccessToken
} from "../auth/sessionRuntime";
import { evaluateModeration } from "../../domain/moderation";
import type {
  ChatMessage,
  Conversation,
  CreatePollInput,
  ModerationDecision,
  PushTokenRegistration,
  RealtimeTicket
} from "../../types/messaging";

interface AuthenticatedRequestOptions extends RequestInit {
  timeoutMs?: number;
}

interface ModerationWire {
  allowed?: unknown;
  category?: unknown;
  reason?: unknown;
  warning_level?: unknown;
  suspended_until?: unknown;
  requires_manual_review?: unknown;
}

function normalizeModeration(payload: ModerationWire): ModerationDecision {
  return {
    allowed: payload.allowed === true,
    category:
      typeof payload.category === "string"
        ? (payload.category as ModerationDecision["category"])
        : undefined,
    reason: typeof payload.reason === "string" ? payload.reason : undefined,
    warningLevel:
      payload.warning_level === 1 ||
      payload.warning_level === 2 ||
      payload.warning_level === 3
        ? payload.warning_level
        : undefined,
    suspendedUntil:
      typeof payload.suspended_until === "string"
        ? payload.suspended_until
        : undefined,
    requiresManualReview: payload.requires_manual_review === true
  };
}

function moderationMessage(decision: ModerationDecision): string {
  const reason = decision.reason ?? "Ce contenu ne respecte pas les règles Neptune.";
  if (decision.warningLevel === 1) {
    return `${reason} Premier avertissement enregistré.`;
  }
  if (decision.warningLevel === 2) {
    return `${reason} Deuxième avertissement : le compte est suspendu pendant 24 heures.`;
  }
  if (decision.warningLevel === 3 || decision.requiresManualReview) {
    return `${reason} Troisième avertissement : le compte reste suspendu jusqu’à validation par un Capitaine, un Amiral ou un Visionnaire.`;
  }
  return reason;
}

export class NeptuneMessagingApi implements MessagingApi {
  private localWarningCount = 0;
  private localSuspendedUntil: number | null = null;
  private localManualSuspension = false;
  private recentSentBodies: string[] = [];

  constructor(private readonly fallbackAccessToken?: string | null) {}

  private async request<T>(
    path: string,
    options: AuthenticatedRequestOptions = {}
  ): Promise<T> {
    const token = await resolveSessionAccessToken(this.fallbackAccessToken);
    try {
      return await apiRequest<T>(path, {
        ...options,
        token,
        credentials: "include"
      });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const refreshedToken = await refreshSessionAccessToken();
      if (!refreshedToken) throw error;
      return apiRequest<T>(path, {
        ...options,
        token: refreshedToken,
        credentials: "include"
      });
    }
  }

  private assertLocalModeration(body: string): void {
    const now = Date.now();
    if (this.localManualSuspension) {
      throw new ApiError(
        "Compte suspendu jusqu’à validation par un Capitaine, un Amiral ou un Visionnaire.",
        403,
        { code: "moderation_manual_suspension" }
      );
    }
    if (this.localSuspendedUntil && this.localSuspendedUntil > now) {
      const remainingMinutes = Math.max(
        1,
        Math.ceil((this.localSuspendedUntil - now) / 60_000)
      );
      throw new ApiError(
        `Compte temporairement suspendu. Réessayez dans environ ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}.`,
        403,
        { code: "moderation_temporary_suspension" }
      );
    }
    if (this.localSuspendedUntil && this.localSuspendedUntil <= now) {
      this.localSuspendedUntil = null;
    }

    const decision = evaluateModeration({
      body,
      recentBodies: this.recentSentBodies,
      warningCount: this.localWarningCount
    });
    if (decision.allowed) return;

    this.localWarningCount = Math.max(
      this.localWarningCount,
      decision.warningLevel ?? this.localWarningCount + 1
    );
    if (decision.suspendedUntil) {
      this.localSuspendedUntil = Date.parse(decision.suspendedUntil);
    }
    if (decision.requiresManualReview || decision.warningLevel === 3) {
      this.localManualSuspension = true;
    }
    throw new ApiError(moderationMessage(decision), 422, {
      code: "moderation_rejected",
      decision
    });
  }

  private async assertServerModeration(
    conversationId: string,
    input: SendMessageInput
  ): Promise<void> {
    try {
      const payload = await this.request<ModerationWire>(
        "/v1/moderation/evaluate",
        {
          method: "POST",
          body: JSON.stringify({
            conversation_id: conversationId,
            body: input.body,
            attachment_names: (input.attachments ?? []).map(
              (attachment) => attachment.name
            )
          })
        }
      );
      const decision = normalizeModeration(payload);
      if (decision.allowed) return;

      this.localWarningCount = Math.max(
        this.localWarningCount,
        decision.warningLevel ?? this.localWarningCount
      );
      if (decision.suspendedUntil) {
        this.localSuspendedUntil = Date.parse(decision.suspendedUntil);
      }
      if (decision.requiresManualReview || decision.warningLevel === 3) {
        this.localManualSuspension = true;
      }
      throw new ApiError(moderationMessage(decision), 422, {
        code: "moderation_rejected",
        decision
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 405 || error.status === 501)
      ) {
        return;
      }
      throw error;
    }
  }

  async listConversations(): Promise<Conversation[]> {
    const payload = await this.request<unknown>("/v1/conversations");
    return normalizeConversationList(payload);
  }

  async listMessages(
    conversationId: string,
    cursor?: string
  ): Promise<CursorPage<ChatMessage>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const payload = await this.request<unknown>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/messages${query}`
    );
    return normalizeMessagePage(payload);
  }

  async sendMessage(
    conversationId: string,
    input: SendMessageInput
  ): Promise<ChatMessage> {
    this.assertLocalModeration(input.body);
    await this.assertServerModeration(conversationId, input);

    const payload = await this.request<unknown>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        headers: { "Idempotency-Key": input.clientMessageId },
        body: JSON.stringify({
          client_message_id: input.clientMessageId,
          body: input.body,
          reply_to_message_id: input.replyToMessageId ?? null,
          mentioned_user_ids: input.mentionedUserIds ?? [],
          attachments: (input.attachments ?? []).map((attachment) => ({
            id: attachment.id,
            kind: attachment.kind,
            name: attachment.name,
            uri: attachment.uri ?? null,
            download_url: attachment.downloadUrl ?? null,
            thumbnail_url: attachment.thumbnailUrl ?? null,
            mime_type: attachment.mimeType ?? null,
            size_bytes: attachment.sizeBytes ?? null,
            duration_seconds: attachment.durationSeconds ?? null,
            width: attachment.width ?? null,
            height: attachment.height ?? null,
            latitude: attachment.latitude ?? null,
            longitude: attachment.longitude ?? null,
            accuracy_radius_meters: attachment.accuracyRadiusMeters ?? null,
            transcript: attachment.transcript ?? null,
            transcript_status: attachment.transcriptStatus ?? null
          }))
        })
      }
    );
    this.recentSentBodies = [...this.recentSentBodies, input.body].slice(-20);
    return normalizeChatMessage(payload);
  }

  async createPoll(
    conversationId: string,
    input: CreatePollInput
  ): Promise<ChatMessage> {
    const payload = await this.request<unknown>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/polls`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": `poll-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`
        },
        body: JSON.stringify({
          question: input.question,
          options: input.options,
          allow_multiple: input.allowMultiple,
          anonymous: input.anonymous,
          closes_at: input.closesAt ?? null
        })
      }
    );
    return normalizeChatMessage(payload);
  }

  async votePoll(
    messageId: string,
    optionId: string,
    active: boolean
  ): Promise<ChatMessage> {
    const payload = await this.request<unknown>(
      active
        ? `/v1/messages/${encodeURIComponent(messageId)}/poll-votes`
        : `/v1/messages/${encodeURIComponent(messageId)}/poll-votes/${encodeURIComponent(optionId)}`,
      {
        method: active ? "POST" : "DELETE",
        body: active ? JSON.stringify({ option_id: optionId }) : undefined
      }
    );
    return normalizeChatMessage(payload);
  }

  async markConversationRead(
    conversationId: string,
    lastReadMessageId: string
  ): Promise<void> {
    await this.request(
      `/v1/conversations/${encodeURIComponent(conversationId)}/read`,
      {
        method: "POST",
        body: JSON.stringify({ last_read_message_id: lastReadMessageId })
      }
    );
  }

  async registerPushToken(
    registration: PushTokenRegistration
  ): Promise<void> {
    await this.request("/v1/devices/push-tokens", {
      method: "POST",
      body: JSON.stringify(registration)
    });
  }

  async unregisterPushToken(token: string): Promise<void> {
    await this.request("/v1/devices/push-tokens/revoke", {
      method: "POST",
      body: JSON.stringify({ token })
    });
  }

  async requestRealtimeTicket(): Promise<RealtimeTicket> {
    const payload = await this.request<unknown>("/v1/realtime/ticket", {
      method: "POST"
    });
    return normalizeRealtimeTicket(payload);
  }
}
