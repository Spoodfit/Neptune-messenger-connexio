import { getLanguageFrenchName, isSameLanguage } from "./languages";
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
  return source
    ? getLanguageFrenchName(source).toLocaleLowerCase("fr")
    : "la langue d’origine";
}
