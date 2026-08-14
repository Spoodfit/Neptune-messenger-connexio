import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from "react";

import { detectSystemLanguage, normalizeLanguageCode, type SupportedLanguage } from "../i18n/languages";
import { setTranslationRequestLanguage } from "../i18n/translationLocale";
import { createStandaloneStateStore } from "../storage/standaloneStore";

export type ConnexioLanguageMode = "system" | SupportedLanguage;

interface LanguageContextValue {
  mode: ConnexioLanguageMode;
  language: SupportedLanguage;
  setLanguageMode: (mode: ConnexioLanguageMode) => void;
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

  useEffect(() => {
    setTranslationRequestLanguage(language);
  }, [language]);

  const setLanguageMode = (next: ConnexioLanguageMode) => {
    const normalized = next === "system" ? "system" : normalizeLanguageCode(next, language);
    setMode(normalized);
    void store.save("app-language", normalized);
    setTranslationRequestLanguage(normalized === "system" ? detectSystemLanguage("fr") : normalized);
  };

  const value = useMemo(() => ({ mode, language, setLanguageMode }), [language, mode]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useAppLanguage doit être utilisé dans LanguageProvider.");
  return context;
}
