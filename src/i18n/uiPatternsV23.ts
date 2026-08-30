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

  const radarSummary = value.match(/^(\d+) membres · (\d+) évènements$/u);
  if (radarSummary) {
    const [, members, events] = radarSummary;
    if (locale === "es") return `${members} miembros · ${events} eventos`;
    if (locale === "de") return `${members} Mitglieder · ${events} Veranstaltungen`;
    if (locale === "it") return `${members} membri · ${events} eventi`;
    if (locale === "pt") return `${members} membros · ${events} eventos`;
    return `${members} members · ${events} events`;
  }

  const availableNow = value.match(/^(\d+) disponibles(?: maintenant)?$/u);
  if (availableNow) {
    if (locale === "es") return `${availableNow[1]} disponibles ahora`;
    if (locale === "de") return `${availableNow[1]} jetzt verfügbar`;
    if (locale === "it") return `${availableNow[1]} disponibili ora`;
    if (locale === "pt") return `${availableNow[1]} disponíveis agora`;
    return `${availableNow[1]} available now`;
  }

  const eventsToDiscover = value.match(/^(\d+) évènements à découvrir$/u);
  if (eventsToDiscover) {
    if (locale === "es") return `${eventsToDiscover[1]} eventos por descubrir`;
    if (locale === "de") return `${eventsToDiscover[1]} Veranstaltungen entdecken`;
    if (locale === "it") return `${eventsToDiscover[1]} eventi da scoprire`;
    if (locale === "pt") return `${eventsToDiscover[1]} eventos para descobrir`;
    return `${eventsToDiscover[1]} events to discover`;
  }

  const opportunities = value.match(/^(\d+) opportunités$/u);
  if (opportunities) {
    if (locale === "es") return `${opportunities[1]} oportunidades`;
    if (locale === "de") return `${opportunities[1]} Möglichkeiten`;
    if (locale === "it") return `${opportunities[1]} opportunità`;
    if (locale === "pt") return `${opportunities[1]} oportunidades`;
    return `${opportunities[1]} opportunities`;
  }

  const videoPeople = value.match(/^Visio en cours · (\d+) personnes$/u);
  if (videoPeople) {
    if (locale === "es") return `Videollamada en curso · ${videoPeople[1]} personas`;
    if (locale === "de") return `Videoanruf läuft · ${videoPeople[1]} Personen`;
    if (locale === "it") return `Videochiamata in corso · ${videoPeople[1]} persone`;
    if (locale === "pt") return `Videochamada em curso · ${videoPeople[1]} pessoas`;
    return `Video call in progress · ${videoPeople[1]} people`;
  }

  const peopleOnVideo = value.match(/^(\d+) en visio$/u);
  if (peopleOnVideo) {
    if (locale === "es") return `${peopleOnVideo[1]} en videollamada`;
    if (locale === "de") return `${peopleOnVideo[1]} im Videoanruf`;
    if (locale === "it") return `${peopleOnVideo[1]} in videochiamata`;
    if (locale === "pt") return `${peopleOnVideo[1]} em videochamada`;
    return `${peopleOnVideo[1]} on video`;
  }

  const startVideo = value.match(/^Démarrer une visio avec (.+)$/u);
  if (startVideo) {
    if (locale === "es") return `Iniciar una videollamada con ${startVideo[1]}`;
    if (locale === "de") return `Videoanruf mit ${startVideo[1]} starten`;
    if (locale === "it") return `Avvia una videochiamata con ${startVideo[1]}`;
    if (locale === "pt") return `Iniciar uma videochamada com ${startVideo[1]}`;
    return `Start a video call with ${startVideo[1]}`;
  }

  const waitSeconds = value.match(/^Patientez (\d+)s$/u);
  if (waitSeconds) {
    if (locale === "es") return `Espera ${waitSeconds[1]} s`;
    if (locale === "de") return `${waitSeconds[1]} s warten`;
    if (locale === "it") return `Attendi ${waitSeconds[1]} s`;
    if (locale === "pt") return `Aguarde ${waitSeconds[1]} s`;
    return `Wait ${waitSeconds[1]}s`;
  }

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
