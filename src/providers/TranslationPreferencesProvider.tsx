import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  detectSystemLanguage,
  normalizeLanguageCode,
  type SupportedLanguage
} from "../i18n/languages";
import { useSession } from "./SessionProvider";

interface TranslationPreferences {
  enabled: boolean;
  targetLanguage: SupportedLanguage;
}

interface TranslationPreferencesContextValue extends TranslationPreferences {
  ready: boolean;
  setEnabled: (enabled: boolean) => Promise<void>;
  setTargetLanguage: (language: SupportedLanguage) => Promise<void>;
}

const TranslationPreferencesContext =
  createContext<TranslationPreferencesContextValue | null>(null);

function storageKey(userId: string): string {
  return `connexio.translation.preferences.${userId || "device"}`;
}

async function readPreference(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function writePreference(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Les préférences restent actives pour la session courante.
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export function TranslationPreferencesProvider({
  children
}: PropsWithChildren) {
  const { currentUser } = useSession();
  const [enabled, setEnabledState] = useState(true);
  const [targetLanguage, setTargetLanguageState] = useState<SupportedLanguage>(
    detectSystemLanguage("fr")
  );
  const [ready, setReady] = useState(false);
  const key = storageKey(currentUser.id);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void readPreference(key)
      .then((stored) => {
        if (cancelled || !stored) return;
        const parsed = JSON.parse(stored) as Partial<TranslationPreferences>;
        if (typeof parsed.enabled === "boolean") setEnabledState(parsed.enabled);
        if (parsed.targetLanguage) {
          setTargetLanguageState(
            normalizeLanguageCode(parsed.targetLanguage, detectSystemLanguage("fr"))
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const persist = useCallback(
    async (next: TranslationPreferences) => {
      await writePreference(key, JSON.stringify(next));
    },
    [key]
  );

  const setEnabled = useCallback(
    async (nextEnabled: boolean) => {
      setEnabledState(nextEnabled);
      await persist({ enabled: nextEnabled, targetLanguage });
    },
    [persist, targetLanguage]
  );

  const setTargetLanguage = useCallback(
    async (language: SupportedLanguage) => {
      setTargetLanguageState(language);
      await persist({ enabled, targetLanguage: language });
    },
    [enabled, persist]
  );

  const value = useMemo<TranslationPreferencesContextValue>(
    () => ({ enabled, targetLanguage, ready, setEnabled, setTargetLanguage }),
    [enabled, ready, setEnabled, setTargetLanguage, targetLanguage]
  );

  return (
    <TranslationPreferencesContext.Provider value={value}>
      {children}
    </TranslationPreferencesContext.Provider>
  );
}

export function useTranslationPreferences(): TranslationPreferencesContextValue {
  const context = useContext(TranslationPreferencesContext);
  if (!context) {
    throw new Error(
      "useTranslationPreferences doit être utilisé dans TranslationPreferencesProvider."
    );
  }
  return context;
}
