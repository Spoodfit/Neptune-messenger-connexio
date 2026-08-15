import { getTranslationRequestLanguage } from "./translationLocale";
import type { HighlightPost } from "../types/experience";
import type {
  ChatMessage,
  ContentTranslation,
  Conversation,
  PollTranslation
} from "../types/messaging";

type DemoLanguage = "en" | "es" | "de" | "it" | "pt";
type TranslationSet = Partial<Record<DemoLanguage, string>>;

const CONTENT: Record<string, TranslationSet> = {
  "Qui sera présent au prochain afterwork ?": {
    en: "Who will be at the next afterwork?", es: "¿Quién estará en el próximo afterwork?", de: "Wer ist beim nächsten Afterwork dabei?", it: "Chi sarà presente al prossimo afterwork?", pt: "Quem estará presente no próximo afterwork?"
  },
  "Présent. Je prépare aussi une courte présentation de Connexio.": {
    en: "I’ll be there. I’m also preparing a short Connexio presentation.", es: "Estaré allí. También preparo una breve presentación de Connexio.", de: "Ich bin dabei. Ich bereite auch eine kurze Connexio-Präsentation vor.", it: "Ci sarò. Sto preparando anche una breve presentazione di Connexio.", pt: "Estarei lá. Também estou preparando uma breve apresentação do Connexio."
  },
  "Le vote pour choisir la prochaine thématique d’atelier est ouvert.": {
    en: "Voting to choose the next workshop topic is open.", es: "La votación para elegir el próximo tema del taller está abierta.", de: "Die Abstimmung über das nächste Workshop-Thema ist eröffnet.", it: "La votazione per scegliere il prossimo tema del workshop è aperta.", pt: "A votação para escolher o próximo tema do workshop está aberta."
  },
  "Point sur Neptune Média à 17 h. Merci d’ajouter les chiffres de conversion.": {
    en: "Neptune Media update at 5 p.m. Please add the conversion figures.", es: "Punto sobre Neptune Media a las 17:00. Añade las cifras de conversión, por favor.", de: "Neptune-Media-Update um 17 Uhr. Bitte die Conversion-Zahlen ergänzen.", it: "Aggiornamento Neptune Media alle 17. Aggiungi i dati di conversione, per favore.", pt: "Atualização da Neptune Media às 17h. Adicione os números de conversão, por favor."
  },
  "Quel créneau préférez-vous pour le prochain afterwork ?": {
    en: "Which time slot do you prefer for the next afterwork?", es: "¿Qué horario prefieres para el próximo afterwork?", de: "Welchen Termin bevorzugst du für das nächste Afterwork?", it: "Quale fascia oraria preferisci per il prossimo afterwork?", pt: "Qual horário você prefere para o próximo afterwork?"
  },
  "Jeudi 20 août · 18 h 30": {
    en: "Thursday 20 August · 6:30 p.m.", es: "Jueves 20 de agosto · 18:30", de: "Donnerstag, 20. August · 18:30", it: "Giovedì 20 agosto · 18:30", pt: "Quinta-feira, 20 de agosto · 18:30"
  },
  "Vendredi 21 août · 19 h": {
    en: "Friday 21 August · 7 p.m.", es: "Viernes 21 de agosto · 19:00", de: "Freitag, 21. August · 19:00", it: "Venerdì 21 agosto · 19:00", pt: "Sexta-feira, 21 de agosto · 19:00"
  },
  "2 évènements attendent votre vote": {
    en: "2 events are waiting for your vote", es: "2 eventos esperan tu voto", de: "2 Veranstaltungen warten auf deine Stimme", it: "2 eventi attendono il tuo voto", pt: "2 eventos aguardam seu voto"
  },
  "Je t’envoie les chiffres Neptune Média.": {
    en: "I’m sending you the Neptune Media figures.", es: "Te envío las cifras de Neptune Media.", de: "Ich schicke dir die Neptune-Media-Zahlen.", it: "Ti mando i dati di Neptune Media.", pt: "Estou enviando os números da Neptune Media."
  },
  "Tu peux me confirmer les conversions de la campagne ?": {
    en: "Can you confirm the campaign conversions?", es: "¿Puedes confirmarme las conversiones de la campaña?", de: "Kannst du mir die Conversions der Kampagne bestätigen?", it: "Puoi confermarmi le conversioni della campagna?", pt: "Você pode confirmar as conversões da campanha?"
  },
  "Parfait pour l’afterwork.": {
    en: "Perfect for the afterwork.", es: "Perfecto para el afterwork.", de: "Perfekt für das Afterwork.", it: "Perfetto per l’afterwork.", pt: "Perfeito para o afterwork."
  },
  "@Johan tu valides la miniature ?": {
    en: "@Johan do you approve the thumbnail?", es: "@Johan ¿apruebas la miniatura?", de: "@Johan gibst du das Thumbnail frei?", it: "@Johan approvi la miniatura?", pt: "@Johan você aprova a miniatura?"
  },
  "La version courte fonctionne mieux sur mobile.": {
    en: "The short version works better on mobile.", es: "La versión corta funciona mejor en móvil.", de: "Die kurze Version funktioniert auf Mobilgeräten besser.", it: "La versione breve funziona meglio su mobile.", pt: "A versão curta funciona melhor no celular."
  },
  "Première session studio validée. On affine les hooks, les plans et la livraison 24 h. Très bon niveau de rendu.": {
    en: "First studio session approved. We’re refining the hooks, shots and 24-hour delivery. The result looks excellent.", es: "Primera sesión de estudio validada. Afinamos los hooks, los planos y la entrega en 24 h. El resultado es excelente.", de: "Erste Studiosession freigegeben. Wir optimieren Hooks, Einstellungen und die 24-Stunden-Lieferung. Sehr starkes Ergebnis.", it: "Prima sessione in studio approvata. Stiamo affinando hook, inquadrature e consegna in 24 ore. Ottimo risultato.", pt: "Primeira sessão de estúdio aprovada. Estamos refinando hooks, planos e entrega em 24 horas. Excelente resultado."
  },
  "Le rendu est vraiment premium.": {
    en: "The result really looks premium.", es: "El resultado se ve realmente premium.", de: "Das Ergebnis wirkt wirklich hochwertig.", it: "Il risultato è davvero premium.", pt: "O resultado está realmente premium."
  },
  "@Léa vous avez déjà la prochaine date ?": {
    en: "@Léa do you already have the next date?", es: "@Léa ¿ya tienen la próxima fecha?", de: "@Léa habt ihr schon den nächsten Termin?", it: "@Léa avete già la prossima data?", pt: "@Léa vocês já têm a próxima data?"
  },
  "BESOIN · Je cherche un photographe disponible mardi à Carcassonne. @Neptune Business": {
    en: "NEED · I’m looking for a photographer available Tuesday in Carcassonne. @Neptune Business", es: "NECESIDAD · Busco un fotógrafo disponible el martes en Carcassonne. @Neptune Business", de: "BEDARF · Ich suche einen Fotografen, der am Dienstag in Carcassonne verfügbar ist. @Neptune Business", it: "RICHIESTA · Cerco un fotografo disponibile martedì a Carcassonne. @Neptune Business", pt: "NECESSIDADE · Procuro um fotógrafo disponível na terça-feira em Carcassonne. @Neptune Business"
  },
  "Coulisses du prochain atelier Toulouse. Vidéo courte prête à publier.": {
    en: "Behind the scenes of the next Toulouse workshop. Short video ready to publish.", es: "Entre bastidores del próximo taller de Toulouse. Vídeo corto listo para publicar.", de: "Hinter den Kulissen des nächsten Toulouse-Workshops. Kurzvideo bereit zur Veröffentlichung.", it: "Dietro le quinte del prossimo workshop di Tolosa. Video breve pronto per la pubblicazione.", pt: "Bastidores do próximo workshop de Toulouse. Vídeo curto pronto para publicar."
  },
  "Une place vient de se libérer pour l’atelier de Montpellier.": {
    en: "A spot has just opened up for the Montpellier workshop.", es: "Acaba de quedar una plaza libre para el taller de Montpellier.", de: "Für den Montpellier-Workshop ist gerade ein Platz frei geworden.", it: "Si è appena liberato un posto per il workshop di Montpellier.", pt: "Acabou de surgir uma vaga para o workshop de Montpellier."
  },
  "Le prochain atelier est ouvert aux votes.": {
    en: "The next workshop is open for voting.", es: "El próximo taller está abierto a votación.", de: "Der nächste Workshop steht zur Abstimmung.", it: "Il prossimo workshop è aperto alle votazioni.", pt: "O próximo workshop está aberto para votação."
  },
  "Le Comptoir des Vins confirme le créneau.": {
    en: "Le Comptoir des Vins confirms the time slot.", es: "Le Comptoir des Vins confirma el horario.", de: "Le Comptoir des Vins bestätigt den Termin.", it: "Le Comptoir des Vins conferma l’orario.", pt: "Le Comptoir des Vins confirma o horário."
  },
  "Bienvenue aux nouveaux membres.": {
    en: "Welcome to the new members.", es: "Bienvenidos los nuevos miembros.", de: "Willkommen an die neuen Mitglieder.", it: "Benvenuti ai nuovi membri.", pt: "Bem-vindos aos novos membros."
  },
  "Besoin d’un photographe pour mardi.": {
    en: "Need a photographer for Tuesday.", es: "Necesito un fotógrafo para el martes.", de: "Fotograf für Dienstag gesucht.", it: "Cerco un fotografo per martedì.", pt: "Preciso de um fotógrafo para terça-feira."
  },
  "Le groupe est désormais ouvert.": {
    en: "The group is now open.", es: "El grupo ya está abierto.", de: "Die Gruppe ist jetzt geöffnet.", it: "Il gruppo è ora aperto.", pt: "O grupo agora está aberto."
  },
  "Le suivi régional est à jour.": {
    en: "The regional follow-up is up to date.", es: "El seguimiento regional está al día.", de: "Das regionale Follow-up ist aktuell.", it: "Il monitoraggio regionale è aggiornato.", pt: "O acompanhamento regional está atualizado."
  },
  "Merci de valider les disponibilités partenaires.": {
    en: "Please confirm partner availability.", es: "Confirmen la disponibilidad de los socios, por favor.", de: "Bitte die Verfügbarkeit der Partner bestätigen.", it: "Confermate la disponibilità dei partner, per favore.", pt: "Confirme a disponibilidade dos parceiros, por favor."
  },
  "Le problème de connexion a été corrigé.": {
    en: "The login issue has been fixed.", es: "El problema de conexión se ha corregido.", de: "Das Anmeldeproblem wurde behoben.", it: "Il problema di accesso è stato risolto.", pt: "O problema de conexão foi corrigido."
  },
  "Nouveau post à soutenir aujourd’hui.": {
    en: "New post to support today.", es: "Nueva publicación para apoyar hoy.", de: "Neuer Beitrag, den wir heute unterstützen können.", it: "Nuovo post da sostenere oggi.", pt: "Nova publicação para apoiar hoje."
  },
  "Premier contrat signé grâce à Neptune.": {
    en: "First contract signed thanks to Neptune.", es: "Primer contrato firmado gracias a Neptune.", de: "Erster Vertrag dank Neptune unterzeichnet.", it: "Primo contratto firmato grazie a Neptune.", pt: "Primeiro contrato assinado graças à Neptune."
  },
  "Je cherche un expert Meta Ads à Toulouse.": {
    en: "I’m looking for a Meta Ads expert in Toulouse.", es: "Busco un experto en Meta Ads en Toulouse.", de: "Ich suche einen Meta-Ads-Experten in Toulouse.", it: "Cerco un esperto Meta Ads a Tolosa.", pt: "Procuro um especialista em Meta Ads em Toulouse."
  },
  "Offre de lancement disponible jusqu’à dimanche.": {
    en: "Launch offer available until Sunday.", es: "Oferta de lanzamiento disponible hasta el domingo.", de: "Einführungsangebot bis Sonntag verfügbar.", it: "Offerta di lancio disponibile fino a domenica.", pt: "Oferta de lançamento disponível até domingo."
  },
  "Disponible demain matin à Carcassonne.": {
    en: "Available tomorrow morning in Carcassonne.", es: "Disponible mañana por la mañana en Carcassonne.", de: "Morgen Vormittag in Carcassonne verfügbar.", it: "Disponibile domani mattina a Carcassonne.", pt: "Disponível amanhã de manhã em Carcassonne."
  },
  "Visio networking mercredi prochain.": {
    en: "Networking video call next Wednesday.", es: "Videollamada de networking el próximo miércoles.", de: "Networking-Video-Call nächsten Mittwoch.", it: "Video networking mercoledì prossimo.", pt: "Videochamada de networking na próxima quarta-feira."
  }
};

