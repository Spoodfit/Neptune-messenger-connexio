import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V24: Record<string, TranslationSet> = {
  "· en visio": { en: "· on video", es: "· en videollamada", de: "· per Video", it: "· in video", pt: "· em vídeo" },
  "Actualiser la map": { en: "Refresh map", es: "Actualizar mapa", de: "Karte aktualisieren", it: "Aggiorna mappa", pt: "Atualizar mapa" },
  "Dire bonjour": { en: "Say hello", es: "Saludar", de: "Hallo sagen", it: "Saluta", pt: "Dizer olá" },
  "En échange": { en: "Talking", es: "En conversación", de: "Im Gespräch", it: "In conversazione", pt: "Em conversa" },
  "En pause": { en: "On break", es: "En pausa", de: "In Pause", it: "In pausa", pt: "Em pausa" },
  "Entre sans rendez-vous. Micro coupé par défaut.": { en: "Join without an appointment. Mic muted by default.", es: "Entra sin cita. Micrófono silenciado por defecto.", de: "Ohne Termin beitreten. Mikrofon standardmäßig stumm.", it: "Entra senza appuntamento. Microfono disattivato per impostazione predefinita.", pt: "Entre sem marcação. Microfone desligado por predefinição." },
  "ESPACE OUVERT": { en: "OPEN SPACE", es: "ESPACIO ABIERTO", de: "OFFENER BEREICH", it: "SPAZIO APERTO", pt: "ESPAÇO ABERTO" },
  "Fermer le coworking": { en: "Close Coworking", es: "Cerrar Coworking", de: "Coworking schließen", it: "Chiudi Coworking", pt: "Fechar Coworking" },
  "FOCUS": { en: "FOCUS", es: "CONCENTRACIÓN", de: "FOKUS", it: "FOCUS", pt: "FOCO" },
  "J’ai lu": { en: "I've read it", es: "Ya lo he leído", de: "Gelesen", it: "L'ho letto", pt: "Já li" },
  "J’entre": { en: "Join", es: "Entrar", de: "Beitreten", it: "Entra", pt: "Entrar" },
  "L’espace réapparaîtra dès que le service temps réel sera activé.": { en: "The space will reappear as soon as the realtime service is enabled.", es: "El espacio reaparecerá en cuanto se active el servicio en tiempo real.", de: "Der Bereich erscheint wieder, sobald der Echtzeitdienst aktiviert ist.", it: "Lo spazio riapparirà non appena il servizio in tempo reale sarà attivato.", pt: "O espaço reaparecerá assim que o serviço em tempo real for ativado." },
  "Le bureau est ouvert": { en: "The office is open", es: "La oficina está abierta", de: "Das Büro ist geöffnet", it: "L'ufficio è aperto", pt: "O escritório está aberto" },
  "Les rejoindre": { en: "Join them", es: "Unirse a ellos", de: "Beitreten", it: "Unisciti a loro", pt: "Juntar-se a eles" },
  "Marquer l'annonce comme lue": { en: "Mark announcement as read", es: "Marcar el anuncio como leído", de: "Ankündigung als gelesen markieren", it: "Segna l'annuncio come letto", pt: "Marcar anúncio como lido" },
  "NOUVEAU": { en: "NEW", es: "NUEVO", de: "NEU", it: "NUOVO", pt: "NOVO" },
  "Nouvelle annonce Neptune": { en: "New Neptune announcement", es: "Nuevo anuncio Neptune", de: "Neue Neptune-Ankündigung", it: "Nuovo annuncio Neptune", pt: "Novo anúncio Neptune" },
  "Ouvrir l’espace": { en: "Open space", es: "Abrir espacio", de: "Bereich öffnen", it: "Apri spazio", pt: "Abrir espaço" },
  "Ouvrir le groupe": { en: "Open group", es: "Abrir grupo", de: "Gruppe öffnen", it: "Apri gruppo", pt: "Abrir grupo" },
  "PAUSE": { en: "BREAK", es: "PAUSA", de: "PAUSE", it: "PAUSA", pt: "PAUSA" },
  "Progression du message vocal": { en: "Voice message progress", es: "Progreso del mensaje de voz", de: "Fortschritt der Sprachnachricht", it: "Avanzamento del messaggio vocale", pt: "Progresso da mensagem de voz" },
  "Quitter le coworking": { en: "Leave Coworking", es: "Salir del Coworking", de: "Coworking verlassen", it: "Esci dal Coworking", pt: "Sair do Coworking" },
  "Réduire": { en: "Collapse", es: "Reducir", de: "Einklappen", it: "Riduci", pt: "Reduzir" },
  "Rejoindre le coworking": { en: "Join Coworking", es: "Entrar en Coworking", de: "Coworking beitreten", it: "Entra nel Coworking", pt: "Entrar no Coworking" },
  "Transcription": { en: "Transcript", es: "Transcripción", de: "Transkript", it: "Trascrizione", pt: "Transcrição" },
  "Transcription indisponible": { en: "Transcript unavailable", es: "Transcripción no disponible", de: "Transkript nicht verfügbar", it: "Trascrizione non disponibile", pt: "Transcrição indisponível" },
  "Voir tout": { en: "See all", es: "Ver todo", de: "Alles anzeigen", it: "Vedi tutto", pt: "Ver tudo" }
};

export function translateUiTextV24(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  return UI_TRANSLATIONS_V24[value]?.[locale] ?? UI_TRANSLATIONS_V24[value]?.en ?? value;
}
