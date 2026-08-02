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
import type {
  ChatMessage,
  Conversation,
  CreatePollInput,
  PushTokenRegistration,
  RealtimeTicket
} from "../../types/messaging";

interface AuthenticatedRequestOptions extends RequestInit {
  timeoutMs?: number;
}

export class NeptuneMessagingApi implements MessagingApi {
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
            accuracy_radius_meters: attachment.accuracyRadiusMeters ?? null
          }))
        })
      }
    );
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
