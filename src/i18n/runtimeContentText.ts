import { env } from "../config/env";
import type { ContentTranslation } from "../types/messaging";
import {
  contentTranslationTargetsViewer,
  translatedContentField
} from "./contentTranslation";
import { mockContentTranslation } from "./mockContentLookup";

/**
 * Utilisé par le plugin Babel pour les champs de contenu rendus directement
 * dans un <Text>. Le serveur reste la source de vérité en production ; le
 * dictionnaire mock n'est actif que dans les builds de démonstration.
 */
export function translateRuntimeContentText(
  original: unknown,
  translation: ContentTranslation | undefined,
  field: string,
  sourceLanguage?: string
): unknown {
  if (typeof original !== "string" || !original.trim()) return original;
  const effectiveTranslation = contentTranslationTargetsViewer(translation)
    ? translation
    : env.mockMode
      ? mockContentTranslation(original, field, sourceLanguage ?? "fr")
      : translation;
  return translatedContentField(original, effectiveTranslation, field) ?? original;
}
