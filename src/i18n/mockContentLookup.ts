import { getTranslationRequestLanguage } from "./translationLocale";
import type {
  ContentTranslation,
  MessagePoll,
  PollTranslation
} from "../types/messaging";

type DemoLanguage = "fr" | "en" | "es" | "de" | "it" | "pt";

const dictionary: Record<string, Partial<Record<DemoLanguage, string>>> = {
  "Who will be at the next afterwork? I can welcome the new members.": {
    fr: "Qui sera présent au prochain afterwork ? Je peux accueillir les nouveaux membres.",
    es: "¿Quién estará en el próximo afterwork? Puedo recibir a los nuevos miembros.",
    de: "Wer ist beim nächsten Afterwork dabei? Ich kann die neuen Mitglieder begrüßen.",
    it: "Chi sarà presente al prossimo afterwork? Posso accogliere i nuovi membri.",
    pt: "Quem estará presente no próximo afterwork? Posso receber os novos membros."
  },
  "Quel créneau préférez-vous pour le prochain afterwork ?": {
    en: "Which time slot do you prefer for the next afterwork?",
    es: "¿Qué horario prefieres para el próximo afterwork?",
    de: "Welchen Termin bevorzugst du für das nächste Afterwork?",
    it: "Quale fascia oraria preferisci per il prossimo afterwork?",
    pt: "Qual horário você prefere para o próximo afterwork?"
  },
  "Jeudi 20 août · 18 h 30": {
    en: "Thursday 20 August · 6:30 p.m.", es: "Jueves 20 de agosto · 18:30", de: "Donnerstag, 20. August · 18:30", it: "Giovedì 20 agosto · 18:30", pt: "Quinta-feira, 20 de agosto · 18:30"
  },
  "Vendredi 21 août · 19 h": {
    en: "Friday 21 August · 7 p.m.", es: "Viernes 21 de agosto · 19:00", de: "Freitag, 21. August · 19:00", it: "Venerdì 21 agosto · 19:00", pt: "Sexta-feira, 21 de agosto · 19:00"
  },
  "Qui sera présent au prochain afterwork ?": {
    en: "Who will be at the next afterwork?", es: "¿Quién estará en el próximo afterwork?", de: "Wer ist beim nächsten Afterwork dabei?", it: "Chi sarà presente al prossimo afterwork?", pt: "Quem estará presente no próximo afterwork?"
  },
  "Le vote pour choisir la prochaine thématique d’atelier est ouvert.": {
    en: "Voting to choose the next workshop topic is open.", es: "La votación para elegir el próximo tema del taller está abierta.", de: "Die Abstimmung über das nächste Workshop-Thema ist eröffnet.", it: "La votazione per scegliere il prossimo tema del workshop è aperta.", pt: "A votação para escolher o próximo tema do workshop está aberta."
  },
  "Point sur Neptune Média à 17 h. Merci d’ajouter les chiffres de conversion.": {
    en: "Neptune Media update at 5 p.m. Please add the conversion figures.", es: "Punto sobre Neptune Media a las 17:00. Añade las cifras de conversión.", de: "Neptune-Media-Update um 17 Uhr. Bitte die Conversion-Zahlen ergänzen.", it: "Aggiornamento Neptune Media alle 17. Aggiungi i dati di conversione.", pt: "Atualização da Neptune Media às 17h. Adicione os números de conversão."
  },
  "Je t’envoie les chiffres Neptune Média.": {
    en: "I’m sending you the Neptune Media figures.", es: "Te envío las cifras de Neptune Media.", de: "Ich schicke dir die Neptune-Media-Zahlen.", it: "Ti mando i dati di Neptune Media.", pt: "Estou enviando os números da Neptune Media."
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
  "2 évènements attendent votre vote": {
    en: "2 events are waiting for your vote", es: "2 eventos esperan tu voto", de: "2 Veranstaltungen warten auf deine Stimme", it: "2 eventi attendono il tuo voto", pt: "2 eventos aguardam seu voto"
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
  "Besoin d’un photographe pour mardi.": {
    en: "Need a photographer for Tuesday.", es: "Necesito un fotógrafo para el martes.", de: "Fotograf für Dienstag gesucht.", it: "Cerco un fotografo per martedì.", pt: "Preciso de um fotógrafo para terça-feira."
  },
  "Je cherche un expert Meta Ads à Toulouse.": {
    en: "I’m looking for a Meta Ads expert in Toulouse.", es: "Busco un experto en Meta Ads en Toulouse.", de: "Ich suche einen Meta-Ads-Experten in Toulouse.", it: "Cerco un esperto Meta Ads a Tolosa.", pt: "Procuro um especialista em Meta Ads em Toulouse."
  }
};

function currentTarget(): DemoLanguage | null {
  const value = getTranslationRequestLanguage();
  return value === "fr" || value === "en" || value === "es" || value === "de" || value === "it" || value === "pt" ? value : null;
}

function lookup(original: string): string | undefined {
  const target = currentTarget();
  if (!target) return undefined;
  return dictionary[original]?.[target];
}

export function mockContentTranslation(
  original: string | undefined,
  field = "body",
  sourceLanguage = "fr"
): ContentTranslation | undefined {
  if (!original) return undefined;
  const target = currentTarget();
  const value = lookup(original);
  if (!target || !value || value === original) return undefined;
  return {
    targetLanguage: target,
    sourceLanguage,
    status: "ready",
    generatedAt: "2026-08-15T22:00:00.000Z",
    fields: { [field]: value }
  };
}

export function mockPollTranslation(poll: MessagePoll): PollTranslation | undefined {
  const target = currentTarget();
  if (!target) return undefined;
  const question = lookup(poll.question);
  const options = Object.fromEntries(
    poll.options
      .map((option) => [option.id, lookup(option.label)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1]))
  );
  if (!question && !Object.keys(options).length) return undefined;
  return {
    targetLanguage: target,
    sourceLanguage: "fr",
    status: "ready",
    generatedAt: "2026-08-15T22:00:00.000Z",
    question,
    options
  };
}
