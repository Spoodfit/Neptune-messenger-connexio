import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

function presentWord(count: number, locale: SupportedUiLanguage): string {
  if (locale === "es") return count === 1 ? "presente" : "presentes";
  if (locale === "de") return "anwesend";
  if (locale === "it") return count === 1 ? "presente" : "presenti";
  if (locale === "pt") return count === 1 ? "presente" : "presentes";
  return "present";
}

function hereWord(locale: SupportedUiLanguage): string {
  if (locale === "es") return "aquí";
  if (locale === "de") return "hier";
  if (locale === "it") return "qui";
  if (locale === "pt") return "aqui";
  return "here";
}

export function translateCoworkingUiPattern(value: string, language: SupportedLanguage | string): string {
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr" || !value) return value;

  const presence = value.match(/^(\d+) présents?$/u);
  if (presence) {
    const count = Number(presence[1]);
    return `${presence[1]} ${presentWord(count, locale)}`;
  }

  const room = value.match(/^(\d+) ici(?: · (.+))?$/u);
  if (room) return `${room[1]} ${hereWord(locale)}${room[2] ? ` · ${room[2]}` : ""}`;

  return value;
}
