import { apiRequest } from "@/services/api/httpClient";
import type {
  CursorPage,
  MessagingApi,
  SendMessageInput
} from "@/services/api/contracts";
import type {
  ChatMessage,
  Conversation,
  PushTokenRegistration
} from "@/types/messaging";

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
      `/v1/conversations/${conversationId}/messages${query}`,
      {
        token: this.accessToken
      }
    );
  }

  sendMessage(
    conversationId: string,
    input: SendMessageInput
  ): Promise<ChatMessage> {
    return apiRequest<ChatMessage>(
      `/v1/conversations/${conversationId}/messages`,
      {
        method: "POST",
        token: this.accessToken,
        body: JSON.stringify({
          client_message_id: input.clientMessageId,
          body: input.body,
          reply_to_message_id: input.replyToMessageId
        })
      }
    );
  }

  async markConversationRead(
    conversationId: string,
    lastReadMessageId: string
  ): Promise<void> {
    await apiRequest(`/v1/conversations/${conversationId}/read`, {
      method: "POST",
      token: this.accessToken,
      body: JSON.stringify({
        last_read_message_id: lastReadMessageId
      })
    });
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
}
