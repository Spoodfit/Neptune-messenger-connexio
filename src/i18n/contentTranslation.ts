import { isSameLanguage, SUPPORTED_LANGUAGES } from "./languages";
import { getTranslationRequestLanguage } from "./translationLocale";
import type {
  ContentTranslation,
  MessageTranslation,
  PollTranslation
} from "../types/messaging";

type RuntimeTranslation = ContentTranslation & {
  target_language?: string;
  source_language?: string;
  generated_at?: string;
  body?: string;
  question?: string;
  options?: Record<string, string>;
};

function runtimeTarget(translation?: ContentTranslation): string | undefined {
  const value = translation as RuntimeTranslation | undefined;
  return value?.targetLanguage ?? value?.target_language;
}

function runtimeField(translation: ContentTranslation | undefined, field: string): string | undefined {
  if (!translation) return undefined;
  const runtime = translation as RuntimeTranslation;
  const direct = field === "body"
    ? (runtime as MessageTranslation).body
    : field === "question"
      ? runtime.question
      : undefined;
  const value = translation.fields?.[field] ?? direct;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function contentTranslationTargetsViewer(
  translation?: ContentTranslation,
  viewerLanguage = getTranslationRequestLanguage()
): boolean {
  const target = runtimeTarget(translation);
  return Boolean(
    translation &&
      translation.status === "ready" &&
      (!target || isSameLanguage(target, viewerLanguage))
  );
}

export function translatedContentField(
  original: string | undefined,
  translation: ContentTranslation | undefined,
  field: string,
  viewerLanguage = getTranslationRequestLanguage(),
  showOriginal = false
): string | undefined {
  if (!original || showOriginal || !contentTranslationTargetsViewer(translation, viewerLanguage)) {
    return original;
  }
  const translated = runtimeField(translation, field);
  return translated && translated !== original.trim() ? translated : original;
}

export function translatedPollQuestion(
  original: string,
  translation: PollTranslation | undefined,
  viewerLanguage = getTranslationRequestLanguage(),
  showOriginal = false
): string {
  if (showOriginal || !contentTranslationTargetsViewer(translation, viewerLanguage)) return original;
  const translated = translation?.question?.trim() ?? runtimeField(translation, "question");
  return translated && translated !== original.trim() ? translated : original;
}

export function translatedPollOption(
  optionId: string,
  optionIndex: number,
  original: string,
  translation: PollTranslation | undefined,
  viewerLanguage = getTranslationRequestLanguage(),
  showOriginal = false
): string {
  if (showOriginal || !contentTranslationTargetsViewer(translation, viewerLanguage)) return original;
  const runtime = translation as RuntimeTranslation | undefined;
  const translated =
    translation?.options?.[optionId]?.trim() ??
    runtime?.options?.[optionId]?.trim() ??
    translation?.fields?.[`option:${optionId}`]?.trim() ??
    translation?.fields?.[`option-index:${optionIndex}`]?.trim();
  return translated && translated !== original.trim() ? translated : original;
}

export function hasTranslatedContentField(
  original: string | undefined,
  translation: ContentTranslation | undefined,
  field: string,
  viewerLanguage = getTranslationRequestLanguage()
): boolean {
  if (!original || !contentTranslationTargetsViewer(translation, viewerLanguage)) return false;
  return translatedContentField(original, translation, field, viewerLanguage) !== original;
}

export function hasTranslatedPoll(
  question: string,
  options: readonly { id: string; label: string }[],
  translation: PollTranslation | undefined,
  viewerLanguage = getTranslationRequestLanguage()
): boolean {
  if (!contentTranslationTargetsViewer(translation, viewerLanguage)) return false;
  if (translatedPollQuestion(question, translation, viewerLanguage) !== question) return true;
  return options.some(
    (option, index) =>
      translatedPollOption(option.id, index, option.label, translation, viewerLanguage) !== option.label
  );
}

export function translationSourceLabel(translation?: ContentTranslation): string {
  const runtime = translation as RuntimeTranslation | undefined;
  const source = runtime?.sourceLanguage ?? runtime?.source_language;
  if (!source) return "langue d’origine";
  const base = source.trim().toLocaleLowerCase().replace("_", "-").split("-")[0];
  return SUPPORTED_LANGUAGES.find((language) => language.code === base)?.nativeName ?? source.trim();
}

const FRENCH_SOURCE_FORMS: Partial<Record<(typeof SUPPORTED_LANGUAGES)[number]["code"], string>> = {
  fr: "du français",
  en: "de l’anglais",
  es: "de l’espagnol",
  de: "de l’allemand",
  it: "de l’italien",
  pt: "du portugais",
  nl: "du néerlandais",
  pl: "du polonais",
  ro: "du roumain",
  sv: "du suédois",
  da: "du danois",
  no: "du norvégien",
  tr: "du turc",
  ru: "du russe",
  ar: "de l’arabe",
  hi: "de l’hindi",
  zh: "du chinois",
  ja: "du japonais",
  ko: "du coréen"
};

const UI_LANGUAGE_TAGS: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
  pt: "pt-PT"
};

/** Returns a complete, grammatical source-language attribution for the viewer. */
export function translationSourceAttribution(
  translation?: ContentTranslation,
  viewerLanguage = getTranslationRequestLanguage()
): string {
  const runtime = translation as RuntimeTranslation | undefined;
  const rawSource = runtime?.sourceLanguage ?? runtime?.source_language;
  const locale = viewerLanguage.trim().toLocaleLowerCase().replace("_", "-").split("-")[0] || "fr";
  if (!rawSource) {
    if (locale === "en") return "Translated from the original language";
    if (locale === "es") return "Traducido del idioma original";
    if (locale === "de") return "Aus der Originalsprache übersetzt";
    if (locale === "it") return "Tradotto dalla lingua originale";
    if (locale === "pt") return "Traduzido do idioma original";
    return "Traduit de la langue d’origine";
  }

  const sourceCode = rawSource.trim().toLocaleLowerCase().replace("_", "-").split("-")[0] ?? "";
  const source = SUPPORTED_LANGUAGES.find((language) => language.code === sourceCode);
  if (locale === "fr") {
    const frenchForm = source ? FRENCH_SOURCE_FORMS[source.code] : undefined;
    return frenchForm ? `Traduit ${frenchForm}` : `Traduit depuis ${rawSource.trim()}`;
  }

  let displayName = source?.nativeName ?? rawSource.trim();
  try {
    if (sourceCode && typeof Intl.DisplayNames === "function") {
      displayName = new Intl.DisplayNames([UI_LANGUAGE_TAGS[locale] ?? locale], { type: "language" }).of(sourceCode) ?? displayName;
    }
  } catch {
    // Older Hermes builds may omit Intl.DisplayNames; native names remain clear.
  }

  if (locale === "en") return `Translated from ${displayName}`;
  if (locale === "es") return `Traducido de: ${displayName}`;
  if (locale === "de") return `Übersetzt aus: ${displayName}`;
  if (locale === "it") return `Tradotto da: ${displayName}`;
  if (locale === "pt") return `Traduzido de: ${displayName}`;
  return `Translated from ${displayName}`;
}
