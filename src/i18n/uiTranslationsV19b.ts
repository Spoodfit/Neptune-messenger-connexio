import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V19B: Record<string, TranslationSet> = {
  "Lieu": { en: "Place", es: "Lugar", de: "Ort", it: "Luogo", pt: "Local" },
  "Bloquer ce membre ?": { en: "Block this member?", es: "¿Bloquear a este miembro?", de: "Dieses Mitglied blockieren?", it: "Bloccare questo membro?", pt: "Bloquear este membro?" },
  "Vous ne recevrez plus ses messages directs et son contenu sera masqué selon les règles Connexio.": {
    en: "You will no longer receive their direct messages and their content will be hidden according to Connexio rules.",
    es: "Ya no recibirás sus mensajes directos y su contenido se ocultará según las reglas de Connexio.",
    de: "Du erhältst keine Direktnachrichten dieser Person mehr und ihre Inhalte werden gemäß den Connexio-Regeln ausgeblendet.",
    it: "Non riceverai più i suoi messaggi diretti e i suoi contenuti verranno nascosti secondo le regole di Connexio.",
    pt: "Deixará de receber as mensagens diretas deste membro e o conteúdo será ocultado de acordo com as regras do Connexio."
  },
  "publication": { en: "post", es: "publicación", de: "Beitrag", it: "pubblicazione", pt: "publicação" },
  "réactions ·": { en: "reactions ·", es: "reacciones ·", de: "Reaktionen ·", it: "reazioni ·", pt: "reações ·" },
  "Créer un Temps fort depuis le feed": { en: "Create a Highlight from the feed", es: "Crear un momento desde el feed", de: "Highlight aus dem Feed erstellen", it: "Crea un momento dal feed", pt: "Criar um destaque a partir do feed" }
};

export function translateUiTextV19B(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  return UI_TRANSLATIONS_V19B[value]?.[locale] ?? UI_TRANSLATIONS_V19B[value]?.en ?? value;
}
