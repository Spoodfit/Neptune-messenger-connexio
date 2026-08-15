import Storage from "expo-sqlite/kv-store";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

import { detectSystemLanguage, normalizeLanguageCode, type SupportedLanguage } from "../i18n/languages";
import { setTranslationRequestLanguage } from "../i18n/translationLocale";
import { normalizeUiLanguageCode, translateUiText, type SupportedUiLanguage } from "../i18n/uiTranslations";

export type ConnexioLanguageMode = "system" | SupportedLanguage;

interface LanguageContextValue {
  mode: ConnexioLanguageMode;
  /** Target language used by automatic message translation. */
  language: SupportedLanguage;
  /** Bundled UI locale used only to render Connexio's own interface. */
  uiLanguage: SupportedUiLanguage;
  setLanguageMode: (mode: ConnexioLanguageMode) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/*
 * App language is a device preference, not session data. Keep it outside the
 * standalone session store so signing out never resets the interface language.
 * The legacy key is read once to migrate users who already selected a language.
 */
const UI_LANGUAGE_PREFERENCE_KEY = "connexio.preferences.ui-language.v2";
const LEGACY_APP_LANGUAGE_KEY = "connexio.standalone.app-language";

function decodeStoredMode(raw: string | null, systemLanguage: SupportedLanguage): ConnexioLanguageMode | null {
  if (!raw) return null;
  let value: unknown = raw;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    // v2 stores the plain mode; legacy storage used JSON.stringify.
  }
  if (value === "system") return "system";
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = normalizeLanguageCode(value, systemLanguage);
  return normalizeUiLanguageCode(normalized, normalized === "fr" ? "fr" : "en");
}

function readInitialMode(systemLanguage: SupportedLanguage): ConnexioLanguageMode {
  try {
    const current = decodeStoredMode(Storage.getItemSync(UI_LANGUAGE_PREFERENCE_KEY), systemLanguage);
    if (current) return current;

    const legacy = decodeStoredMode(Storage.getItemSync(LEGACY_APP_LANGUAGE_KEY), systemLanguage);
    if (legacy) {
      Storage.setItemSync(UI_LANGUAGE_PREFERENCE_KEY, legacy);
      return legacy;
    }
  } catch {
    // A storage failure must never prevent Connexio from starting.
  }
  return "system";
}

function persistMode(mode: ConnexioLanguageMode): void {
  try {
    Storage.setItemSync(UI_LANGUAGE_PREFERENCE_KEY, mode);
  } catch {
    // The in-memory change still applies immediately; the next launch falls back
    // to the previous persisted preference instead of breaking the application.
  }
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [systemLanguage, setSystemLanguage] = useState<SupportedLanguage>(() => detectSystemLanguage("fr"));
  const [mode, setMode] = useState<ConnexioLanguageMode>(() => readInitialMode(systemLanguage));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const next = detectSystemLanguage("fr");
      setSystemLanguage((current) => current === next ? current : next);
    });
    return () => subscription.remove();
  }, []);

  const language = mode === "system" ? systemLanguage : normalizeLanguageCode(mode, systemLanguage);
  const uiLanguage = normalizeUiLanguageCode(language, language === "fr" ? "fr" : "en");

  useEffect(() => {
    setTranslationRequestLanguage(language);
  }, [language]);

  const setLanguageMode = useCallback((next: ConnexioLanguageMode) => {
    const normalized: ConnexioLanguageMode = next === "system"
      ? "system"
      : normalizeUiLanguageCode(
          normalizeLanguageCode(next, language),
          language === "fr" ? "fr" : "en"
        );

    // Persist first with the synchronous SQLite KV API. This removes the native
    // race where a pending async load could overwrite a language just selected.
    persistMode(normalized);
    setMode(normalized);

    // Keep the already-working message translation behaviour intact. UI locale
    // rendering is separate, but the selected language remains the translation
    // target unless the user follows the phone language.
    setTranslationRequestLanguage(
      normalized === "system" ? systemLanguage : normalizeLanguageCode(normalized, systemLanguage)
    );
  }, [language, systemLanguage]);

  const t = useCallback((text: string) => translateUiText(text, uiLanguage), [uiLanguage]);
  const value = useMemo(
    () => ({ mode, language, uiLanguage, setLanguageMode, t }),
    [language, mode, setLanguageMode, t, uiLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useAppLanguage doit être utilisé dans LanguageProvider.");
  return context;
}
