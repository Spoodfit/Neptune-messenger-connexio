import type { Conversation } from "../types/messaging";

export function isPrivateConversation(conversation: Conversation): boolean {
  return (
    conversation.type === "direct" || conversation.type === "small_group"
  );
}

export function isGroupConversation(conversation: Conversation): boolean {
  return !isPrivateConversation(conversation);
}
