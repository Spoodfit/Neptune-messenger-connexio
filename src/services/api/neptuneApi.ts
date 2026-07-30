import { ApiError, apiRequest } from "./httpClient";
import type {
  CursorPage,
  MessagingApi,
  SendMessageInput
} from "./contracts";
import {
  refreshSessionAccessToken,
  resolveSessionAccessToken
} from "../auth/sessionRuntime";
import type {
  ChatMessage,
  Conversation,
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
    if (!token) throw new ApiError("Session Neptune absente.", 401);

    try {
      return await apiRequest<T>(path, { ...options, token });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const refreshedToken = await refreshSessionAccessToken();
      if (!refreshedToken) throw error;
      return apiRequest<T>(path, { ...options, token: refreshedToken });
    }
  }

  listConversations(): Promise<Conversation[]> {
    return this.request<Conversation[]>("/v1/conversations");
  }

  listMessages(
    conversationId: string,
    cursor?: string
  ): Promise<CursorPage<ChatMessage>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request<CursorPage<ChatMessage>>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/messages${query}`
    );
  }

  sendMessage(
    conversationId: string,
    input: SendMessageInput
  ): Promise<ChatMessage> {
    return this.request<ChatMessage>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        headers: { "Idempotency-Key": input.clientMessageId },
        body: JSON.stringify({
          client_message_id: input.clientMessageId,
          body: input.body,
          reply_to_message_id: input.replyToMessageId ?? null
        })
      }
    );
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

  requestRealtimeTicket(): Promise<RealtimeTicket> {
    return this.request<RealtimeTicket>("/v1/realtime/ticket", {
      method: "POST"
    });
  }
}
