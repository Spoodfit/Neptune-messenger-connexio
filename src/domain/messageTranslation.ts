import { isSameLanguage } from "../i18n/languages";
import type { ChatMessage, MessageTranslation } from "../types/messaging";

export interface MessagePresentation {
  body: string;
  originalBody: string;
  translated: boolean;
  translationAvailable: boolean;
  sourceLanguage?: string;
  targetLanguage: string;
}

export function resolveMessagePresentation(
  message: ChatMessage,
  targetLanguage: string,
  autoTranslate: boolean,
  showOriginal = false,
  translationOverride?: MessageTranslation | null
): MessagePresentation {
  const originalBody = message.body;
  const translation = translationOverride ?? message.translation;
  const translationAvailable = Boolean(
    translation?.status === "ready" &&
      translation.body?.trim() &&
      isSameLanguage(translation.targetLanguage, targetLanguage)
  );
  const sourceLanguage = translation?.sourceLanguage ?? message.sourceLanguage;
  const useTranslation = Boolean(
    !message.isMine &&
      autoTranslate &&
      !showOriginal &&
      translationAvailable &&
      !isSameLanguage(sourceLanguage, targetLanguage)
  );

  return {
    body: useTranslation ? translation!.body!.trim() : originalBody,
    originalBody,
    translated: useTranslation,
    translationAvailable,
    sourceLanguage,
    targetLanguage
  };
}

export function shouldRequestMessageTranslation(
  message: ChatMessage,
  targetLanguage: string,
  autoTranslate: boolean,
  translationOverride?: MessageTranslation | null
): boolean {
  if (!autoTranslate || message.isMine || !message.body.trim()) return false;
  if (message.deletedAt) return false;
  if (message.id.startsWith("local-") || message.id.startsWith("mock-")) {
    return false;
  }

  const translation = translationOverride ?? message.translation;
  const sourceLanguage = translation?.sourceLanguage ?? message.sourceLanguage;
  if (sourceLanguage && isSameLanguage(sourceLanguage, targetLanguage)) return false;
  if (
    translation?.status === "ready" &&
    translation.body?.trim() &&
    isSameLanguage(translation.targetLanguage, targetLanguage)
  ) {
    return false;
  }
  if (
    translation?.status === "pending" &&
    isSameLanguage(translation.targetLanguage, targetLanguage)
  ) {
    return false;
  }
  return true;
}
