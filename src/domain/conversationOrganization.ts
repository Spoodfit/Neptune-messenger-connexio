import type { Conversation } from "../types/messaging";

export type ConversationSectionKey = string;

export const GROUP_SECTION_LABELS = {
  pinned: "Épinglés",
  clubs: "Clubs",
  management: "Gestion",
  general: "Généraux"
} as const;

export function isPrivateConversationKind(conversation: Conversation): boolean {
  return conversation.type === "direct" || conversation.type === "small_group";
}

export function isAnnouncementConversation(conversation: Conversation): boolean {
  const normalized = conversation.name.trim().toLocaleLowerCase("fr");
  return conversation.type === "announcement" || normalized === "annonce" || normalized === "annonces";
}

export function groupSectionForConversation(conversation: Conversation): "clubs" | "management" | "general" {
  if (conversation.type === "city") return "clubs";
  if (conversation.type === "role") return "management";
  return "general";
}

export function conversationMatchesQuery(conversation: Conversation, query: string): boolean {
  const clean = query.trim().toLocaleLowerCase("fr");
  if (!clean) return true;
  return [conversation.name, conversation.categoryLabel, conversation.description ?? "", conversation.lastMessage ?? ""]
    .join(" ")
    .toLocaleLowerCase("fr")
    .includes(clean);
}

export function conversationRecency(conversation: Conversation): number {
  const timestamp = Date.parse(conversation.lastMessageAt ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function isAnnouncementCollapsed(conversation: Conversation, now = Date.now()): boolean {
  if (!isAnnouncementConversation(conversation)) return false;
  if (conversation.unreadCount > 0 || (conversation.mentionCount ?? 0) > 0) return false;
  const timestamp = conversationRecency(conversation);
  if (!timestamp) return true;
  return now - timestamp > 7 * 24 * 60 * 60 * 1000;
}

export function sortConversationsByPriority(
  conversations: readonly Conversation[],
  isPinned: (id: string) => boolean
): Conversation[] {
  return [...conversations].sort((left, right) => {
    const leftPinned = isPinned(left.id) ? 1 : 0;
    const rightPinned = isPinned(right.id) ? 1 : 0;
    if (leftPinned !== rightPinned) return rightPinned - leftPinned;
    return conversationRecency(right) - conversationRecency(left);
  });
}
