const UI_LANGUAGE_PREFERENCE_KEY = "connexio.preferences.ui-language.v2";

type BrowserStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

function getBrowserStorage(): BrowserStorage | null {
  if (typeof globalThis === "undefined") return null;
  try {
    return (globalThis as { localStorage?: BrowserStorage }).localStorage ?? null;
  } catch {
    return null;
  }
}

/** Web/default implementation. Never imports expo-sqlite, so static web export stays portable. */
export function readLanguagePreference(): string | null {
  try {
    return getBrowserStorage()?.getItem(UI_LANGUAGE_PREFERENCE_KEY) ?? null;
  } catch {
    return null;
  }
}

export function writeLanguagePreference(value: string): void {
  try {
    getBrowserStorage()?.setItem(UI_LANGUAGE_PREFERENCE_KEY, value);
  } catch {
    // Preference persistence must never block the UI update.
  }
}
