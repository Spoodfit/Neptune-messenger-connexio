import type {
  ChatMessage,
  Conversation,
  PushTokenRegistration
} from "@/types/messaging";

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface SendMessageInput {
  clientMessageId: string;
  body: string;
  replyToMessageId?: string;
}

export interface MessagingApi {
  listConversations(): Promise<Conversation[]>;
  listMessages(
    conversationId: string,
    cursor?: string
  ): Promise<CursorPage<ChatMessage>>;
  sendMessage(
    conversationId: string,
    input: SendMessageInput
  ): Promise<ChatMessage>;
  markConversationRead(
    conversationId: string,
    lastReadMessageId: string
  ): Promise<void>;
  registerPushToken(registration: PushTokenRegistration): Promise<void>;
}
