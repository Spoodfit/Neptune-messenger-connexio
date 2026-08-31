export const SUPPORTED_LANGUAGES = [
  { code: "fr", nativeName: "Français", frenchName: "Français" },
  { code: "en", nativeName: "English", frenchName: "Anglais" },
  { code: "es", nativeName: "Español", frenchName: "Espagnol" },
  { code: "de", nativeName: "Deutsch", frenchName: "Allemand" },
  { code: "it", nativeName: "Italiano", frenchName: "Italien" },
  { code: "pt", nativeName: "Português", frenchName: "Portugais" },
  { code: "nl", nativeName: "Nederlands", frenchName: "Néerlandais" },
  { code: "pl", nativeName: "Polski", frenchName: "Polonais" },
  { code: "ro", nativeName: "Română", frenchName: "Roumain" },
  { code: "sv", nativeName: "Svenska", frenchName: "Suédois" },
  { code: "da", nativeName: "Dansk", frenchName: "Danois" },
  { code: "no", nativeName: "Norsk", frenchName: "Norvégien" },
  { code: "tr", nativeName: "Türkçe", frenchName: "Turc" },
  { code: "ru", nativeName: "Русский", frenchName: "Russe" },
  { code: "ar", nativeName: "العربية", frenchName: "Arabe" },
  { code: "hi", nativeName: "हिन्दी", frenchName: "Hindi" },
  { code: "zh", nativeName: "中文", frenchName: "Chinois" },
  { code: "ja", nativeName: "日本語", frenchName: "Japonais" },
  { code: "ko", nativeName: "한국어", frenchName: "Coréen" }
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const LANGUAGE_CODES = new Set<string>(
  SUPPORTED_LANGUAGES.map((language) => language.code)
);

export function normalizeLanguageCode(
  value: unknown,
  fallback: SupportedLanguage = "fr"
): SupportedLanguage {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLocaleLowerCase().replace("_", "-");
  const base = normalized.split("-")[0] ?? "";
  return LANGUAGE_CODES.has(base) ? (base as SupportedLanguage) : fallback;
}

export function detectSystemLanguage(
  fallback: SupportedLanguage = "fr"
): SupportedLanguage {
  try {
    return normalizeLanguageCode(
      Intl.DateTimeFormat().resolvedOptions().locale,
      fallback
    );
  } catch {
    return fallback;
  }
}

export function getLanguageFrenchName(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "langue inconnue";
  const normalized = value.trim().toLocaleLowerCase().replace("_", "-");
  const base = normalized.split("-")[0] ?? normalized;
  const match = SUPPORTED_LANGUAGES.find((language) => language.code === base);
  return match?.frenchName ?? value.trim().toLocaleUpperCase();
}

export function isSameLanguage(left: unknown, right: unknown): boolean {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const normalize = (value: string) =>
    value.trim().toLocaleLowerCase().replace("_", "-").split("-")[0] ?? "";
  const first = normalize(left);
  const second = normalize(right);
  return Boolean(first && second && first === second);
}
