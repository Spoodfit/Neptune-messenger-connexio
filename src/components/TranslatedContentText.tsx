import type { ComponentProps } from "react";

import { env } from "../config/env";
import {
  contentTranslationTargetsViewer,
  translatedContentField
} from "../i18n/contentTranslation";
import { mockContentTranslation } from "../i18n/mockContentLookup";
import type { ContentTranslation } from "../types/messaging";
import { Text } from "./LocalizedText";

type LocalizedTextProps = ComponentProps<typeof Text>;

interface TranslatedContentTextProps extends Omit<LocalizedTextProps, "children"> {
  original: string;
  translation?: ContentTranslation;
  field?: string;
  sourceLanguage?: string;
  showOriginal?: boolean;
}

export function TranslatedContentText({
  original,
  translation,
  field = "body",
  sourceLanguage = "fr",
  showOriginal = false,
  ...textProps
}: TranslatedContentTextProps) {
  const effectiveTranslation = contentTranslationTargetsViewer(translation)
    ? translation
    : env.mockMode
      ? mockContentTranslation(original, field, sourceLanguage)
      : translation;
  const rendered =
    translatedContentField(original, effectiveTranslation, field, undefined, showOriginal) ?? original;
  return <Text {...textProps}>{rendered}</Text>;
}
