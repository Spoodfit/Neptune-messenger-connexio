import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { detectSystemLanguage, normalizeLanguageCode, type SupportedLanguage } from "../i18n/languages";
import { setTranslationRequestLanguage } from "../i18n/translationLocale";
import { normalizeUiLanguageCode, translateUiText, type SupportedUiLanguage } from "../i18n/uiTranslations";
import { createStandaloneStateStore } from "../storage/standaloneStore";

export type ConnexioLanguageMode = "system" | SupportedLanguage;

interface LanguageContextValue {
  mode: ConnexioLanguageMode;
  /** Target language used by automatic message translation. */
  language: SupportedLanguage;
  /** Bundled UI locale. Unsupported legacy/system locales fall back to English. */
  uiLanguage: SupportedUiLanguage;
  setLanguageMode: (mode: ConnexioLanguageMode) => void;
  t: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: PropsWithChildren) {
  const store = useMemo(() => createStandaloneStateStore(), []);
  const systemLanguage = detectSystemLanguage("fr");
  const [mode, setMode] = useState<ConnexioLanguageMode>("system");

  useEffect(() => {
    let cancelled = false;
    void store.load<string>("app-language").then((saved) => {
      if (cancelled || !saved) return;
      setMode(saved === "system" ? "system" : normalizeLanguageCode(saved, systemLanguage));
    });
    return () => { cancelled = true; };
  }, [store, systemLanguage]);

  const language = mode === "system" ? systemLanguage : normalizeLanguageCode(mode, systemLanguage);
  const uiLanguage = normalizeUiLanguageCode(language, language === "fr" ? "fr" : "en");

  useEffect(() => {
    setTranslationRequestLanguage(language);
  }, [language]);

  const setLanguageMode = useCallback((next: ConnexioLanguageMode) => {
    const normalized = next === "system" ? "system" : normalizeLanguageCode(next, language);
    setMode(normalized);
    void store.save("app-language", normalized);
    setTranslationRequestLanguage(normalized === "system" ? detectSystemLanguage("fr") : normalized);
  }, [language, store]);

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
