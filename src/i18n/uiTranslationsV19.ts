import type { SupportedLanguage } from "./languages";
import { normalizeUiLanguageCode, type SupportedUiLanguage } from "./uiTranslations";

type TranslationSet = Partial<Record<Exclude<SupportedUiLanguage, "fr">, string>>;

export const UI_TRANSLATIONS_V19: Record<string, TranslationSet> = {
  "Retrouvez votre réseau, vos conversations et les opportunités Neptune avec le même compte que Neptune Business.": { en: "Find your network, conversations and Neptune opportunities with the same account as Neptune Business.", es: "Encuentra tu red, conversaciones y oportunidades Neptune con la misma cuenta de Neptune Business.", de: "Greife mit demselben Neptune-Business-Konto auf dein Netzwerk, deine Gespräche und Neptune-Chancen zu.", it: "Ritrova la tua rete, le conversazioni e le opportunità Neptune con lo stesso account di Neptune Business.", pt: "Encontre a sua rede, conversas e oportunidades Neptune com a mesma conta do Neptune Business." },
  "J’accepte les règles d’utilisation de Connexio et les conditions Neptune.": { en: "I accept the Connexio usage rules and Neptune terms.", es: "Acepto las normas de uso de Connexio y las condiciones de Neptune.", de: "Ich akzeptiere die Connexio-Nutzungsregeln und die Neptune-Bedingungen.", it: "Accetto le regole di utilizzo di Connexio e le condizioni Neptune.", pt: "Aceito as regras de utilização do Connexio e os termos Neptune." },
  "Créez votre compte Neptune Business puis revenez ici.": { en: "Create your Neptune Business account, then come back here.", es: "Crea tu cuenta Neptune Business y vuelve aquí.", de: "Erstelle dein Neptune-Business-Konto und kehre dann hierher zurück.", it: "Crea il tuo account Neptune Business, poi torna qui.", pt: "Crie a sua conta Neptune Business e depois volte aqui." },
  "Votre mot de passe reste géré par Neptune et n’est jamais conservé dans Connexio.": { en: "Your password remains managed by Neptune and is never stored in Connexio.", es: "Tu contraseña sigue gestionada por Neptune y nunca se guarda en Connexio.", de: "Dein Passwort wird weiterhin von Neptune verwaltet und nie in Connexio gespeichert.", it: "La password resta gestita da Neptune e non viene mai salvata in Connexio.", pt: "A sua palavra-passe continua a ser gerida pela Neptune e nunca é guardada no Connexio." },

  "Découvrir, demander un coup de main et créer des opportunités.": { en: "Discover, ask for help and create opportunities.", es: "Descubre, pide ayuda y crea oportunidades.", de: "Entdecken, um Hilfe bitten und Chancen schaffen.", it: "Scopri, chiedi aiuto e crea opportunità.", pt: "Descubra, peça ajuda e crie oportunidades." },
  "Pour vous": { en: "For you", es: "Para ti", de: "Für dich", it: "Per te", pt: "Para si" },
  "Besoins": { en: "Needs", es: "Necesidades", de: "Gesuche", it: "Richieste", pt: "Necessidades" },
  "Offres": { en: "Offers", es: "Ofertas", de: "Angebote", it: "Offerte", pt: "Ofertas" },
  "Réussites": { en: "Wins", es: "Logros", de: "Erfolge", it: "Successi", pt: "Conquistas" },
  "Qu’est-ce qui peut être utile au réseau aujourd’hui ?": { en: "What could be useful to the network today?", es: "¿Qué podría ser útil para la red hoy?", de: "Was könnte dem Netzwerk heute helfen?", it: "Cosa potrebbe essere utile alla rete oggi?", pt: "O que pode ser útil para a rede hoje?" },
  "Un besoin, une réussite, une offre ou un moment à partager.": { en: "A need, a win, an offer or a moment to share.", es: "Una necesidad, un logro, una oferta o un momento para compartir.", de: "Ein Gesuch, ein Erfolg, ein Angebot oder ein Moment zum Teilen.", it: "Una richiesta, un successo, un'offerta o un momento da condividere.", pt: "Uma necessidade, uma conquista, uma oferta ou um momento para partilhar." },
  "J’ai besoin d’aide": { en: "I need help", es: "Necesito ayuda", de: "Ich brauche Hilfe", it: "Ho bisogno di aiuto", pt: "Preciso de ajuda" },
  "Je peux aider": { en: "I can help", es: "Puedo ayudar", de: "Ich kann helfen", it: "Posso aiutare", pt: "Posso ajudar" },
  "À découvrir": { en: "Discover", es: "Por descubrir", de: "Entdecken", it: "Da scoprire", pt: "A descobrir" },
  "Rien ici pour le moment": { en: "Nothing here yet", es: "Aún no hay nada aquí", de: "Hier ist noch nichts", it: "Ancora niente qui", pt: "Ainda não há nada aqui" },
  "Soyez le premier à partager quelque chose d’utile au réseau.": { en: "Be the first to share something useful with the network.", es: "Sé el primero en compartir algo útil con la red.", de: "Teile als Erste:r etwas Nützliches mit dem Netzwerk.", it: "Condividi per primo qualcosa di utile con la rete.", pt: "Seja o primeiro a partilhar algo útil com a rede." },
  "Tout": { en: "All", es: "Todo", de: "Alle", it: "Tutto", pt: "Tudo" },
  "Tous": { en: "All", es: "Todos", de: "Alle", it: "Tutti", pt: "Todos" },
  "Personnes": { en: "People", es: "Personas", de: "Personen", it: "Persone", pt: "Pessoas" },
  "Évènements": { en: "Events", es: "Eventos", de: "Events", it: "Eventi", pt: "Eventos" },
  "Personne": { en: "Person", es: "Persona", de: "Person", it: "Persona", pt: "Pessoa" },
  "Évènement": { en: "Event", es: "Evento", de: "Event", it: "Evento", pt: "Evento" },
  "Dernières 24 h": { en: "Last 24h", es: "Últimas 24 h", de: "Letzte 24 Std.", it: "Ultime 24 h", pt: "Últimas 24 h" },
  "En cours": { en: "Live", es: "En curso", de: "Läuft", it: "In corso", pt: "A decorrer" },
  "À venir": { en: "Upcoming", es: "Próximos", de: "Demnächst", it: "In arrivo", pt: "Próximos" },
  "Synchronisation évènements en attente du backend Neptune Business.": { en: "Event sync is waiting for the Neptune Business backend.", es: "La sincronización de eventos está a la espera del backend de Neptune Business.", de: "Die Event-Synchronisierung wartet auf das Neptune-Business-Backend.", it: "La sincronizzazione degli eventi è in attesa del backend Neptune Business.", pt: "A sincronização de eventos aguarda o backend Neptune Business." },
  "DERNIER TEMPS FORT": { en: "LATEST HIGHLIGHT", es: "ÚLTIMO MOMENTO", de: "LETZTES HIGHLIGHT", it: "ULTIMO MOMENTO", pt: "ÚLTIMO DESTAQUE" },
  "En cours maintenant": { en: "Happening now", es: "En curso ahora", de: "Findet jetzt statt", it: "In corso ora", pt: "A decorrer agora" },
  "Terminé il y a moins de 24 h": { en: "Ended less than 24h ago", es: "Terminó hace menos de 24 h", de: "Vor weniger als 24 Std. beendet", it: "Terminato meno di 24 h fa", pt: "Terminou há menos de 24 h" },
  "Voir l’évènement Neptune": { en: "View Neptune event", es: "Ver evento Neptune", de: "Neptune-Event ansehen", it: "Vedi evento Neptune", pt: "Ver evento Neptune" },
  "Carte de découverte Neptune": { en: "Neptune discovery map", es: "Mapa de descubrimiento Neptune", de: "Neptune-Entdeckungskarte", it: "Mappa di scoperta Neptune", pt: "Mapa de descoberta Neptune" },

  "Créer un Temps fort": { en: "Create a Highlight", es: "Crear un momento", de: "Highlight erstellen", it: "Crea un momento", pt: "Criar um destaque" },
  "Une idée, un besoin, une opportunité": { en: "An idea, a need, an opportunity", es: "Una idea, una necesidad, una oportunidad", de: "Eine Idee, ein Bedarf, eine Chance", it: "Un'idea, una richiesta, un'opportunità", pt: "Uma ideia, uma necessidade, uma oportunidade" },
  "Visible par la communauté Neptune": { en: "Visible to the Neptune community", es: "Visible para la comunidad Neptune", de: "Für die Neptune-Community sichtbar", it: "Visibile alla community Neptune", pt: "Visível para a comunidade Neptune" },
  "Partager un moment utile au réseau": { en: "Share something useful with the network", es: "Comparte algo útil con la red", de: "Etwas Nützliches mit dem Netzwerk teilen", it: "Condividi qualcosa di utile con la rete", pt: "Partilhe algo útil com a rede" },
  "Obtenir un contact ou un coup de main": { en: "Find a contact or get help", es: "Consigue un contacto o ayuda", de: "Kontakt oder Unterstützung finden", it: "Trova un contatto o ricevi aiuto", pt: "Encontre um contacto ou obtenha ajuda" },
  "Faire connaître une avancée": { en: "Share a milestone", es: "Da a conocer un avance", de: "Einen Fortschritt teilen", it: "Condividi un progresso", pt: "Partilhe um progresso" },
  "Proposer une opportunité au réseau": { en: "Offer an opportunity to the network", es: "Ofrece una oportunidad a la red", de: "Dem Netzwerk eine Chance anbieten", it: "Proponi un'opportunità alla rete", pt: "Ofereça uma oportunidade à rede" },
  "Qu’est-ce qui peut être utile ou inspirant pour le réseau ?": { en: "What could be useful or inspiring for the network?", es: "¿Qué podría ser útil o inspirador para la red?", de: "Was könnte dem Netzwerk helfen oder es inspirieren?", it: "Cosa potrebbe essere utile o stimolante per la rete?", pt: "O que pode ser útil ou inspirador para a rede?" },
  "De quoi avez-vous besoin pour avancer ?": { en: "What do you need to move forward?", es: "¿Qué necesitas para avanzar?", de: "Was brauchst du, um weiterzukommen?", it: "Di cosa hai bisogno per andare avanti?", pt: "Do que precisa para avançar?" },
  "Quelle avancée voulez-vous partager ?": { en: "What progress would you like to share?", es: "¿Qué avance quieres compartir?", de: "Welchen Fortschritt möchtest du teilen?", it: "Quale progresso vuoi condividere?", pt: "Que progresso quer partilhar?" },
  "Que pouvez-vous proposer aux membres ?": { en: "What can you offer members?", es: "¿Qué puedes ofrecer a los miembros?", de: "Was kannst du den Mitgliedern anbieten?", it: "Cosa puoi offrire ai membri?", pt: "O que pode oferecer aos membros?" },
  "À partager avec le réseau :": { en: "To share with the network:", es: "Para compartir con la red:", de: "Mit dem Netzwerk teilen:", it: "Da condividere con la rete:", pt: "Para partilhar com a rede:" },
  "Bonne nouvelle :": { en: "Good news:", es: "Buenas noticias:", de: "Gute Nachricht:", it: "Buone notizie:", pt: "Boas notícias:" },
  "Pour les membres Neptune :": { en: "For Neptune members:", es: "Para los miembros Neptune:", de: "Für Neptune-Mitglieder:", it: "Per i membri Neptune:", pt: "Para membros Neptune:" },
  "Écrivez comme vous parleriez à un membre du réseau… Utilisez @ pour mentionner.": { en: "Write as you would speak to a network member… Use @ to mention.", es: "Escribe como hablarías con un miembro de la red… Usa @ para mencionar.", de: "Schreibe so, wie du mit einem Netzwerkmitglied sprechen würdest… Nutze @ zum Erwähnen.", it: "Scrivi come parleresti a un membro della rete… Usa @ per menzionare.", pt: "Escreva como falaria com um membro da rede… Use @ para mencionar." },
  "Synchronisé avec les Besoins Neptune Business": { en: "Synced with Neptune Business Needs", es: "Sincronizado con Necesidades de Neptune Business", de: "Mit Neptune Business Gesuchen synchronisiert", it: "Sincronizzato con le richieste Neptune Business", pt: "Sincronizado com Necessidades Neptune Business" },
  "Synchronisé avec le Comité Avantage": { en: "Synced with the Benefits Committee", es: "Sincronizado con el Comité de Ventajas", de: "Mit dem Vorteils-Komitee synchronisiert", it: "Sincronizzato con il Comitato Vantaggi", pt: "Sincronizado com o Comité de Vantagens" },
  "Visible dans Connexio": { en: "Visible in Connexio", es: "Visible en Connexio", de: "In Connexio sichtbar", it: "Visibile in Connexio", pt: "Visível no Connexio" },
  "Ajouter du contexte": { en: "Add context", es: "Añadir contexto", de: "Kontext hinzufügen", it: "Aggiungi contesto", pt: "Adicionar contexto" },
  "Lieu approximatif, facultatif": { en: "Approximate location, optional", es: "Ubicación aproximada, opcional", de: "Ungefährer Ort, optional", it: "Posizione approssimativa, facoltativa", pt: "Localização aproximada, opcional" },
  "Rechercher un lieu": { en: "Search for a place", es: "Buscar un lugar", de: "Ort suchen", it: "Cerca un luogo", pt: "Procurar um local" },
  "Prêt à partager": { en: "Ready to share", es: "Listo para compartir", de: "Bereit zum Teilen", it: "Pronto da condividere", pt: "Pronto para partilhar" },
  "Ajoutez un message ou un média": { en: "Add a message or media", es: "Añade un mensaje o contenido multimedia", de: "Nachricht oder Medium hinzufügen", it: "Aggiungi un messaggio o un contenuto multimediale", pt: "Adicione uma mensagem ou multimédia" },
  "Le réseau pourra vous répondre directement.": { en: "The network will be able to reply directly.", es: "La red podrá responderte directamente.", de: "Das Netzwerk kann dir direkt antworten.", it: "La rete potrà risponderti direttamente.", pt: "A rede poderá responder-lhe diretamente." },
  "Votre Temps fort apparaîtra immédiatement dans le feed.": { en: "Your Highlight will appear in the feed immediately.", es: "Tu momento aparecerá inmediatamente en el feed.", de: "Dein Highlight erscheint sofort im Feed.", it: "Il tuo momento apparirà subito nel feed.", pt: "O seu destaque aparecerá imediatamente no feed." },

  "Entrepreneur": { en: "Entrepreneur", es: "Emprendedor", de: "Unternehmer", it: "Imprenditore", pt: "Empreendedor" },
  "Écrire un message": { en: "Send a message", es: "Enviar un mensaje", de: "Nachricht schreiben", it: "Invia un messaggio", pt: "Enviar uma mensagem" },
  "Recommander": { en: "Recommend", es: "Recomendar", de: "Empfehlen", it: "Consiglia", pt: "Recomendar" },
  "Audio": { en: "Audio", es: "Audio", de: "Audio", it: "Audio", pt: "Áudio" },
  "Neptune": { en: "Neptune", es: "Neptune", de: "Neptune", it: "Neptune", pt: "Neptune" },
  "Pourquoi se connecter ?": { en: "Why connect?", es: "¿Por qué conectar?", de: "Warum vernetzen?", it: "Perché connettersi?", pt: "Porquê conectar?" },
  "Les sujets sur lesquels une mise en relation peut être utile.": { en: "Topics where an introduction could be useful.", es: "Temas en los que una presentación puede ser útil.", de: "Themen, bei denen eine Vernetzung hilfreich sein kann.", it: "Argomenti per cui un contatto può essere utile.", pt: "Temas em que uma apresentação pode ser útil." },
  "Peut aider sur": { en: "Can help with", es: "Puede ayudar con", de: "Kann helfen bei", it: "Può aiutare con", pt: "Pode ajudar com" },
  "Recherche": { en: "Looking for", es: "Busca", de: "Sucht", it: "Cerca", pt: "Procura" },
  "Son univers professionnel": { en: "Professional universe", es: "Su universo profesional", de: "Berufliche Welt", it: "Il suo universo professionale", pt: "O seu universo profissional" },
  "Échanger à ce sujet": { en: "Talk about this", es: "Hablar de esto", de: "Darüber sprechen", it: "Parlane", pt: "Falar sobre isto" },
  "Activité récente": { en: "Recent activity", es: "Actividad reciente", de: "Letzte Aktivität", it: "Attività recente", pt: "Atividade recente" },
  "Ses derniers Temps forts dans Connexio.": { en: "Latest Highlights in Connexio.", es: "Sus últimos momentos en Connexio.", de: "Letzte Highlights in Connexio.", it: "I suoi ultimi momenti in Connexio.", pt: "Os seus últimos destaques no Connexio." },
  "Actions du profil": { en: "Profile actions", es: "Acciones del perfil", de: "Profilaktionen", it: "Azioni del profilo", pt: "Ações do perfil" },
  "Démarrer la conversation ?": { en: "Start the conversation?", es: "¿Iniciar la conversación?", de: "Gespräch starten?", it: "Iniziare la conversazione?", pt: "Iniciar a conversa?" },
  "Envoyer le message": { en: "Send message", es: "Enviar mensaje", de: "Nachricht senden", it: "Invia messaggio", pt: "Enviar mensagem" }
};

export function translateUiTextV19(value: string, language: SupportedLanguage | string): string {
  if (!value || language === "fr") return value;
  const locale = normalizeUiLanguageCode(language, "en");
  if (locale === "fr") return value;
  const translation = UI_TRANSLATIONS_V19[value]?.[locale] ?? UI_TRANSLATIONS_V19[value]?.en;
  return translation ?? value;
}