function targetLanguage(): DemoLanguage | null {
  const target = getTranslationRequestLanguage();
  return target === "en" || target === "es" || target === "de" || target === "it" || target === "pt"
    ? target
    : null;
}

function translated(original: string): string | undefined {
  const target = targetLanguage();
  return target ? CONTENT[original]?.[target] : undefined;
}

function translationForFields(fields: Record<string, string | undefined>): ContentTranslation | undefined {
  const target = targetLanguage();
  if (!target) return undefined;
  const translatedFields: Record<string, string> = {};
  for (const [field, original] of Object.entries(fields)) {
    if (!original) continue;
    const value = translated(original);
    if (value) translatedFields[field] = value;
  }
  if (!Object.keys(translatedFields).length) return undefined;
  return {
    targetLanguage: target,
    sourceLanguage: "fr",
    status: "ready",
    generatedAt: "2026-08-15T20:00:00.000Z",
    fields: translatedFields
  };
}

export function localizeMockConversation(conversation: Conversation): Conversation {
  const eventVoteAlert = conversation.eventVoteAlert
    ? {
        ...conversation.eventVoteAlert,
        translation: translationForFields({ title: conversation.eventVoteAlert.title })
      }
    : undefined;
  return {
    ...conversation,
    translation: translationForFields({
      description: conversation.description,
      lastMessage: conversation.lastMessage,
      pinnedMessage: conversation.pinnedMessage
    }),
    eventVoteAlert
  };
}

