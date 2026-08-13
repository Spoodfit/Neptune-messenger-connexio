import { useSyncExternalStore } from "react";
import type { Conversation } from "../types/messaging";

let revision = 0;
const listeners = new Set<() => void>();
const hiddenAt = new Map<string, number>();
const removedIds = new Set<string>();
const seenMention = new Map<string, string>();
const notify = () => { revision += 1; listeners.forEach((listener) => listener()); };
const signature = (conversation: Conversation) => `${conversation.mentionCount ?? 0}:${conversation.lastMessageAt ?? ""}`;

export function useConversationPresentationRevision() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => revision, () => revision);
}
export function hidePrivateConversation(conversation: Conversation) { hiddenAt.set(conversation.id, Date.parse(conversation.lastMessageAt ?? "") || Date.now()); removedIds.delete(conversation.id); notify(); }
export function removePrivateConversation(id: string) { removedIds.add(id); hiddenAt.delete(id); notify(); }
export function restorePrivateConversation(id: string) { const changed = removedIds.delete(id) || hiddenAt.delete(id); if (changed) notify(); }
export function isPrivateConversationPresented(conversation: Conversation) {
  if (removedIds.has(conversation.id)) return false;
  const hidden = hiddenAt.get(conversation.id);
  if (!hidden) return true;
  if ((Date.parse(conversation.lastMessageAt ?? "") || 0) > hidden) { hiddenAt.delete(conversation.id); return true; }
  return false;
}
export function markConversationMentionSeen(conversation: Conversation) { seenMention.set(conversation.id, signature(conversation)); notify(); }
export function isConversationMentionSeen(conversation: Conversation) { return seenMention.get(conversation.id) === signature(conversation); }
