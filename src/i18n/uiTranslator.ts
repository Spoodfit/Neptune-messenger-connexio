import type { SupportedLanguage } from "./languages";
import { translateUiText as translateUiTextCore } from "./uiTranslations";
import { translateUiTextV17 } from "./uiTranslationsV17";
import { translateUiTextV17B } from "./uiTranslationsV17b";

export function translateConnexioUiText(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const secondBatch = translateUiTextV17B(value, language);
  if (secondBatch !== value) return secondBatch;
  const firstBatch = translateUiTextV17(value, language);
  if (firstBatch !== value) return firstBatch;
  return translateUiTextCore(value, language);
}