export function localizeMockMessage(message: ChatMessage): ChatMessage {
  const messageTranslation = message.body
    ? translationForFields({ body: message.body })
    : undefined;
  const replyPreview = message.replyPreview
    ? {
        ...message.replyPreview,
        translation: translationForFields({ body: message.replyPreview.body })
      }
    : undefined;
  let poll = message.poll;
  if (poll) {
    const target = targetLanguage();
    const question = translated(poll.question);
    const optionTranslations = Object.fromEntries(
      poll.options
        .map((option) => [option.id, translated(option.label)] as const)
        .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
    );
    const pollTranslation: PollTranslation | undefined = target && (question || Object.keys(optionTranslations).length)
      ? {
          targetLanguage: target,
          sourceLanguage: "fr",
          status: "ready",
          generatedAt: "2026-08-15T20:00:00.000Z",
          question,
          options: optionTranslations
        }
      : undefined;
    poll = { ...poll, translation: pollTranslation };
  }
  return {
    ...message,
    translation: messageTranslation
      ? { ...messageTranslation, body: messageTranslation.fields?.body }
      : message.translation,
    replyPreview,
    poll,
    attachments: message.attachments?.map((attachment) => ({
      ...attachment,
      transcriptTranslation: attachment.transcript
        ? translationForFields({ transcript: attachment.transcript })
        : attachment.transcriptTranslation
    }))
  };
}

export function localizeMockHighlightPost(post: HighlightPost): HighlightPost {
  return {
    ...post,
    translation: translationForFields({ body: post.body }),
    media: post.media
      ? {
          ...post.media,
          transcriptTranslation: post.media.transcript
            ? translationForFields({ transcript: post.media.transcript })
            : post.media.transcriptTranslation
        }
      : undefined,
    comments: post.comments.map((comment) => ({
      ...comment,
      translation: translationForFields({ body: comment.body })
    }))
  };
}
