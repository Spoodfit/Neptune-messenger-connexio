import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type DynamicTranslator = (match: RegExpMatchArray, locale: SupportedUiLanguage) => string;

const WORDS = {
  en: { profileOf: "Profile of", call: "Call", scheduleWith: "Schedule with", openProfileOf: "Open profile of", recommendTo: "Recommend a contact to", calls: "calls", members: "members", participants: "participants", min: "min", video: "Video", translatedFrom: "Translated from" },
  es: { profileOf: "Perfil de", call: "Llamar a", scheduleWith: "Programar con", openProfileOf: "Abrir el perfil de", recommendTo: "Recomendar un contacto a", calls: "llamadas", members: "miembros", participants: "participantes", min: "min", video: "Vídeo", translatedFrom: "Traducido del" },
  de: { profileOf: "Profil von", call: "Anrufen:", scheduleWith: "Planen mit", openProfileOf: "Profil öffnen von", recommendTo: "Kontakt empfehlen an", calls: "Anrufe", members: "Mitglieder", participants: "Teilnehmende", min: "Min.", video: "Video", translatedFrom: "Übersetzt aus" },
  it: { profileOf: "Profilo di", call: "Chiama", scheduleWith: "Programma con", openProfileOf: "Apri il profilo di", recommendTo: "Consiglia un contatto a", calls: "chiamate", members: "membri", participants: "partecipanti", min: "min", video: "Video", translatedFrom: "Tradotto da" },
  pt: { profileOf: "Perfil de", call: "Ligar a", scheduleWith: "Agendar com", openProfileOf: "Abrir o perfil de", recommendTo: "Recomendar um contacto a", calls: "chamadas", members: "membros", participants: "participantes", min: "min", video: "Vídeo", translatedFrom: "Traduzido de" }
} as const;

type DynamicLocale = keyof typeof WORDS;

function words(locale: SupportedUiLanguage) {
  return WORDS[(locale === "fr" ? "en" : locale) as DynamicLocale];
}

function publicationCount(count: number, locale: SupportedUiLanguage): string {
  if (locale === "es") return `${count} ${count === 1 ? "publicación" : "publicaciones"}`;
  if (locale === "de") return `${count} ${count === 1 ? "Beitrag" : "Beiträge"}`;
  if (locale === "it") return `${count} ${count === 1 ? "pubblicazione" : "pubblicazioni"}`;
  if (locale === "pt") return `${count} ${count === 1 ? "publicação" : "publicações"}`;
  return `${count} ${count === 1 ? "post" : "posts"}`;
}

function engagementCount(reactions: number, comments: number, locale: SupportedUiLanguage): string {
  if (locale === "es") return `${reactions} ${reactions === 1 ? "reacción" : "reacciones"} · ${comments} ${comments === 1 ? "comentario" : "comentarios"}`;
  if (locale === "de") return `${reactions} ${reactions === 1 ? "Reaktion" : "Reaktionen"} · ${comments} ${comments === 1 ? "Kommentar" : "Kommentare"}`;
  if (locale === "it") return `${reactions} ${reactions === 1 ? "reazione" : "reazioni"} · ${comments} ${comments === 1 ? "commento" : "commenti"}`;
  if (locale === "pt") return `${reactions} ${reactions === 1 ? "reação" : "reações"} · ${comments} ${comments === 1 ? "comentário" : "comentários"}`;
  return `${reactions} ${reactions === 1 ? "reaction" : "reactions"} · ${comments} ${comments === 1 ? "comment" : "comments"}`;
}

const patterns: Array<[RegExp, DynamicTranslator]> = [
  [/^Profil de (.+)$/u, (m, l) => `${words(l).profileOf} ${m[1]}`],
  [/^Appeler (.+)$/u, (m, l) => `${words(l).call} ${m[1]}`],
  [/^Programmer avec (.+)$/u, (m, l) => `${words(l).scheduleWith} ${m[1]}`],
  [/^Ouvrir le profil de (.+)$/u, (m, l) => `${words(l).openProfileOf} ${m[1]}`],
  [/^Recommander un contact à (.+)$/u, (m, l) => `${words(l).recommendTo} ${m[1]}`],
  [/^Traduit de (.+)$/u, (m, l) => `${words(l).translatedFrom} ${m[1]}`],
  [/^(\d+) appels$/u, (m, l) => `${m[1]} ${words(l).calls}`],
  [/^(\d+) membres$/u, (m, l) => `${m[1]} ${words(l).members}`],
  [/^(\d+) membres ·$/u, (m, l) => `${m[1]} ${words(l).members} ·`],
  [/^(\d+) participants$/u, (m, l) => `${m[1]} ${words(l).participants}`],
  [/^ · (\d+) min$/u, (m, l) => ` · ${m[1]} ${words(l).min}`],
  [/^(\d+) publications?$/u, (m, l) => publicationCount(Number(m[1]), l)],
  [/^(\d+) réactions? · (\d+) commentaires?$/u, (m, l) => engagementCount(Number(m[1]), Number(m[2]), l)],
  [/^Visio · Appel manqué$/u, (_m, l) => `${words(l).video} · ${l === "es" ? "Llamada perdida" : l === "de" ? "Verpasster Anruf" : l === "it" ? "Chiamata persa" : l === "pt" ? "Chamada perdida" : "Missed call"}`],
  [/^Visio · Appel entrant$/u, (_m, l) => `${words(l).video} · ${l === "es" ? "Llamada entrante" : l === "de" ? "Eingehender Anruf" : l === "it" ? "Chiamata in arrivo" : l === "pt" ? "Chamada recebida" : "Incoming call"}`],
  [/^Visio · Appel sortant$/u, (_m, l) => `${words(l).video} · ${l === "es" ? "Llamada saliente" : l === "de" ? "Ausgehender Anruf" : l === "it" ? "Chiamata in uscita" : l === "pt" ? "Chamada efetuada" : "Outgoing call"}`],
  [/^Activité professionnelle à (.+)$/u, (m, l) => `${l === "es" ? "Actividad profesional en" : l === "de" ? "Berufliche Tätigkeit in" : l === "it" ? "Attività professionale a" : l === "pt" ? "Atividade profissional em" : "Professional activity in"} ${m[1]}`]
];

export function translateConnexioUiPattern(value: string, language: SupportedLanguage | string): string {
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr" || !value) return value;
  for (const [pattern, translate] of patterns) {
    const match = value.match(pattern);
    if (match) return translate(match, locale);
  }
  return value;
}
