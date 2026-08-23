import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V24: Record<string, TranslationSet> = {
  "· en visio": { en: "· on video", es: "· en videollamada", de: "· per Video", it: "· in video", pt: "· em vídeo" },
  "Accepter": { en: "Accept", es: "Aceptar", de: "Annehmen", it: "Accetta", pt: "Aceitar" },
  "Accepter le toquement": { en: "Accept knock", es: "Aceptar llamada", de: "Anklopfen annehmen", it: "Accetta la richiesta", pt: "Aceitar pedido" },
  "Activez la localisation pour recentrer la carte autour de vous.": { en: "Enable location to recenter the map around you.", es: "Activa la ubicación para volver a centrar el mapa a tu alrededor.", de: "Aktiviere den Standort, um die Karte auf dich zu zentrieren.", it: "Attiva la posizione per ricentrare la mappa su di te.", pt: "Ative a localização para recentrar o mapa em si." },
  "Actualisation…": { en: "Refreshing…", es: "Actualizando…", de: "Aktualisierung…", it: "Aggiornamento…", pt: "A atualizar…" },
  "Actualiser la map": { en: "Refresh map", es: "Actualizar mapa", de: "Karte aktualisieren", it: "Aggiorna mappa", pt: "Atualizar mapa" },
  "Actualiser le coworking": { en: "Refresh Coworking", es: "Actualizar Coworking", de: "Coworking aktualisieren", it: "Aggiorna Coworking", pt: "Atualizar Coworking" },
  "Bonjour": { en: "Hello", es: "Hola", de: "Hallo", it: "Ciao", pt: "Olá" },
  "Bonjour non envoyé": { en: "Hello not sent", es: "Saludo no enviado", de: "Gruß nicht gesendet", it: "Saluto non inviato", pt: "Olá não enviado" },
  "Bureau indisponible": { en: "Office unavailable", es: "Oficina no disponible", de: "Büro nicht verfügbar", it: "Ufficio non disponibile", pt: "Escritório indisponível" },
  "Bureau privé": { en: "Private office", es: "Oficina privada", de: "Privates Büro", it: "Ufficio privato", pt: "Escritório privado" },
  "Carte géographique du Coworking Connexio": { en: "Connexio Coworking geographic map", es: "Mapa geográfico del Coworking Connexio", de: "Geografische Connexio-Coworking-Karte", it: "Mappa geografica del Coworking Connexio", pt: "Mapa geográfico do Coworking Connexio" },
  "Connexion média réduite. La présence reste disponible.": { en: "Reduced media connection. Presence remains available.", es: "Conexión multimedia reducida. La presencia sigue disponible.", de: "Eingeschränkte Medienverbindung. Die Präsenz bleibt verfügbar.", it: "Connessione multimediale ridotta. La presenza resta disponibile.", pt: "Ligação multimédia reduzida. A presença continua disponível." },
  "Dire bonjour": { en: "Say hello", es: "Saludar", de: "Hallo sagen", it: "Saluta", pt: "Dizer olá" },
  "En échange": { en: "Talking", es: "En conversación", de: "Im Gespräch", it: "In conversazione", pt: "Em conversa" },
  "En pause": { en: "On break", es: "En pausa", de: "In Pause", it: "In pausa", pt: "Em pausa" },
  "Entre sans rendez-vous. Micro coupé par défaut.": { en: "Join without an appointment. Mic muted by default.", es: "Entra sin cita. Micrófono silenciado por defecto.", de: "Ohne Termin beitreten. Mikrofon standardmäßig stumm.", it: "Entra senza appuntamento. Microfono disattivato per impostazione predefinita.", pt: "Entre sem marcação. Microfone desligado por predefinição." },
  "Espace libre · audio de proximité": { en: "Open space · proximity audio", es: "Espacio libre · audio de proximidad", de: "Freier Raum · Nähe-Audio", it: "Spazio libero · audio di prossimità", pt: "Espaço livre · áudio de proximidade" },
  "ESPACE OUVERT": { en: "OPEN SPACE", es: "ESPACIO ABIERTO", de: "OFFENER BEREICH", it: "SPAZIO APERTO", pt: "ESPAÇO ABERTO" },
  "Fermer la fiche": { en: "Close card", es: "Cerrar ficha", de: "Karte schließen", it: "Chiudi scheda", pt: "Fechar ficha" },
  "Fermer le coworking": { en: "Close Coworking", es: "Cerrar Coworking", de: "Coworking schließen", it: "Chiudi Coworking", pt: "Fechar Coworking" },
  "FOCUS": { en: "FOCUS", es: "CONCENTRACIÓN", de: "FOKUS", it: "FOCUS", pt: "FOCO" },
  "Impossible de toquer": { en: "Unable to knock", es: "No se puede llamar", de: "Anklopfen nicht möglich", it: "Impossibile bussare", pt: "Não foi possível bater à porta" },
  "Inviter dans un bureau privé": { en: "Invite to a private office", es: "Invitar a una oficina privada", de: "In ein privates Büro einladen", it: "Invita in un ufficio privato", pt: "Convidar para um escritório privado" },
  "J’ai lu": { en: "I've read it", es: "Ya lo he leído", de: "Gelesen", it: "L'ho letto", pt: "Já li" },
  "J’entre": { en: "Join", es: "Entrar", de: "Beitreten", it: "Entra", pt: "Entrar" },
  "L’espace réapparaîtra dès que le service temps réel sera activé.": { en: "The space will reappear as soon as the realtime service is enabled.", es: "El espacio reaparecerá en cuanto se active el servicio en tiempo real.", de: "Der Bereich erscheint wieder, sobald der Echtzeitdienst aktiviert ist.", it: "Lo spazio riapparirà non appena il servizio in tempo reale sarà attivato.", pt: "O espaço reaparecerá assim que o serviço em tempo real for ativado." },
  "La présence en ligne réapparaîtra dès que le service temps réel sera actif.": { en: "Online presence will reappear as soon as the realtime service is active.", es: "La presencia en línea reaparecerá en cuanto se active el servicio en tiempo real.", de: "Die Online-Präsenz erscheint wieder, sobald der Echtzeitdienst aktiv ist.", it: "La presenza online riapparirà non appena il servizio in tempo reale sarà attivo.", pt: "A presença online reaparecerá assim que o serviço em tempo real estiver ativo." },
  "Le bureau est ouvert": { en: "The office is open", es: "La oficina está abierta", de: "Das Büro ist geöffnet", it: "L'ufficio è aperto", pt: "O escritório está aberto" },
  "Les rejoindre": { en: "Join them", es: "Unirse a ellos", de: "Beitreten", it: "Unisciti a loro", pt: "Juntar-se a eles" },
  "Marquer l'annonce comme lue": { en: "Mark announcement as read", es: "Marcar el anuncio como leído", de: "Ankündigung als gelesen markieren", it: "Segna l'annuncio come letto", pt: "Marcar anúncio como lido" },
  "NOUVEAU": { en: "NEW", es: "NUEVO", de: "NEU", it: "NUOVO", pt: "NOVO" },
  "Nouvelle annonce Neptune": { en: "New Neptune announcement", es: "Nuevo anuncio Neptune", de: "Neue Neptune-Ankündigung", it: "Nuovo annuncio Neptune", pt: "Novo anúncio Neptune" },
  "Occupé": { en: "Busy", es: "Ocupado", de: "Beschäftigt", it: "Occupato", pt: "Ocupado" },
  "Ouvrir l’espace": { en: "Open space", es: "Abrir espacio", de: "Bereich öffnen", it: "Apri spazio", pt: "Abrir espaço" },
  "Ouvrir le groupe": { en: "Open group", es: "Abrir grupo", de: "Gruppe öffnen", it: "Apri gruppo", pt: "Abrir grupo" },
  "PAUSE": { en: "BREAK", es: "PAUSA", de: "PAUSE", it: "PAUSA", pt: "PAUSA" },
  "Pas maintenant": { en: "Not now", es: "Ahora no", de: "Jetzt nicht", it: "Non ora", pt: "Agora não" },
  "Progression du message vocal": { en: "Voice message progress", es: "Progreso del mensaje de voz", de: "Fortschritt der Sprachnachricht", it: "Avanzamento del messaggio vocale", pt: "Progresso da mensagem de voz" },
  "Proposer un rendez-vous": { en: "Suggest a meeting", es: "Proponer una cita", de: "Termin vorschlagen", it: "Proponi un appuntamento", pt: "Propor uma reunião" },
  "Quitter la salle": { en: "Leave room", es: "Salir de la sala", de: "Raum verlassen", it: "Esci dalla sala", pt: "Sair da sala" },
  "Quitter le coworking": { en: "Leave Coworking", es: "Salir del Coworking", de: "Coworking verlassen", it: "Esci dal Coworking", pt: "Sair do Coworking" },
  "Réduire": { en: "Collapse", es: "Reducir", de: "Einklappen", it: "Riduci", pt: "Reduzir" },
  "Rejoindre la salle générale": { en: "Join the general room", es: "Entrar en la sala general", de: "Allgemeinen Raum betreten", it: "Entra nella sala generale", pt: "Entrar na sala geral" },
  "Rejoindre le coworking": { en: "Join Coworking", es: "Entrar en Coworking", de: "Coworking beitreten", it: "Entra nel Coworking", pt: "Entrar no Coworking" },
  "Retour à la Map": { en: "Back to Map", es: "Volver al mapa", de: "Zurück zur Karte", it: "Torna alla mappa", pt: "Voltar ao mapa" },
  "Retour à la Map sans quitter": { en: "Back to Map without leaving", es: "Volver al mapa sin salir", de: "Zurück zur Karte, ohne zu verlassen", it: "Torna alla mappa senza uscire", pt: "Voltar ao mapa sem sair" },
  "Salle générale": { en: "General room", es: "Sala general", de: "Allgemeiner Raum", it: "Sala generale", pt: "Sala geral" },
  "Salle indisponible": { en: "Room unavailable", es: "Sala no disponible", de: "Raum nicht verfügbar", it: "Sala non disponibile", pt: "Sala indisponível" },
  "Souhaite rejoindre votre échange": { en: "Wants to join your conversation", es: "Quiere unirse a vuestra conversación", de: "Möchte eurem Gespräch beitreten", it: "Vuole unirsi alla vostra conversazione", pt: "Quer juntar-se à vossa conversa" },
  "Toquer": { en: "Knock", es: "Llamar", de: "Anklopfen", it: "Bussa", pt: "Bater à porta" },
  "Toquer pour rejoindre la visio": { en: "Knock to join the video call", es: "Llamar para unirse a la videollamada", de: "Anklopfen, um dem Videoanruf beizutreten", it: "Bussa per entrare nella videochiamata", pt: "Bater à porta para entrar na videochamada" },
  "toque à votre bureau": { en: "is knocking at your office", es: "llama a vuestra oficina", de: "klopft an euer Büro", it: "bussa al vostro ufficio", pt: "está a bater à porta do vosso escritório" },
  "Touchez l’espace pour vous déplacer": { en: "Tap the space to move", es: "Toca el espacio para moverte", de: "Tippe in den Raum, um dich zu bewegen", it: "Tocca lo spazio per spostarti", pt: "Toque no espaço para se mover" },
  "Transcription": { en: "Transcript", es: "Transcripción", de: "Transkript", it: "Trascrizione", pt: "Transcrição" },
  "Transcription indisponible": { en: "Transcript unavailable", es: "Transcripción no disponible", de: "Transkript nicht verfügbar", it: "Trascrizione non disponibile", pt: "Transcrição indisponível" },
  "UN SIGNE DU COWORKING": { en: "A COWORKING HELLO", es: "UN SALUDO DEL COWORKING", de: "EIN COWORKING-GRUSS", it: "UN SALUTO DAL COWORKING", pt: "UM OLÁ DO COWORKING" },
  "Voir tout": { en: "See all", es: "Ver todo", de: "Alles anzeigen", it: "Vedi tutto", pt: "Ver tudo" },
  "vous dit bonjour 👋": { en: "says hello 👋", es: "te saluda 👋", de: "sagt Hallo 👋", it: "ti saluta 👋", pt: "diz olá 👋" }
};

export function translateUiTextV24(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  return UI_TRANSLATIONS_V24[value]?.[locale] ?? UI_TRANSLATIONS_V24[value]?.en ?? value;
}
