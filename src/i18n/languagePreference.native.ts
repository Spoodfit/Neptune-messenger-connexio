import Storage from "expo-sqlite/kv-store";

const UI_LANGUAGE_PREFERENCE_KEY = "connexio.preferences.ui-language.v2";
const LEGACY_APP_LANGUAGE_KEY = "connexio.standalone.app-language";

/**
 * Native implementation. SQLite KV is synchronous here on purpose: the locale
 * is known before the first interface render and cannot be overwritten by a
 * delayed hydration after the user has just changed it.
 */
export function readLanguagePreference(): string | null {
  try {
    const current = Storage.getItemSync(UI_LANGUAGE_PREFERENCE_KEY);
    if (current) return current;

    const legacy = Storage.getItemSync(LEGACY_APP_LANGUAGE_KEY);
    if (legacy) {
      Storage.setItemSync(UI_LANGUAGE_PREFERENCE_KEY, legacy);
      return legacy;
    }
  } catch {
    // A corrupt/unavailable preference must never prevent Connexio from opening.
  }
  return null;
}

export function writeLanguagePreference(value: string): void {
  try {
    Storage.setItemSync(UI_LANGUAGE_PREFERENCE_KEY, value);
  } catch {
    // The in-memory state still changes immediately. Persistence can recover on
    // a later selection instead of crashing the application.
  }
}
