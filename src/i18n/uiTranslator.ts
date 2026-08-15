import type { SupportedLanguage } from "./languages";
import { translateUiText as translateUiTextCore } from "./uiTranslations";
import { translateUiTextV17 } from "./uiTranslationsV17";

/**
 * Single entry point for all Connexio interface copy.
 * The V17 catalogue contains the exhaustive additions discovered by the static
 * UI audit; the historical catalogue remains the fallback for existing copy.
 */
export function translateConnexioUiText(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const extended = translateUiTextV17(value, language);
  if (extended !== value) return extended;
  return translateUiTextCore(value, language);
}
