import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

const UI_LOCALE_TAGS: Record<SupportedUiLanguage, string> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT"
};

let currentUiLocaleTag = UI_LOCALE_TAGS.fr;

/** Synchronously updated by LanguageProvider before localized screens render. */
export function setCurrentUiLocale(language: string): string {
  const locale = normalizeUiLanguageCode(language, "fr");
  currentUiLocaleTag = UI_LOCALE_TAGS[locale];
  return currentUiLocaleTag;
}

export function getCurrentUiLocaleTag(): string {
  return currentUiLocaleTag;
}

export function uiLocaleTagFor(language: string): string {
  return UI_LOCALE_TAGS[normalizeUiLanguageCode(language, "fr")];
}
