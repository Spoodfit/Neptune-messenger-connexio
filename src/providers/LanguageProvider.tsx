import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

import { readLanguagePreference, writeLanguagePreference } from "../i18n/languagePreference";
import { detectSystemLanguage, normalizeLanguageCode, type SupportedLanguage } from "../i18n/languages";
import { setCurrentUiLocale, uiLocaleTagFor } from "../i18n/uiLocale";
import { setTranslationRequestLanguage } from "../i18n/translationLocale";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "../i18n/uiTranslations";
import { translateConnexioUiText } from "../i18n/uiTranslator";

export type ConnexioLanguageMode = "system" | SupportedLanguage;

interface LanguageContextValue {
  mode: ConnexioLanguageMode;
  /** Target language used by automatic content translation. */
  language: SupportedLanguage;
  /** Bundled UI locale used only to render Connexio's own interface. */
  uiLanguage: SupportedUiLanguage;
  /** BCP-47 locale used by dates, times and numbers displayed by the UI. */
  localeTag: string;
  setLanguageMode: (mode: ConnexioLanguageMode) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function decodeStoredMode(raw: string | null, systemLanguage: SupportedLanguage): ConnexioLanguageMode | null {
  if (!raw) return null;
  let value: unknown = raw;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    // Current preference is a plain mode; the previous store used JSON.stringify.
  }
  if (value === "system") return "system";
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = normalizeLanguageCode(value, systemLanguage);
  return normalizeUiLanguageCode(normalized, normalized === "fr" ? "fr" : "en");
}

function readInitialMode(systemLanguage: SupportedLanguage): ConnexioLanguageMode {
  return decodeStoredMode(readLanguagePreference(), systemLanguage) ?? "system";
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
  const localeTag = uiLocaleTagFor(uiLanguage);

  // UI formatting and content translation helpers are module-level by design.
  // Synchronize both before descendants render so a cold start/reload never
  // paints content in the previous/default language before a later effect.
  setCurrentUiLocale(uiLanguage);
  setTranslationRequestLanguage(language);

  const setLanguageMode = useCallback((next: ConnexioLanguageMode) => {
    const normalized: ConnexioLanguageMode = next === "system"
      ? "system"
      : normalizeUiLanguageCode(
          normalizeLanguageCode(next, language),
          language === "fr" ? "fr" : "en"
        );

    writeLanguagePreference(normalized);
    setMode(normalized);

    setTranslationRequestLanguage(
      normalized === "system" ? systemLanguage : normalizeLanguageCode(normalized, systemLanguage)
    );
  }, [language, systemLanguage]);

  const t = useCallback((text: string) => translateConnexioUiText(text, uiLanguage), [uiLanguage]);
  const value = useMemo(
    () => ({ mode, language, uiLanguage, localeTag, setLanguageMode, t }),
    [language, localeTag, mode, setLanguageMode, t, uiLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useAppLanguage doit être utilisé dans LanguageProvider.");
  return context;
}
