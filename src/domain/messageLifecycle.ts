import type { ChatMessage, MessageAttachment } from "../types/messaging";

interface OptimisticMessageInput {
  clientMessageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderInitials: string;
  senderAvatarUrl?: string;
  body: string;
  createdAt: string;
  replyToMessageId?: string;
  attachments?: MessageAttachment[];
  mentionedUserIds?: string[];
}

export function createOptimisticMessage(
  input: OptimisticMessageInput
): ChatMessage {
  return {
    id: `local-${input.clientMessageId}`,
    clientMessageId: input.clientMessageId,
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderName: input.senderName,
    senderInitials: input.senderInitials,
    senderAvatarUrl: input.senderAvatarUrl,
    body: input.body,
    createdAt: input.createdAt,
    status: "queued",
    isMine: true,
    replyToMessageId: input.replyToMessageId,
    attachments: input.attachments,
    mentionedUserIds: input.mentionedUserIds,
    retryCount: 0
  };
}

export function reconcileServerMessage(
  local: ChatMessage,
  server: ChatMessage
): ChatMessage {
  return {
    ...local,
    ...server,
    clientMessageId: server.clientMessageId ?? local.clientMessageId,
    isMine: local.isMine,
    status:
      server.status === "queued" || server.status === "sending"
        ? "sent"
        : server.status,
    errorCode: undefined
  };
}

export function markMessageSending(message: ChatMessage): ChatMessage {
  return {
    ...message,
    status: "sending",
    errorCode: undefined
  };
}

export function markMessageFailed(
  message: ChatMessage,
  errorCode: string
): ChatMessage {
  return {
    ...message,
    status: "failed",
    errorCode,
    retryCount: (message.retryCount ?? 0) + 1
  };
}

export function queueMessageForRetry(message: ChatMessage): ChatMessage {
  return {
    ...message,
    status: "queued",
    errorCode: undefined
  };
}
