import { getLanguageFrenchName, isSameLanguage } from "./languages";
import { getTranslationRequestLanguage } from "./translationLocale";
import type {
  ContentTranslation,
  MessageTranslation,
  PollTranslation
} from "../types/messaging";

export function contentTranslationTargetsViewer(
  translation?: ContentTranslation,
  viewerLanguage = getTranslationRequestLanguage()
): boolean {
  return Boolean(
    translation &&
      translation.status === "ready" &&
      (!translation.targetLanguage ||
        isSameLanguage(translation.targetLanguage, viewerLanguage))
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
  const legacyBody = field === "body" ? (translation as MessageTranslation).body?.trim() : undefined;
  const translated = translation?.fields?.[field]?.trim() ?? legacyBody;
  return translated && translated !== original.trim() ? translated : original;
}

export function translatedPollQuestion(
  original: string,
  translation: PollTranslation | undefined,
  viewerLanguage = getTranslationRequestLanguage(),
  showOriginal = false
): string {
  if (showOriginal || !contentTranslationTargetsViewer(translation, viewerLanguage)) return original;
  const translated = translation?.question?.trim() ?? translation?.fields?.question?.trim();
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
  const translated =
    translation?.options?.[optionId]?.trim() ??
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
  return translation?.sourceLanguage
    ? getLanguageFrenchName(translation.sourceLanguage).toLocaleLowerCase("fr")
    : "la langue d’origine";
}
