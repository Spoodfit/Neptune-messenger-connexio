import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V27: Record<string, TranslationSet> = {
  "Filtrer la carte": { en: "Filter the map", es: "Filtrar el mapa", de: "Karte filtern", it: "Filtra la mappa", pt: "Filtrar o mapa" },
  "Ouvre les options d’affichage de la carte": { en: "Opens map display options", es: "Abre las opciones de visualización del mapa", de: "Öffnet die Anzeigeoptionen der Karte", it: "Apre le opzioni di visualizzazione della mappa", pt: "Abre as opções de visualização do mapa" },
  "Sélectionner": { en: "Select", es: "Seleccionar", de: "Auswählen", it: "Seleziona", pt: "Selecionar" },
  "Maintenant autour de vous": { en: "Now around you", es: "Ahora a tu alrededor", de: "Jetzt in deiner Nähe", it: "Ora intorno a te", pt: "Agora à sua volta" },
  "Rien d’urgent maintenant": { en: "Nothing urgent right now", es: "Nada urgente ahora", de: "Gerade nichts Dringendes", it: "Niente di urgente ora", pt: "Nada urgente agora" },
  "Voir tous les évènements": { en: "See all events", es: "Ver todos los eventos", de: "Alle Veranstaltungen ansehen", it: "Vedi tutti gli eventi", pt: "Ver todos os eventos" },
  "Réduire ce panneau": { en: "Collapse this panel", es: "Reducir este panel", de: "Dieses Panel einklappen", it: "Riduci questo pannello", pt: "Recolher este painel" },
  "Ouvrir ce panneau": { en: "Open this panel", es: "Abrir este panel", de: "Dieses Panel öffnen", it: "Apri questo pannello", pt: "Abrir este painel" },
  "Sélectionner l’évènement": { en: "Select event", es: "Seleccionar evento", de: "Veranstaltung auswählen", it: "Seleziona evento", pt: "Selecionar evento" },
  "personne disponible maintenant": { en: "person available now", es: "persona disponible ahora", de: "Person jetzt verfügbar", it: "persona disponibile ora", pt: "pessoa disponível agora" },
  "personnes disponibles maintenant": { en: "people available now", es: "personas disponibles ahora", de: "Personen jetzt verfügbar", it: "persone disponibili ora", pt: "pessoas disponíveis agora" },
  "évènement en cours": { en: "event happening now", es: "evento en curso", de: "laufende Veranstaltung", it: "evento in corso", pt: "evento a decorrer" },
  "évènements en cours": { en: "events happening now", es: "eventos en curso", de: "laufende Veranstaltungen", it: "eventi in corso", pt: "eventos a decorrer" },
  "évènement à venir": { en: "upcoming event", es: "evento próximo", de: "bevorstehende Veranstaltung", it: "evento in arrivo", pt: "próximo evento" },
  "évènements à venir": { en: "upcoming events", es: "eventos próximos", de: "bevorstehende Veranstaltungen", it: "eventi in arrivo", pt: "próximos eventos" },
  "À saisir maintenant": { en: "Worth acting on now", es: "Para aprovechar ahora", de: "Jetzt interessant", it: "Da cogliere ora", pt: "Para aproveitar agora" },
  "À venir": { en: "Upcoming", es: "Próximamente", de: "Demnächst", it: "In arrivo", pt: "Em breve" },
  "Affiche tous les membres et évènements visibles": { en: "Shows all visible members and events", es: "Muestra todos los miembros y eventos visibles", de: "Zeigt alle sichtbaren Mitglieder und Veranstaltungen", it: "Mostra tutti i membri e gli eventi visibili", pt: "Mostra todos os membros e eventos visíveis" },
  "Afficher les membres disponibles": { en: "Show available members", es: "Mostrar miembros disponibles", de: "Verfügbare Mitglieder anzeigen", it: "Mostra membri disponibili", pt: "Mostrar membros disponíveis" },
  "Afficher les évènements": { en: "Show events", es: "Mostrar eventos", de: "Veranstaltungen anzeigen", it: "Mostra eventi", pt: "Mostrar eventos" },
  "Afficher tous les membres et évènements": { en: "Show all members and events", es: "Mostrar todos los miembros y eventos", de: "Alle Mitglieder und Veranstaltungen anzeigen", it: "Mostra tutti i membri e gli eventi", pt: "Mostrar todos os membros e eventos" },
  "Dans cette zone": { en: "In this area", es: "En esta zona", de: "In diesem Gebiet", it: "In questa zona", pt: "Nesta zona" },
  "Disponible maintenant": { en: "Available now", es: "Disponible ahora", de: "Jetzt verfügbar", it: "Disponibile ora", pt: "Disponível agora" },
  "Disponibles": { en: "Available", es: "Disponibles", de: "Verfügbar", it: "Disponibili", pt: "Disponíveis" },
  "En cours maintenant": { en: "Happening now", es: "En curso ahora", de: "Läuft gerade", it: "In corso ora", pt: "A decorrer agora" },
  "Échanger maintenant": { en: "Talk now", es: "Hablar ahora", de: "Jetzt austauschen", it: "Parla ora", pt: "Conversar agora" },
  "Moi · occupé": { en: "Me · busy", es: "Yo · ocupado", de: "Ich · beschäftigt", it: "Io · occupato", pt: "Eu · ocupado" },
  "Moi · ouvert": { en: "Me · open", es: "Yo · disponible", de: "Ich · offen", it: "Io · disponibile", pt: "Eu · disponível" },
  "Occupé maintenant": { en: "Busy now", es: "Ocupado ahora", de: "Jetzt beschäftigt", it: "Occupato ora", pt: "Ocupado agora" },
  "Ouvrir mon profil": { en: "Open my profile", es: "Abrir mi perfil", de: "Mein Profil öffnen", it: "Apri il mio profilo", pt: "Abrir o meu perfil" },
  "Participer maintenant": { en: "Join now", es: "Participar ahora", de: "Jetzt teilnehmen", it: "Partecipa ora", pt: "Participar agora" },
  "Radar Connexio": { en: "Connexio Radar", es: "Radar Connexio", de: "Connexio-Radar", it: "Radar Connexio", pt: "Radar Connexio" },
  "S’inscrire à l’évènement": { en: "Register for the event", es: "Inscribirse en el evento", de: "Für die Veranstaltung anmelden", it: "Iscriviti all’evento", pt: "Inscrever-se no evento" },
  "Visio en cours": { en: "Video call in progress", es: "Videollamada en curso", de: "Videoanruf läuft", it: "Videochiamata in corso", pt: "Videochamada em curso" },
  "Voir les membres disponibles": { en: "See available members", es: "Ver miembros disponibles", de: "Verfügbare Mitglieder anzeigen", it: "Vedi membri disponibili", pt: "Ver membros disponíveis" },
  "Voir les personnes disponibles maintenant": { en: "See people available now", es: "Ver personas disponibles ahora", de: "Jetzt verfügbare Personen anzeigen", it: "Vedi le persone disponibili ora", pt: "Ver pessoas disponíveis agora" },
  "Voir toute la communauté": { en: "View the whole community", es: "Ver toda la comunidad", de: "Gesamte Community anzeigen", it: "Vedi tutta la community", pt: "Ver toda a comunidade" },
  "Voter pour cet évènement": { en: "Vote for this event", es: "Votar por este evento", de: "Für diese Veranstaltung abstimmen", it: "Vota per questo evento", pt: "Votar neste evento" }
};

export function translateUiTextV27(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  return UI_TRANSLATIONS_V27[value]?.[locale] ?? UI_TRANSLATIONS_V27[value]?.en ?? value;
}
