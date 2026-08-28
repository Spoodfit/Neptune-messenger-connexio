import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

function presentWord(count: number, locale: SupportedUiLanguage): string {
  if (locale === "es") return count === 1 ? "presente" : "presentes";
  if (locale === "de") return "anwesend";
  if (locale === "it") return count === 1 ? "presente" : "presenti";
  if (locale === "pt") return count === 1 ? "presente" : "presentes";
  return "present";
}

function hereWord(locale: SupportedUiLanguage): string {
  if (locale === "es") return "aquí";
  if (locale === "de") return "hier";
  if (locale === "it") return "qui";
  if (locale === "pt") return "aqui";
  return "here";
}

export function translateCoworkingUiPattern(value: string, language: SupportedLanguage | string): string {
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr" || !value) return value;

  const presence = value.match(/^(\d+) présents?$/u);
  if (presence) {
    const count = Number(presence[1]);
    return `${presence[1]} ${presentWord(count, locale)}`;
  }

  const room = value.match(/^(\d+) ici(?: · (.+))?$/u);
  if (room) return `${room[1]} ${hereWord(locale)}${room[2] ? ` · ${room[2]}` : ""}`;

  const mapSummary = value.match(/^Carte du Coworking, (\d+) groupes? ou personnes? et (\d+) évènements?$/u);
  if (mapSummary) {
    const [, targets, events] = mapSummary;
    if (locale === "es") return `Mapa del Coworking, ${targets} grupos o personas y ${events} eventos`;
    if (locale === "de") return `Coworking-Karte, ${targets} Gruppen oder Personen und ${events} Veranstaltungen`;
    if (locale === "it") return `Mappa del Coworking, ${targets} gruppi o persone e ${events} eventi`;
    if (locale === "pt") return `Mapa do Coworking, ${targets} grupos ou pessoas e ${events} eventos`;
    return `Coworking map, ${targets} groups or people and ${events} events`;
  }

  const selectEvent = value.match(/^Sélectionner l’évènement (.+)$/u);
  if (selectEvent) {
    if (locale === "es") return `Seleccionar el evento ${selectEvent[1]}`;
    if (locale === "de") return `Veranstaltung ${selectEvent[1]} auswählen`;
    if (locale === "it") return `Seleziona l’evento ${selectEvent[1]}`;
    if (locale === "pt") return `Selecionar o evento ${selectEvent[1]}`;
    return `Select event ${selectEvent[1]}`;
  }

  const selectTarget = value.match(/^Sélectionner (.+)$/u);
  if (selectTarget) {
    if (locale === "es") return `Seleccionar ${selectTarget[1]}`;
    if (locale === "de") return `${selectTarget[1]} auswählen`;
    if (locale === "it") return `Seleziona ${selectTarget[1]}`;
    if (locale === "pt") return `Selecionar ${selectTarget[1]}`;
    return `Select ${selectTarget[1]}`;
  }

  const classify = value.match(/^Classer comme (.+)$/u);
  if (classify) {
    if (locale === "es") return `Clasificar como ${classify[1]}`;
    if (locale === "de") return `Als ${classify[1]} einstufen`;
    if (locale === "it") return `Classifica come ${classify[1]}`;
    if (locale === "pt") return `Classificar como ${classify[1]}`;
    return `Classify as ${classify[1]}`;
  }

  return value;
}
