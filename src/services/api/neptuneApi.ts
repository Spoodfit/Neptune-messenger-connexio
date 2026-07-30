import { apiRequest } from "./httpClient";
import type {
  CursorPage,
  MessagingApi,
  SendMessageInput
} from "./contracts";
import type {
  ChatMessage,
  Conversation,
  PushTokenRegistration,
  RealtimeTicket
} from "../../types/messaging";

export class NeptuneMessagingApi implements MessagingApi {
  constructor(private readonly accessToken: string) {}

  listConversations(): Promise<Conversation[]> {
    return apiRequest<Conversation[]>("/v1/conversations", {
      token: this.accessToken
    });
  }

  listMessages(
    conversationId: string,
    cursor?: string
  ): Promise<CursorPage<ChatMessage>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return apiRequest<CursorPage<ChatMessage>>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/messages${query}`,
      { token: this.accessToken }
    );
  }

  sendMessage(
    conversationId: string,
    input: SendMessageInput
  ): Promise<ChatMessage> {
    return apiRequest<ChatMessage>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
      {
        method: "POST",
        token: this.accessToken,
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
    await apiRequest(
      `/v1/conversations/${encodeURIComponent(conversationId)}/read`,
      {
        method: "POST",
        token: this.accessToken,
        body: JSON.stringify({ last_read_message_id: lastReadMessageId })
      }
    );
  }

  async registerPushToken(
    registration: PushTokenRegistration
  ): Promise<void> {
    await apiRequest("/v1/devices/push-tokens", {
      method: "POST",
      token: this.accessToken,
      body: JSON.stringify(registration)
    });
  }

  async unregisterPushToken(token: string): Promise<void> {
    await apiRequest("/v1/devices/push-tokens/revoke", {
      method: "POST",
      token: this.accessToken,
      body: JSON.stringify({ token })
    });
  }

  requestRealtimeTicket(): Promise<RealtimeTicket> {
    return apiRequest<RealtimeTicket>("/v1/realtime/ticket", {
      method: "POST",
      token: this.accessToken
    });
  }
}
