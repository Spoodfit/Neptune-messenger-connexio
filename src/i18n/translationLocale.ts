import {
  detectSystemLanguage,
  normalizeLanguageCode,
  type SupportedLanguage
} from "./languages";

let requestLanguage: SupportedLanguage = detectSystemLanguage("fr");

export function getTranslationRequestLanguage(): SupportedLanguage {
  return requestLanguage;
}

export function setTranslationRequestLanguage(value: unknown): SupportedLanguage {
  requestLanguage = normalizeLanguageCode(value, requestLanguage);
  return requestLanguage;
}

export function withTranslationLanguageHeader(
  headers?: HeadersInit
): Headers {
  const next = new Headers(headers);
  if (!next.has("Accept-Language")) {
    next.set("Accept-Language", requestLanguage);
  }
  return next;
}
