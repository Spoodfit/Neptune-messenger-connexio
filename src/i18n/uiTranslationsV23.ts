import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V23: Record<string, TranslationSet> = {
  "Coworking": { en: "Coworking", es: "Coworking", de: "Coworking", it: "Coworking", pt: "Coworking" },
  "Focus": { en: "Focus", es: "Concentración", de: "Fokus", it: "Focus", pt: "Foco" },
  "Disponible": { en: "Available", es: "Disponible", de: "Verfügbar", it: "Disponibile", pt: "Disponível" },
  "Disponible pour échanger": { en: "Available to talk", es: "Disponible para hablar", de: "Offen für Gespräche", it: "Disponibile a parlare", pt: "Disponível para conversar" },
  "Pause": { en: "Break", es: "Pausa", de: "Pause", it: "Pausa", pt: "Pausa" },
  "Créer un espace": { en: "Create a space", es: "Crear un espacio", de: "Raum erstellen", it: "Crea uno spazio", pt: "Criar um espaço" },
  "Coworking protégé": { en: "Protected Coworking", es: "Coworking protegido", de: "Geschütztes Coworking", it: "Coworking protetto", pt: "Coworking protegido" },
  "L’espace sera activé avec le backend temps réel Connexio.": { en: "The space will be enabled with the Connexio realtime backend.", es: "El espacio se activará con el backend en tiempo real de Connexio.", de: "Der Raum wird mit dem Connexio-Echtzeit-Backend aktiviert.", it: "Lo spazio verrà attivato con il backend in tempo reale di Connexio.", pt: "O espaço será ativado com o backend em tempo real do Connexio." },
  "présent": { en: "present", es: "presente", de: "anwesend", it: "presente", pt: "presente" },
  "Hub Neptune": { en: "Neptune Hub", es: "Hub Neptune", de: "Neptune Hub", it: "Hub Neptune", pt: "Hub Neptune" },
  "ici": { en: "here", es: "aquí", de: "hier", it: "qui", pt: "aqui" },
  "Moi": { en: "Me", es: "Yo", de: "Ich", it: "Io", pt: "Eu" },
  "Le Hub est calme": { en: "The Hub is quiet", es: "El Hub está tranquilo", de: "Im Hub ist es ruhig", it: "L’Hub è tranquillo", pt: "O Hub está calmo" },
  "Entrez, les prochains membres vous verront ici.": { en: "Come in; the next members will see you here.", es: "Entra; los próximos miembros te verán aquí.", de: "Komm herein; die nächsten Mitglieder sehen dich hier.", it: "Entra: i prossimi membri ti vedranno qui.", pt: "Entre; os próximos membros verão que está aqui." },
  "Espaces en cours": { en: "Active spaces", es: "Espacios activos", de: "Aktive Räume", it: "Spazi attivi", pt: "Espaços ativos" },
  "Touchez pour revenir": { en: "Tap to return", es: "Toca para volver", de: "Tippen zum Zurückkehren", it: "Tocca per tornare", pt: "Toque para voltar" },
  "Quitter le Coworking": { en: "Leave Coworking", es: "Salir del Coworking", de: "Coworking verlassen", it: "Esci dal Coworking", pt: "Sair do Coworking" },
  "Entrer dans le Hub": { en: "Enter the Hub", es: "Entrar en el Hub", de: "Hub betreten", it: "Entra nell’Hub", pt: "Entrar no Hub" },
  "Entrer dans le Hub Neptune": { en: "Enter the Neptune Hub", es: "Entrar en el Hub Neptune", de: "Neptune Hub betreten", it: "Entra nell’Hub Neptune", pt: "Entrar no Hub Neptune" },
  "Entrée…": { en: "Entering…", es: "Entrando…", de: "Beitritt…", it: "Ingresso…", pt: "A entrar…" },
  "Micro coupé au départ": { en: "Mic muted on entry", es: "Micrófono silenciado al entrar", de: "Mikrofon beim Eintritt stumm", it: "Microfono disattivato all’ingresso", pt: "Microfone desligado ao entrar" },
  "Travailler ensemble": { en: "Work together", es: "Trabajar juntos", de: "Zusammen arbeiten", it: "Lavorare insieme", pt: "Trabalhar em conjunto" },
  "Création…": { en: "Creating…", es: "Creando…", de: "Wird erstellt…", it: "Creazione…", pt: "A criar…" },
  "Nouvel espace": { en: "New space", es: "Nuevo espacio", de: "Neuer Raum", it: "Nuovo spazio", pt: "Novo espaço" },
  "Nom de l’espace": { en: "Space name", es: "Nombre del espacio", de: "Raumname", it: "Nome dello spazio", pt: "Nome do espaço" },
  "Ouvert": { en: "Open", es: "Abierto", de: "Offen", it: "Aperto", pt: "Aberto" },
  "Privé": { en: "Private", es: "Privado", de: "Privat", it: "Privato", pt: "Privado" },
  "Avec qui ?": { en: "With whom?", es: "¿Con quién?", de: "Mit wem?", it: "Con chi?", pt: "Com quem?" },
  "Créer et entrer": { en: "Create and enter", es: "Crear y entrar", de: "Erstellen und beitreten", it: "Crea ed entra", pt: "Criar e entrar" },
  "Sur invitation": { en: "Invite only", es: "Solo con invitación", de: "Nur auf Einladung", it: "Solo su invito", pt: "Apenas por convite" },
  "Porte ouverte": { en: "Open door", es: "Puerta abierta", de: "Offene Tür", it: "Porta aperta", pt: "Porta aberta" },
  "Coworking indisponible": { en: "Coworking unavailable", es: "Coworking no disponible", de: "Coworking nicht verfügbar", it: "Coworking non disponibile", pt: "Coworking indisponível" },
  "Cet espace n’est plus actif": { en: "This space is no longer active", es: "Este espacio ya no está activo", de: "Dieser Raum ist nicht mehr aktiv", it: "Questo spazio non è più attivo", pt: "Este espaço já não está ativo" },
  "Retour au Coworking": { en: "Back to Coworking", es: "Volver al Coworking", de: "Zurück zum Coworking", it: "Torna al Coworking", pt: "Voltar ao Coworking" },
  "Retour au Coworking sans quitter": { en: "Back to Coworking without leaving", es: "Volver al Coworking sin salir", de: "Zum Coworking zurück, ohne zu verlassen", it: "Torna al Coworking senza uscire", pt: "Voltar ao Coworking sem sair" },
  "Quitter l’espace": { en: "Leave the space", es: "Salir del espacio", de: "Raum verlassen", it: "Esci dallo spazio", pt: "Sair do espaço" },
  "Connexion…": { en: "Connecting…", es: "Conectando…", de: "Verbindung…", it: "Connessione…", pt: "A ligar…" },
  "Reprendre la visio": { en: "Resume video", es: "Reanudar vídeo", de: "Video fortsetzen", it: "Riprendi video", pt: "Retomar vídeo" },
  "Coworking en cours": { en: "Coworking in progress", es: "Coworking en curso", de: "Coworking läuft", it: "Coworking in corso", pt: "Coworking em curso" },
  "Mode Focus": { en: "Focus mode", es: "Modo concentración", de: "Fokusmodus", it: "Modalità Focus", pt: "Modo Foco" },
  "Mode disponible": { en: "Available mode", es: "Modo disponible", de: "Verfügbar-Modus", it: "Modalità disponibile", pt: "Modo disponível" },
  "Couper le micro": { en: "Mute microphone", es: "Silenciar micrófono", de: "Mikrofon stummschalten", it: "Disattiva microfono", pt: "Desligar microfone" },
  "Activer le micro": { en: "Turn microphone on", es: "Activar micrófono", de: "Mikrofon einschalten", it: "Attiva microfono", pt: "Ligar microfone" },
  "Couper la caméra": { en: "Turn camera off", es: "Apagar cámara", de: "Kamera ausschalten", it: "Disattiva fotocamera", pt: "Desligar câmara" },
  "Activer la caméra": { en: "Turn camera on", es: "Activar cámara", de: "Kamera einschalten", it: "Attiva fotocamera", pt: "Ligar câmara" },
  "Vous êtes le premier ici": { en: "You’re the first one here", es: "Eres el primero aquí", de: "Du bist als Erste:r hier", it: "Sei il primo qui", pt: "É a primeira pessoa aqui" },
  "Visio Coworking mobile": { en: "Mobile Coworking video", es: "Vídeo Coworking móvil", de: "Mobile Coworking-Video", it: "Video Coworking mobile", pt: "Vídeo Coworking móvel" },
  "La prévisualisation web conserve l’espace et la présence. Le flux caméra sécurisé s’ouvre dans l’application mobile.": { en: "The web preview keeps your space and presence. The secure camera stream opens in the mobile app.", es: "La vista web mantiene tu espacio y presencia. El vídeo seguro se abre en la aplicación móvil.", de: "Die Web-Vorschau behält Raum und Präsenz bei. Der sichere Kamerastream öffnet sich in der mobilen App.", it: "L’anteprima web mantiene spazio e presenza. Il flusso video sicuro si apre nell’app mobile.", pt: "A pré-visualização web mantém o espaço e a presença. O vídeo seguro abre na aplicação móvel." },
  "Créez une nouvelle conversation pour démarrer un échange.": { en: "Create a new conversation to start chatting.", es: "Crea una nueva conversación para empezar a hablar.", de: "Erstelle eine neue Unterhaltung, um einen Austausch zu beginnen.", it: "Crea una nuova conversazione per iniziare a parlare.", pt: "Crie uma nova conversa para começar a falar." },
  "Le Coworking est momentanément indisponible.": { en: "Coworking is temporarily unavailable.", es: "El Coworking no está disponible temporalmente.", de: "Coworking ist vorübergehend nicht verfügbar.", it: "Il Coworking è temporaneamente non disponibile.", pt: "O Coworking está temporariamente indisponível." },
  "Impossible de rejoindre cet espace.": { en: "Unable to join this space.", es: "No se puede entrar en este espacio.", de: "Dieser Raum kann nicht betreten werden.", it: "Impossibile entrare in questo spazio.", pt: "Não foi possível entrar neste espaço." },
  "Impossible de quitter le Coworking.": { en: "Unable to leave Coworking.", es: "No se puede salir del Coworking.", de: "Coworking kann nicht verlassen werden.", it: "Impossibile uscire dal Coworking.", pt: "Não foi possível sair do Coworking." },
  "Votre disponibilité n’a pas pu être mise à jour.": { en: "Your availability could not be updated.", es: "No se pudo actualizar tu disponibilidad.", de: "Deine Verfügbarkeit konnte nicht aktualisiert werden.", it: "Non è stato possibile aggiornare la tua disponibilità.", pt: "Não foi possível atualizar a sua disponibilidade." }
};

export function translateUiTextV23(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  return UI_TRANSLATIONS_V23[value]?.[locale] ?? UI_TRANSLATIONS_V23[value]?.en ?? value;
}
