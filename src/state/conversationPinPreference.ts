const PINNED_CONVERSATIONS_KEY = "connexio.preferences.pinned-conversations.v1";

export function readPinnedConversationIds(): string[] {
  try {
    if (typeof window === "undefined") return [];
    const value = window.localStorage.getItem(PINNED_CONVERSATIONS_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writePinnedConversationIds(ids: readonly string[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PINNED_CONVERSATIONS_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // La préférence reste fonctionnelle en mémoire si le stockage navigateur est indisponible.
  }
}
