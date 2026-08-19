import { useSyncExternalStore } from "react";
import type { Conversation } from "../types/messaging";

let revision = 0;
const listeners = new Set<() => void>();
const hiddenAt = new Map<string, number>();
const removedAt = new Map<string, number>();
const seenMention = new Map<string, string>();
const pinnedIds = new Set<string>();
const notify = () => { revision += 1; listeners.forEach((listener) => listener()); };
const latestTimestamp = (conversation: Conversation) => Date.parse(conversation.lastMessageAt ?? "") || 0;
const signature = (conversation: Conversation) => `${conversation.mentionCount ?? 0}:${conversation.lastMessageAt ?? ""}`;

export function useConversationPresentationRevision() {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => revision, () => revision);
}
export function hidePrivateConversation(conversation: Conversation) {
  hiddenAt.set(conversation.id, latestTimestamp(conversation) || Date.now());
  removedAt.delete(conversation.id);
  notify();
}
export function removePrivateConversation(id: string) {
  removedAt.set(id, Date.now());
  hiddenAt.delete(id);
  pinnedIds.delete(id);
  notify();
}
export function restorePrivateConversation(id: string) {
  const removed = removedAt.delete(id);
  const hidden = hiddenAt.delete(id);
  if (removed || hidden) notify();
}
export function isPrivateConversationPresented(conversation: Conversation) {
  const cutoff = Math.max(hiddenAt.get(conversation.id) ?? 0, removedAt.get(conversation.id) ?? 0);
  if (!cutoff) return true;
  if (latestTimestamp(conversation) > cutoff) {
    hiddenAt.delete(conversation.id);
    removedAt.delete(conversation.id);
    return true;
  }
  return false;
}
export function markConversationMentionSeen(conversation: Conversation) {
  seenMention.set(conversation.id, signature(conversation));
  notify();
}
export function isConversationMentionSeen(conversation: Conversation) {
  return seenMention.get(conversation.id) === signature(conversation);
}
export function toggleConversationPinned(id: string) {
  if (pinnedIds.has(id)) pinnedIds.delete(id);
  else pinnedIds.add(id);
  notify();
}
export function isConversationPinned(id: string) {
  return pinnedIds.has(id);
}
export function pinnedConversationIds(): string[] {
  return [...pinnedIds];
}
