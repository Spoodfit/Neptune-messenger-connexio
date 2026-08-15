import type { ComponentProps } from "react";

import { Text } from "./LocalizedText";
import { translatedContentField } from "../i18n/contentTranslation";
import type { ContentTranslation } from "../types/messaging";

type LocalizedTextProps = ComponentProps<typeof Text>;

interface TranslatedContentTextProps extends Omit<LocalizedTextProps, "children"> {
  original: string;
  translation?: ContentTranslation;
  field?: string;
  showOriginal?: boolean;
}

export function TranslatedContentText({
  original,
  translation,
  field = "body",
  showOriginal = false,
  ...textProps
}: TranslatedContentTextProps) {
  const rendered =
    translatedContentField(original, translation, field, undefined, showOriginal) ?? original;
  return <Text {...textProps}>{rendered}</Text>;
}
