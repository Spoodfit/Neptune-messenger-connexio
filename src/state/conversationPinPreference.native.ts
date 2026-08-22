import Storage from "expo-sqlite/kv-store";

const PINNED_CONVERSATIONS_KEY = "connexio.preferences.pinned-conversations.v1";

export function readPinnedConversationIds(): string[] {
  try {
    const value = Storage.getItemSync(PINNED_CONVERSATIONS_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function writePinnedConversationIds(ids: readonly string[]): void {
  try {
    Storage.setItemSync(PINNED_CONVERSATIONS_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    // Une préférence locale indisponible ne doit jamais empêcher la messagerie de s'ouvrir.
  }
}
