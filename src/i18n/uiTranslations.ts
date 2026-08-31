import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "./languages";

export const UI_LANGUAGE_CODES = ["fr", "en", "es", "de", "it", "pt"] as const;
export type SupportedUiLanguage = (typeof UI_LANGUAGE_CODES)[number];

const UI_LANGUAGE_SET = new Set<string>(UI_LANGUAGE_CODES);

export const SUPPORTED_UI_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  (language): language is (typeof SUPPORTED_LANGUAGES)[number] & { code: SupportedUiLanguage } =>
    UI_LANGUAGE_SET.has(language.code)
);

export function normalizeUiLanguageCode(
  value: SupportedLanguage | string,
  fallback: SupportedUiLanguage = "en"
): SupportedUiLanguage {
  const code = String(value).trim().toLocaleLowerCase().split(/[-_]/)[0] ?? "";
  return UI_LANGUAGE_SET.has(code) ? (code as SupportedUiLanguage) : fallback;
}

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

/*
 * UI copy is bundled deliberately: changing the application language must never
 * depend on the messaging backend or on a third-party translation service.
 * French remains the canonical source string. Missing non-French entries fall
 * back to English rather than silently reverting the interface to French.
 */
const UI_TRANSLATIONS: Record<string, TranslationSet> = {
  "Messages": { en: "Messages", es: "Mensajes", de: "Nachrichten", it: "Messaggi", pt: "Mensagens" },
  "Temps forts": { en: "Highlights", es: "Momentos", de: "Highlights", it: "Momenti", pt: "Destaques" },
  "Appels": { en: "Calls", es: "Llamadas", de: "Anrufe", it: "Chiamate", pt: "Chamadas" },
  "Profil": { en: "Profile", es: "Perfil", de: "Profil", it: "Profilo", pt: "Perfil" },
  "Conversation": { en: "Conversation", es: "Conversación", de: "Unterhaltung", it: "Conversazione", pt: "Conversa" },
  "Créer": { en: "Create", es: "Crear", de: "Erstellen", it: "Crea", pt: "Criar" },
  "Nouvelle conversation": { en: "New conversation", es: "Nueva conversación", de: "Neue Unterhaltung", it: "Nuova conversazione", pt: "Nova conversa" },
  "Publier un Temps fort": { en: "Post a Highlight", es: "Publicar un Momento", de: "Highlight posten", it: "Pubblica un Momento", pt: "Publicar um Destaque" },
  "Fermer": { en: "Close", es: "Cerrar", de: "Schließen", it: "Chiudi", pt: "Fechar" },
  "Fermer les actions rapides": { en: "Close quick actions", es: "Cerrar acciones rápidas", de: "Schnellaktionen schließen", it: "Chiudi azioni rapide", pt: "Fechar ações rápidas" },
  "Fermer la création": { en: "Close create menu", es: "Cerrar menú de creación", de: "Erstellmenü schließen", it: "Chiudi menu creazione", pt: "Fechar menu de criação" },
  "Retour": { en: "Back", es: "Volver", de: "Zurück", it: "Indietro", pt: "Voltar" },
  "Annuler": { en: "Cancel", es: "Cancelar", de: "Abbrechen", it: "Annulla", pt: "Cancelar" },
  "Confirmer": { en: "Confirm", es: "Confirmar", de: "Bestätigen", it: "Conferma", pt: "Confirmar" },
  "Enregistrer": { en: "Save", es: "Guardar", de: "Speichern", it: "Salva", pt: "Guardar" },
  "Supprimer": { en: "Delete", es: "Eliminar", de: "Löschen", it: "Elimina", pt: "Eliminar" },
  "Modifier": { en: "Edit", es: "Editar", de: "Bearbeiten", it: "Modifica", pt: "Editar" },
  "Réessayer": { en: "Try again", es: "Reintentar", de: "Erneut versuchen", it: "Riprova", pt: "Tentar novamente" },
  "Rechercher": { en: "Search", es: "Buscar", de: "Suchen", it: "Cerca", pt: "Pesquisar" },
  "Envoyer": { en: "Send", es: "Enviar", de: "Senden", it: "Invia", pt: "Enviar" },
  "Partager": { en: "Share", es: "Compartir", de: "Teilen", it: "Condividi", pt: "Partilhar" },
  "Bloquer": { en: "Block", es: "Bloquear", de: "Blockieren", it: "Blocca", pt: "Bloquear" },
  "Débloquer": { en: "Unblock", es: "Desbloquear", de: "Entsperren", it: "Sblocca", pt: "Desbloquear" },
  "Groupes": { en: "Groups", es: "Grupos", de: "Gruppen", it: "Gruppi", pt: "Grupos" },
  "Privées": { en: "Private", es: "Privadas", de: "Privat", it: "Private", pt: "Privadas" },
  "Discussions de groupe": { en: "Group conversations", es: "Conversaciones de grupo", de: "Gruppenunterhaltungen", it: "Conversazioni di gruppo", pt: "Conversas de grupo" },
  "Discussions privées": { en: "Private conversations", es: "Conversaciones privadas", de: "Private Unterhaltungen", it: "Conversazioni private", pt: "Conversas privadas" },
  "Groupes et échanges privés Neptune.": { en: "Neptune groups and private conversations.", es: "Grupos Neptune y conversaciones privadas.", de: "Neptune-Gruppen und private Unterhaltungen.", it: "Gruppi Neptune e conversazioni private.", pt: "Grupos Neptune e conversas privadas." },
  "Aucun groupe visible": { en: "No visible groups", es: "No hay grupos visibles", de: "Keine sichtbaren Gruppen", it: "Nessun gruppo visibile", pt: "Nenhum grupo visível" },
  "Aucune discussion privée": { en: "No private conversations", es: "No hay conversaciones privadas", de: "Keine privaten Unterhaltungen", it: "Nessuna conversazione privata", pt: "Nenhuma conversa privada" },
  "Aucun message": { en: "No messages", es: "Sin mensajes", de: "Keine Nachrichten", it: "Nessun messaggio", pt: "Sem mensagens" },
  "actifs récemment": { en: "recently active", es: "activos recientemente", de: "kürzlich aktiv", it: "attivi di recente", pt: "ativos recentemente" },
  "Mettre en sourdine": { en: "Mute", es: "Silenciar", de: "Stummschalten", it: "Silenzia", pt: "Silenciar" },
  "Réactiver les notifications": { en: "Unmute notifications", es: "Reactivar notificaciones", de: "Benachrichtigungen aktivieren", it: "Riattiva notifiche", pt: "Reativar notificações" },
  "Informations de la conversation": { en: "Conversation info", es: "Información de la conversación", de: "Unterhaltungsdetails", it: "Informazioni conversazione", pt: "Informações da conversa" },
  "Paramètres et membres du groupe": { en: "Group settings and members", es: "Ajustes y miembros del grupo", de: "Gruppeneinstellungen und Mitglieder", it: "Impostazioni e membri del gruppo", pt: "Definições e membros do grupo" },
  "Quitter le groupe": { en: "Leave group", es: "Salir del grupo", de: "Gruppe verlassen", it: "Lascia il gruppo", pt: "Sair do grupo" },
  "Rejoindre le groupe": { en: "Join group", es: "Unirse al grupo", de: "Gruppe beitreten", it: "Unisciti al gruppo", pt: "Entrar no grupo" },
  "Messagerie temporairement protégée": { en: "Messaging temporarily protected", es: "Mensajería temporalmente protegida", de: "Messaging vorübergehend geschützt", it: "Messaggistica temporaneamente protetta", pt: "Mensagens temporariamente protegidas" },
  "Discussions indisponibles": { en: "Conversations unavailable", es: "Conversaciones no disponibles", de: "Unterhaltungen nicht verfügbar", it: "Conversazioni non disponibili", pt: "Conversas indisponíveis" },
  "Ajouter au message": { en: "Add to message", es: "Añadir al mensaje", de: "Zur Nachricht hinzufügen", it: "Aggiungi al messaggio", pt: "Adicionar à mensagem" },
  "Photos": { en: "Photos", es: "Fotos", de: "Fotos", it: "Foto", pt: "Fotos" },
  "Vidéos": { en: "Videos", es: "Vídeos", de: "Videos", it: "Video", pt: "Vídeos" },
  "Documents": { en: "Documents", es: "Documentos", de: "Dokumente", it: "Documenti", pt: "Documentos" },
  "Fichiers": { en: "Files", es: "Archivos", de: "Dateien", it: "File", pt: "Ficheiros" },
  "Localisation": { en: "Location", es: "Ubicación", de: "Standort", it: "Posizione", pt: "Localização" },
  "Sondage": { en: "Poll", es: "Encuesta", de: "Umfrage", it: "Sondaggio", pt: "Sondagem" },
  "Créer un sondage": { en: "Create a poll", es: "Crear una encuesta", de: "Umfrage erstellen", it: "Crea un sondaggio", pt: "Criar uma sondagem" },
  "Recommander": { en: "Recommend", es: "Recomendar", de: "Empfehlen", it: "Consiglia", pt: "Recomendar" },
  "Écrire un message…": { en: "Write a message…", es: "Escribe un mensaje…", de: "Nachricht schreiben…", it: "Scrivi un messaggio…", pt: "Escrever uma mensagem…" },
  "Écrire un message": { en: "Write a message", es: "Escribir un mensaje", de: "Nachricht schreiben", it: "Scrivi un messaggio", pt: "Escrever uma mensagem" },
  "Conversation en lecture seule": { en: "Read-only conversation", es: "Conversación de solo lectura", de: "Schreibgeschützte Unterhaltung", it: "Conversazione in sola lettura", pt: "Conversa apenas de leitura" },
  "Conversation introuvable": { en: "Conversation not found", es: "Conversación no encontrada", de: "Unterhaltung nicht gefunden", it: "Conversazione non trovata", pt: "Conversa não encontrada" },
  "En attente": { en: "Queued", es: "En espera", de: "Warteschlange", it: "In attesa", pt: "Em espera" },
  "Envoi en cours": { en: "Sending", es: "Enviando", de: "Wird gesendet", it: "Invio in corso", pt: "A enviar" },
  "Envoyé": { en: "Sent", es: "Enviado", de: "Gesendet", it: "Inviato", pt: "Enviado" },
  "Distribué": { en: "Delivered", es: "Entregado", de: "Zugestellt", it: "Consegnato", pt: "Entregue" },
  "Lu": { en: "Read", es: "Leído", de: "Gelesen", it: "Letto", pt: "Lido" },
  "Échec de l’envoi": { en: "Send failed", es: "Error de envío", de: "Senden fehlgeschlagen", it: "Invio non riuscito", pt: "Falha no envio" },
  "Réessayer l’envoi de ce message": { en: "Retry sending this message", es: "Reintentar el envío", de: "Nachricht erneut senden", it: "Riprova a inviare", pt: "Tentar enviar novamente" },
  "Annuler la réponse": { en: "Cancel reply", es: "Cancelar respuesta", de: "Antwort abbrechen", it: "Annulla risposta", pt: "Cancelar resposta" },
  "Appeler en audio": { en: "Audio call", es: "Llamada de audio", de: "Audioanruf", it: "Chiamata audio", pt: "Chamada de áudio" },
  "Appeler en vidéo": { en: "Video call", es: "Videollamada", de: "Videoanruf", it: "Videochiamata", pt: "Videochamada" },
  "Feed": { en: "Feed", es: "Feed", de: "Feed", it: "Feed", pt: "Feed" },
  "Map": { en: "Map", es: "Mapa", de: "Karte", it: "Mappa", pt: "Mapa" },
  "Carte": { en: "Map", es: "Mapa", de: "Karte", it: "Mappa", pt: "Mapa" },
  "Commentaires": { en: "Comments", es: "Comentarios", de: "Kommentare", it: "Commenti", pt: "Comentários" },
  "Commenter": { en: "Comment", es: "Comentar", de: "Kommentieren", it: "Commenta", pt: "Comentar" },
  "Partager le Temps fort": { en: "Share Highlight", es: "Compartir Momento", de: "Highlight teilen", it: "Condividi Momento", pt: "Partilhar Destaque" },
  "Aucun Temps fort visible.": { en: "No Highlights visible.", es: "No hay Momentos visibles.", de: "Keine Highlights sichtbar.", it: "Nessun Momento visibile.", pt: "Nenhum Destaque visível." },
  "CAPTUREZ L’INSTANT": { en: "CAPTURE THE MOMENT", es: "CAPTURA EL MOMENTO", de: "HALTE DEN MOMENT FEST", it: "CATTURA IL MOMENTO", pt: "CAPTA O MOMENTO" },
  "Donnez le ton": { en: "Set the tone", es: "Marca el tono", de: "Gib den Ton an", it: "Dai il tono", pt: "Define o tom" },
  "Ajouter une photo": { en: "Add a photo", es: "Añadir una foto", de: "Foto hinzufügen", it: "Aggiungi una foto", pt: "Adicionar uma foto" },
  "Enregistrer un Temps fort vocal": { en: "Record a voice Highlight", es: "Grabar un Momento de voz", de: "Sprach-Highlight aufnehmen", it: "Registra un Momento vocale", pt: "Gravar um Destaque de voz" },
  "Programmer": { en: "Schedule", es: "Programar", de: "Planen", it: "Programma", pt: "Agendar" },
  "À joindre rapidement": { en: "Quick contacts", es: "Contactos rápidos", de: "Schnell erreichbar", it: "Contatti rapidi", pt: "Contactos rápidos" },
  "Aucun appel programmé": { en: "No scheduled calls", es: "No hay llamadas programadas", de: "Keine geplanten Anrufe", it: "Nessuna chiamata programmata", pt: "Nenhuma chamada agendada" },
  "À quelle heure ?": { en: "What time?", es: "¿A qué hora?", de: "Um wie viel Uhr?", it: "A che ora?", pt: "A que horas?" },
  "Objet de l’appel": { en: "Call subject", es: "Motivo de la llamada", de: "Anrufgrund", it: "Oggetto della chiamata", pt: "Assunto da chamada" },
  "Appel audio Connexio": { en: "Connexio audio call", es: "Llamada de audio Connexio", de: "Connexio-Audioanruf", it: "Chiamata audio Connexio", pt: "Chamada de áudio Connexio" },
  "Accepter l’appel": { en: "Accept call", es: "Aceptar llamada", de: "Anruf annehmen", it: "Accetta chiamata", pt: "Aceitar chamada" },
  "Refuser": { en: "Decline", es: "Rechazar", de: "Ablehnen", it: "Rifiuta", pt: "Recusar" },
  "Raccrocher": { en: "End call", es: "Colgar", de: "Auflegen", it: "Termina chiamata", pt: "Desligar" },
  "Langue de Connexio": { en: "Connexio language", es: "Idioma de Connexio", de: "Connexio-Sprache", it: "Lingua di Connexio", pt: "Idioma do Connexio" },
  "Langue du téléphone": { en: "Phone language", es: "Idioma del teléfono", de: "Telefonsprache", it: "Lingua del telefono", pt: "Idioma do telefone" },
  "Automatique": { en: "Automatic", es: "Automático", de: "Automatisch", it: "Automatico", pt: "Automático" },
  "Rechercher une langue…": { en: "Search a language…", es: "Buscar un idioma…", de: "Sprache suchen…", it: "Cerca una lingua…", pt: "Pesquisar um idioma…" },
  "Définit aussi la langue de lecture automatique des messages traduits.": { en: "Also sets the language used to read translated messages.", es: "También define el idioma de lectura de los mensajes traducidos.", de: "Legt auch die Sprache zum Vorlesen übersetzter Nachrichten fest.", it: "Imposta anche la lingua di lettura dei messaggi tradotti.", pt: "Também define o idioma de leitura das mensagens traduzidas." },
  "Choisissez la langue par défaut de Connexio et des traductions automatiques.": { en: "Choose the default language for Connexio and automatic translations.", es: "Elige el idioma predeterminado de Connexio y de las traducciones automáticas.", de: "Wähle die Standardsprache für Connexio und automatische Übersetzungen.", it: "Scegli la lingua predefinita di Connexio e delle traduzioni automatiche.", pt: "Escolhe o idioma predefinido do Connexio e das traduções automáticas." },
  "Changer la langue de Connexio": { en: "Change Connexio language", es: "Cambiar idioma de Connexio", de: "Connexio-Sprache ändern", it: "Cambia lingua di Connexio", pt: "Alterar idioma do Connexio" },
  "Apparence": { en: "Appearance", es: "Apariencia", de: "Darstellung", it: "Aspetto", pt: "Aparência" },
  "Clair": { en: "Light", es: "Claro", de: "Hell", it: "Chiaro", pt: "Claro" },
  "Sombre": { en: "Dark", es: "Oscuro", de: "Dunkel", it: "Scuro", pt: "Escuro" },
  "Système": { en: "System", es: "Sistema", de: "System", it: "Sistema", pt: "Sistema" },
  "Connexio peut suivre automatiquement le thème de votre téléphone.": { en: "Connexio can automatically follow your phone theme.", es: "Connexio puede seguir automáticamente el tema del teléfono.", de: "Connexio kann automatisch dem Telefonthema folgen.", it: "Connexio può seguire automaticamente il tema del telefono.", pt: "O Connexio pode seguir automaticamente o tema do telefone." },
  "Compte": { en: "Account", es: "Cuenta", de: "Konto", it: "Account", pt: "Conta" },
  "Confidentialité": { en: "Privacy", es: "Privacidad", de: "Datenschutz", it: "Privacy", pt: "Privacidade" },
  "Notifications": { en: "Notifications", es: "Notificaciones", de: "Benachrichtigungen", it: "Notifiche", pt: "Notificações" },
  "Membres bloqués": { en: "Blocked members", es: "Miembros bloqueados", de: "Blockierte Mitglieder", it: "Membri bloccati", pt: "Membros bloqueados" },
  "Déconnexion": { en: "Sign out", es: "Cerrar sesión", de: "Abmelden", it: "Disconnetti", pt: "Terminar sessão" },
  "Annuaire de l’écosystème Neptune.": { en: "Neptune ecosystem directory.", es: "Directorio del ecosistema Neptune.", de: "Verzeichnis des Neptune-Ökosystems.", it: "Elenco dell’ecosistema Neptune.", pt: "Diretório do ecossistema Neptune." },
  "Annuaire des membres Neptune": { en: "Neptune member directory", es: "Directorio de miembros Neptune", de: "Neptune-Mitgliederverzeichnis", it: "Elenco membri Neptune", pt: "Diretório de membros Neptune" },
  "Aucun profil ne correspond à cette recherche.": { en: "No profile matches this search.", es: "Ningún perfil coincide con esta búsqueda.", de: "Kein Profil entspricht dieser Suche.", it: "Nessun profilo corrisponde alla ricerca.", pt: "Nenhum perfil corresponde à pesquisa." },
  "Choisir un contact du téléphone": { en: "Choose a phone contact", es: "Elegir un contacto del teléfono", de: "Telefonkontakt auswählen", it: "Scegli un contatto del telefono", pt: "Escolher um contacto do telefone" },
  "Choisir dans mes contacts": { en: "Choose from contacts", es: "Elegir de mis contactos", de: "Aus Kontakten wählen", it: "Scegli dai contatti", pt: "Escolher dos contactos" },
  "Aucun numéro SMS": { en: "No SMS number", es: "Sin número SMS", de: "Keine SMS-Nummer", it: "Nessun numero SMS", pt: "Sem número SMS" },
  "Activité professionnelle": { en: "Professional activity", es: "Actividad profesional", de: "Berufliche Tätigkeit", it: "Attività professionale", pt: "Atividade profissional" },
  "Derniers Temps forts": { en: "Latest Highlights", es: "Últimos Momentos", de: "Neueste Highlights", it: "Ultimi Momenti", pt: "Últimos Destaques" },
  "Échanger à ce sujet": { en: "Discuss this", es: "Hablar de esto", de: "Darüber sprechen", it: "Parlane", pt: "Falar sobre isto" },
  "Échanger par message": { en: "Message", es: "Mensaje", de: "Nachricht", it: "Messaggio", pt: "Mensagem" },
  "Démarrer la mise en relation ?": { en: "Start the introduction?", es: "¿Iniciar la conexión?", de: "Kontakt herstellen?", it: "Avviare il contatto?", pt: "Iniciar a apresentação?" },
  "Aide à la connexion": { en: "Sign-in help", es: "Ayuda de acceso", de: "Anmeldehilfe", it: "Aiuto accesso", pt: "Ajuda de acesso" },
  "Adresse email Neptune": { en: "Neptune email address", es: "Correo electrónico Neptune", de: "Neptune-E-Mail-Adresse", it: "Indirizzo email Neptune", pt: "Endereço de email Neptune" },
  "Mot de passe": { en: "Password", es: "Contraseña", de: "Passwort", it: "Password", pt: "Palavra-passe" },
  "Se connecter": { en: "Sign in", es: "Iniciar sesión", de: "Anmelden", it: "Accedi", pt: "Iniciar sessão" },
  "Créer un compte Neptune": { en: "Create a Neptune account", es: "Crear una cuenta Neptune", de: "Neptune-Konto erstellen", it: "Crea un account Neptune", pt: "Criar uma conta Neptune" },
  "Accès membre": { en: "Member access", es: "Acceso de miembro", de: "Mitgliederzugang", it: "Accesso membro", pt: "Acesso de membro" },
  "Aucun achat dans Connexio": { en: "No purchases in Connexio", es: "Sin compras en Connexio", de: "Keine Käufe in Connexio", it: "Nessun acquisto in Connexio", pt: "Sem compras no Connexio" },
  "Paramètres": { en: "Settings", es: "Ajustes", de: "Einstellungen", it: "Impostazioni", pt: "Definições" },
  "Membres": { en: "Members", es: "Miembros", de: "Mitglieder", it: "Membri", pt: "Membros" },
  "Ajouter un membre": { en: "Add member", es: "Añadir miembro", de: "Mitglied hinzufügen", it: "Aggiungi membro", pt: "Adicionar membro" },
  "Description": { en: "Description", es: "Descripción", de: "Beschreibung", it: "Descrizione", pt: "Descrição" },
  "Description du groupe": { en: "Group description", es: "Descripción del grupo", de: "Gruppenbeschreibung", it: "Descrizione del gruppo", pt: "Descrição do grupo" },
  "Administration Visionnaire": { en: "Visionnaire administration", es: "Administración Visionnaire", de: "Visionnaire-Verwaltung", it: "Amministrazione Visionnaire", pt: "Administração Visionnaire" },
  "Automatisations": { en: "Automations", es: "Automatizaciones", de: "Automatisierungen", it: "Automazioni", pt: "Automações" },
  "Automatisations du groupe": { en: "Group automations", es: "Automatizaciones del grupo", de: "Gruppenautomatisierungen", it: "Automazioni del gruppo", pt: "Automações do grupo" },
  "Démarrage rapide": { en: "Quick start", es: "Inicio rápido", de: "Schnellstart", it: "Avvio rapido", pt: "Início rápido" },
  "Date": { en: "Date", es: "Fecha", de: "Datum", it: "Data", pt: "Data" },
  "Aucune automatisation": { en: "No automations", es: "Sin automatizaciones", de: "Keine Automatisierungen", it: "Nessuna automazione", pt: "Sem automações" },
  "Choisir les alertes utiles": { en: "Choose useful alerts", es: "Elige las alertas útiles", de: "Relevante Hinweise auswählen", it: "Scegli gli avvisi utili", pt: "Escolher alertas úteis" },
  "Chargement des préférences…": { en: "Loading preferences…", es: "Cargando preferencias…", de: "Einstellungen werden geladen…", it: "Caricamento preferenze…", pt: "A carregar preferências…" },
  "Aucun membre bloqué": { en: "No blocked members", es: "No hay miembros bloqueados", de: "Keine blockierten Mitglieder", it: "Nessun membro bloccato", pt: "Nenhum membro bloqueado" },
  "Effets du blocage": { en: "Blocking effects", es: "Efectos del bloqueo", de: "Auswirkungen der Blockierung", it: "Effetti del blocco", pt: "Efeitos do bloqueio" },
  "Appareils et sessions": { en: "Devices and sessions", es: "Dispositivos y sesiones", de: "Geräte und Sitzungen", it: "Dispositivi e sessioni", pt: "Dispositivos e sessões" },
  "Confirmer avec votre mot de passe Neptune": { en: "Confirm with your Neptune password", es: "Confirma con tu contraseña Neptune", de: "Mit Neptune-Passwort bestätigen", it: "Conferma con la password Neptune", pt: "Confirmar com a palavra-passe Neptune" },
  "Conditions d’utilisation": { en: "Terms of use", es: "Condiciones de uso", de: "Nutzungsbedingungen", it: "Condizioni d’uso", pt: "Termos de utilização" },
  "Documents et droits": { en: "Documents and rights", es: "Documentos y derechos", de: "Dokumente und Rechte", it: "Documenti e diritti", pt: "Documentos e direitos" },
  "Contacter le support Neptune": { en: "Contact Neptune support", es: "Contactar con soporte Neptune", de: "Neptune-Support kontaktieren", it: "Contatta il supporto Neptune", pt: "Contactar o suporte Neptune" },
  "Chargement des messages": { en: "Loading messages", es: "Cargando mensajes", de: "Nachrichten werden geladen", it: "Caricamento messaggi", pt: "A carregar mensagens" },
  "Chargement des messages précédents": { en: "Loading earlier messages", es: "Cargando mensajes anteriores", de: "Frühere Nachrichten werden geladen", it: "Caricamento messaggi precedenti", pt: "A carregar mensagens anteriores" },
  "Action impossible": { en: "Action unavailable", es: "Acción no disponible", de: "Aktion nicht möglich", it: "Azione non disponibile", pt: "Ação indisponível" },
  "Contenu indisponible": { en: "Content unavailable", es: "Contenido no disponible", de: "Inhalt nicht verfügbar", it: "Contenuto non disponibile", pt: "Conteúdo indisponível" },
  "Enregistrement impossible": { en: "Could not save", es: "No se pudo guardar", de: "Speichern nicht möglich", it: "Impossibile salvare", pt: "Não foi possível guardar" },
  "Création impossible": { en: "Could not create", es: "No se pudo crear", de: "Erstellen nicht möglich", it: "Impossibile creare", pt: "Não foi possível criar" },
  "Conversation impossible": { en: "Conversation unavailable", es: "Conversación no disponible", de: "Unterhaltung nicht möglich", it: "Conversazione non disponibile", pt: "Conversa indisponível" },
  "Appel impossible": { en: "Call unavailable", es: "Llamada no disponible", de: "Anruf nicht möglich", it: "Chiamata non disponibile", pt: "Chamada indisponível" },
  "Blocage impossible": { en: "Could not block", es: "No se pudo bloquear", de: "Blockieren nicht möglich", it: "Impossibile bloccare", pt: "Não foi possível bloquear" },
  "Déblocage impossible": { en: "Could not unblock", es: "No se pudo desbloquear", de: "Entsperren nicht möglich", it: "Impossibile sbloccare", pt: "Não foi possível desbloquear" },
  "Cette destination n’existe pas": { en: "This destination does not exist", es: "Este destino no existe", de: "Dieses Ziel existiert nicht", it: "Questa destinazione non esiste", pt: "Este destino não existe" }
};

function splitPadding(value: string): { prefix: string; core: string; suffix: string } {
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  return { prefix: leading, core: value.slice(leading.length, value.length - trailing.length), suffix: trailing };
}

export function translateUiText(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  const { prefix, core, suffix } = splitPadding(value);
  const translation = UI_TRANSLATIONS[core]?.[locale] ?? UI_TRANSLATIONS[core]?.en;
  return translation ? `${prefix}${translation}${suffix}` : value;
}
