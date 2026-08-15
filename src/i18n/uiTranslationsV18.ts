import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V18: Record<string, TranslationSet> = {
  "Contenu original": { en: "Original content", es: "Contenido original", de: "Originalinhalt", it: "Contenuto originale", pt: "Conteúdo original" }
};

export function translateUiTextV18(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  const translation = UI_TRANSLATIONS_V18[value]?.[locale] ?? UI_TRANSLATIONS_V18[value]?.en;
  return translation ?? value;
}
