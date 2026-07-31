import type {
  ChatMessage,
  Conversation,
  MessageAttachment,
  PushTokenRegistration,
  RealtimeTicket,
  SessionPayload
} from "../../types/messaging";

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface SendMessageInput {
  clientMessageId: string;
  body: string;
  replyToMessageId?: string;
  attachments?: MessageAttachment[];
  mentionedUserIds?: string[];
}

export interface SessionApi {
  exchangeOneTimeCode(code: string, deviceId: string): Promise<SessionPayload>;
  refreshSession(refreshToken: string): Promise<SessionPayload>;
  revokeSession(refreshToken: string): Promise<void>;
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
  unregisterPushToken(token: string): Promise<void>;
  requestRealtimeTicket(): Promise<RealtimeTicket>;
}
