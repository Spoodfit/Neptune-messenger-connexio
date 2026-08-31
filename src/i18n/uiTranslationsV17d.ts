import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V17D: Record<string, TranslationSet> = {
  "by Neptune": { en: "by Neptune", es: "by Neptune", de: "by Neptune", it: "by Neptune", pt: "by Neptune" },
  "Cité de Carcassonne": { en: "Cité de Carcassonne", es: "Cité de Carcassonne", de: "Cité de Carcassonne", it: "Cité de Carcassonne", pt: "Cité de Carcassonne" },
  "Comité Avantage": { en: "Comité Avantage", es: "Comité Avantage", de: "Comité Avantage", it: "Comité Avantage", pt: "Comité Avantage" },
  "COMITÉ AVANTAGE": { en: "COMITÉ AVANTAGE", es: "COMITÉ AVANTAGE", de: "COMITÉ AVANTAGE", it: "COMITÉ AVANTAGE", pt: "COMITÉ AVANTAGE" },
  "CONNEXIO": { en: "CONNEXIO", es: "CONNEXIO", de: "CONNEXIO", it: "CONNEXIO", pt: "CONNEXIO" },
  "Connexio reconnaît automatiquement le statut associé à votre compte Neptune Business. Certaines fonctions sont disponibles uniquement pour les niveaux d’adhésion concernés.": { en: "Connexio automatically recognizes the status linked to your Neptune Business account. Some features are available only to the relevant membership levels.", es: "Connexio reconoce automáticamente el estado asociado a tu cuenta de Neptune Business. Algunas funciones solo están disponibles para los niveles de membresía correspondientes.", de: "Connexio erkennt automatisch den mit Ihrem Neptune-Business-Konto verknüpften Status. Einige Funktionen sind nur für die entsprechenden Mitgliedschaftsstufen verfügbar.", it: "Connexio riconosce automaticamente lo stato associato al tuo account Neptune Business. Alcune funzioni sono disponibili solo per i relativi livelli di adesione.", pt: "O Connexio reconhece automaticamente o estatuto associado à sua conta Neptune Business. Algumas funcionalidades estão disponíveis apenas para os níveis de adesão correspondentes." },
  "Espaces": { en: "Spaces", es: "Espacios", de: "Bereiche", it: "Spazi", pt: "Espaços" },
  "Espaces Neptune": { en: "Neptune Spaces", es: "Espacios Neptune", de: "Neptune-Bereiche", it: "Spazi Neptune", pt: "Espaços Neptune" },
  "Espaces Neptune accessibles": { en: "Accessible Neptune Spaces", es: "Espacios Neptune accesibles", de: "Zugängliche Neptune-Bereiche", it: "Spazi Neptune accessibili", pt: "Espaços Neptune acessíveis" },
  "Fermer les options": { en: "Close options", es: "Cerrar opciones", de: "Optionen schließen", it: "Chiudi opzioni", pt: "Fechar opções" },
  "HH:MM": { en: "HH:MM", es: "HH:MM", de: "HH:MM", it: "HH:MM", pt: "HH:MM" },
  "JJ/MM/AAAA": { en: "DD/MM/YYYY", es: "DD/MM/AAAA", de: "TT.MM.JJJJ", it: "GG/MM/AAAA", pt: "DD/MM/AAAA" },
  "Map, présence, téléphone et visibilité du profil": { en: "Map, presence, phone and profile visibility", es: "Mapa, presencia, teléfono y visibilidad del perfil", de: "Karte, Präsenz, Telefon und Profilsichtbarkeit", it: "Mappa, presenza, telefono e visibilità del profilo", pt: "Mapa, presença, telefone e visibilidade do perfil" },
  "membre": { en: "member", es: "miembro", de: "Mitglied", it: "membro", pt: "membro" },
  "membres ·": { en: "members ·", es: "miembros ·", de: "Mitglieder ·", it: "membri ·", pt: "membros ·" },
  "membres maximum": { en: "members maximum", es: "miembros como máximo", de: "Mitglieder maximal", it: "membri massimo", pt: "membros no máximo" },
  "Messages, mentions, groupes, Temps forts et appels": { en: "Messages, mentions, groups, Highlights and calls", es: "Mensajes, menciones, grupos, Momentos y llamadas", de: "Nachrichten, Erwähnungen, Gruppen, Highlights und Anrufe", it: "Messaggi, menzioni, gruppi, Momenti e chiamate", pt: "Mensagens, menções, grupos, Destaques e chamadas" },
  "Mini-groupe privé ·": { en: "Private mini-group ·", es: "Minigrupo privado ·", de: "Private Minigruppe ·", it: "Mini-gruppo privato ·", pt: "Minigrupo privado ·" },
  "minutes maximum ·": { en: "minutes maximum ·", es: "minutos como máximo ·", de: "Minuten maximal ·", it: "minuti massimo ·", pt: "minutos no máximo ·" },
  "Mo maximum · transcription générée après l’envoi lorsqu’elle est disponible.": { en: "MB maximum · transcript generated after sending when available.", es: "MB como máximo · transcripción generada después del envío cuando esté disponible.", de: "MB maximal · Transkript wird nach dem Senden erstellt, sofern verfügbar.", it: "MB massimo · trascrizione generata dopo l’invio quando disponibile.", pt: "MB no máximo · transcrição gerada após o envio quando disponível." },
  "Narbonne": { en: "Narbonne", es: "Narbonne", de: "Narbonne", it: "Narbonne", pt: "Narbonne" },
  "Ne communiquez jamais un code reçu à une autre personne. Neptune ne vous demandera pas ce code par téléphone ou message.": { en: "Never share a code you receive with anyone else. Neptune will never ask you for this code by phone or message.", es: "Nunca compartas con otra persona un código que hayas recibido. Neptune nunca te pedirá este código por teléfono o mensaje.", de: "Geben Sie einen erhaltenen Code niemals an andere Personen weiter. Neptune wird Sie niemals per Telefon oder Nachricht danach fragen.", it: "Non comunicare mai a un’altra persona un codice ricevuto. Neptune non ti chiederà mai questo codice per telefono o messaggio.", pt: "Nunca partilhe com outra pessoa um código recebido. A Neptune nunca lhe pedirá este código por telefone ou mensagem." },
  "Obtenir un code Connexio": { en: "Get a Connexio code", es: "Obtener un código Connexio", de: "Connexio-Code erhalten", it: "Ottieni un codice Connexio", pt: "Obter um código Connexio" },
  "participants": { en: "participants", es: "participantes", de: "Teilnehmende", it: "partecipanti", pt: "participantes" },
  "participants au total, vous compris.": { en: "participants in total, including you.", es: "participantes en total, incluido tú.", de: "Teilnehmende insgesamt, einschließlich Ihnen.", it: "partecipanti in totale, compreso te.", pt: "participantes no total, incluindo-o." },
  "Position approximative · ±": { en: "Approximate location · ±", es: "Ubicación aproximada · ±", de: "Ungefährer Standort · ±", it: "Posizione approssimativa · ±", pt: "Localização aproximada · ±" },
  "Publication…": { en: "Publishing…", es: "Publicando…", de: "Wird veröffentlicht…", it: "Pubblicazione…", pt: "A publicar…" },
  "Publications, besoins, offres et proximité Neptune.": { en: "Posts, needs, offers and the Neptune community around you.", es: "Publicaciones, necesidades, ofertas y comunidad Neptune cercana.", de: "Beiträge, Bedarfe, Angebote und Neptune in Ihrer Nähe.", it: "Pubblicazioni, esigenze, offerte e comunità Neptune vicina.", pt: "Publicações, necessidades, ofertas e comunidade Neptune próxima." },
  "Rappel non programmé": { en: "Reminder not scheduled", es: "Recordatorio no programado", de: "Erinnerung nicht geplant", it: "Promemoria non programmato", pt: "Lembrete não agendado" },
  "Services, produits et activités synchronisés avec votre profil Neptune.": { en: "Services, products and activities synchronized with your Neptune profile.", es: "Servicios, productos y actividades sincronizados con tu perfil Neptune.", de: "Dienstleistungen, Produkte und Aktivitäten, die mit Ihrem Neptune-Profil synchronisiert sind.", it: "Servizi, prodotti e attività sincronizzati con il tuo profilo Neptune.", pt: "Serviços, produtos e atividades sincronizados com o seu perfil Neptune." },
  "Télécharger vos données, consulter vos sessions ou demander la suppression de votre compte.": { en: "Download your data, review your sessions or request account deletion.", es: "Descarga tus datos, consulta tus sesiones o solicita la eliminación de tu cuenta.", de: "Laden Sie Ihre Daten herunter, prüfen Sie Ihre Sitzungen oder beantragen Sie die Löschung Ihres Kontos.", it: "Scarica i tuoi dati, consulta le sessioni o richiedi l’eliminazione dell’account.", pt: "Transfira os seus dados, consulte as suas sessões ou peça a eliminação da conta." },
  "Téléski Nautique de Bram": { en: "Téléski Nautique de Bram", es: "Téléski Nautique de Bram", de: "Téléski Nautique de Bram", it: "Téléski Nautique de Bram", pt: "Téléski Nautique de Bram" },
  "un responsable": { en: "a manager", es: "un responsable", de: "eine verantwortliche Person", it: "un responsabile", pt: "um responsável" },
  "Utilisez les actions « Signaler » et « Bloquer » disponibles dans Connexio. Pour une question de sécurité ou de modération, contactez également le support Neptune depuis les réglages.": { en: "Use the Report and Block actions available in Connexio. For a safety or moderation issue, you can also contact Neptune support from Settings.", es: "Usa las acciones Denunciar y Bloquear disponibles en Connexio. Para cuestiones de seguridad o moderación, también puedes contactar con el soporte de Neptune desde Ajustes.", de: "Verwenden Sie die in Connexio verfügbaren Aktionen Melden und Blockieren. Bei Sicherheits- oder Moderationsfragen können Sie den Neptune-Support auch über die Einstellungen kontaktieren.", it: "Usa le azioni Segnala e Blocca disponibili in Connexio. Per questioni di sicurezza o moderazione, puoi anche contattare l’assistenza Neptune dalle Impostazioni.", pt: "Use as ações Denunciar e Bloquear disponíveis no Connexio. Para questões de segurança ou moderação, também pode contactar o suporte Neptune nas Definições." },
  "Voir dans Neptune": { en: "View in Neptune", es: "Ver en Neptune", de: "In Neptune anzeigen", it: "Vedi in Neptune", pt: "Ver no Neptune" },
  "vote": { en: "vote", es: "voto", de: "Stimme", it: "voto", pt: "voto" },
  "VOTE DU CLUB": { en: "CLUB VOTE", es: "VOTACIÓN DEL CLUB", de: "CLUB-ABSTIMMUNG", it: "VOTO DEL CLUB", pt: "VOTAÇÃO DO CLUBE" },
  "Voter": { en: "Vote", es: "Votar", de: "Abstimmen", it: "Vota", pt: "Votar" }
};

function splitPadding(value: string): { prefix: string; core: string; suffix: string } {
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  return { prefix: leading, core: value.slice(leading.length, value.length - trailing.length), suffix: trailing };
}

export function translateUiTextV17D(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  const { prefix, core, suffix } = splitPadding(value);
  const translation = UI_TRANSLATIONS_V17D[core]?.[locale] ?? UI_TRANSLATIONS_V17D[core]?.en;
  return translation ? `${prefix}${translation}${suffix}` : value;
}
