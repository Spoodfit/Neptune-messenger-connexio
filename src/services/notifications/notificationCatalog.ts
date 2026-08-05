export const NOTIFICATION_EVENT_TYPES = [
  "direct_message",
  "group_message",
  "mention",
  "reply",
  "reaction",
  "incoming_audio_call",
  "incoming_video_call",
  "missed_call",
  "call_back_reminder",
  "group_invitation",
  "group_join_request",
  "group_join_approved",
  "group_responsibility_assigned",
  "announcement",
  "poll_created",
  "poll_closing",
  "poll_result",
  "event_vote_open",
  "event_reminder",
  "event_updated",
  "event_cancelled",
  "highlight_comment",
  "highlight_reply",
  "highlight_reaction",
  "automation_sent",
  "moderation_warning",
  "account_security"
] as const;

export type NotificationEventType =
  (typeof NOTIFICATION_EVENT_TYPES)[number];

export type NotificationChannelId =
  | "messages"
  | "mentions"
  | "calls"
  | "groups"
  | "events"
  | "community"
  | "account";

export interface NotificationEvent {
  type: NotificationEventType;
  actorName?: string;
  conversationName?: string;
  groupName?: string;
  eventName?: string;
  highlightTitle?: string;
  preview?: string;
  conversationId?: string;
  groupId?: string;
  eventId?: string;
  highlightId?: string;
  callId?: string;
  automationName?: string;
  warningReason?: string;
}

export interface NotificationCopy {
  title: string;
  body: string;
  channelId: NotificationChannelId;
  data: Record<string, string>;
}

const clean = (value: string | undefined, fallback: string): string =>
  value?.trim() || fallback;

const preview = (value: string | undefined): string => {
  const normalized = clean(value, "Un nouveau contenu vous attend dans Connexio.");
  return normalized.length > 140
    ? `${normalized.slice(0, 137).trimEnd()}…`
    : normalized;
};

export function buildNotificationCopy(event: NotificationEvent): NotificationCopy {
  const actor = clean(event.actorName, "Un membre Neptune");
  const conversation = clean(event.conversationName, "votre conversation");
  const group = clean(event.groupName, "votre groupe");
  const eventName = clean(event.eventName, "votre prochain évènement");
  const highlight = clean(event.highlightTitle, "ce Temps fort");
  const data = Object.fromEntries(
    Object.entries({
      type: event.type,
      conversationId: event.conversationId,
      groupId: event.groupId,
      eventId: event.eventId,
      highlightId: event.highlightId,
      callId: event.callId
    }).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );

  switch (event.type) {
    case "direct_message":
      return { title: `${actor} vous a écrit`, body: preview(event.preview), channelId: "messages", data };
    case "group_message":
      return { title: `Nouveau message dans ${conversation}`, body: `${actor} : ${preview(event.preview)}`, channelId: "messages", data };
    case "mention":
      return { title: `${actor} vous a mentionné`, body: `Votre attention est demandée dans ${conversation}.`, channelId: "mentions", data };
    case "reply":
      return { title: `${actor} vous a répondu`, body: preview(event.preview), channelId: "mentions", data };
    case "reaction":
      return { title: `${actor} a réagi à votre message`, body: `Une nouvelle réaction vous attend dans ${conversation}.`, channelId: "community", data };
    case "incoming_audio_call":
      return { title: `Appel audio de ${actor}`, body: "Ouvrez Connexio pour répondre.", channelId: "calls", data };
    case "incoming_video_call":
      return { title: `Appel vidéo de ${actor}`, body: "Ouvrez Connexio pour rejoindre l’appel.", channelId: "calls", data };
    case "missed_call":
      return { title: `Appel manqué de ${actor}`, body: "Vous pourrez le rappeler dès que vous serez disponible.", channelId: "calls", data };
    case "call_back_reminder":
      return { title: `Pensez à rappeler ${actor}`, body: "Le rappel demandé est arrivé. Ouvrez Connexio lorsque vous êtes disponible.", channelId: "calls", data };
    case "group_invitation":
      return { title: `Invitation à rejoindre ${group}`, body: `${actor} vous invite à participer à ce groupe.`, channelId: "groups", data };
    case "group_join_request":
      return { title: `Nouvelle demande pour ${group}`, body: `${actor} souhaite rejoindre le groupe.`, channelId: "groups", data };
    case "group_join_approved":
      return { title: `Bienvenue dans ${group}`, body: "Votre demande a été acceptée. Vous pouvez maintenant participer aux échanges.", channelId: "groups", data };
    case "group_responsibility_assigned":
      return { title: `Vous devenez responsable de ${group}`, body: "Les outils de gestion du groupe sont maintenant disponibles.", channelId: "groups", data };
    case "announcement":
      return { title: "Nouvelle annonce Neptune", body: preview(event.preview), channelId: "groups", data };
    case "poll_created":
      return { title: `Nouveau sondage dans ${group}`, body: `${actor} attend votre avis.`, channelId: "groups", data };
    case "poll_closing":
      return { title: "Le sondage se termine bientôt", body: `Il est encore temps de voter dans ${group}.`, channelId: "groups", data };
    case "poll_result":
      return { title: "Les résultats du sondage sont disponibles", body: `Consultez le choix retenu dans ${group}.`, channelId: "groups", data };
    case "event_vote_open":
      return { title: "Votre avis compte", body: `Le vote pour ${eventName} est ouvert.`, channelId: "events", data };
    case "event_reminder":
      return { title: `${eventName} approche`, body: "Retrouvez les informations pratiques dans Connexio.", channelId: "events", data };
    case "event_updated":
      return { title: `${eventName} a été mis à jour`, body: "Consultez les nouvelles informations avant de vous déplacer.", channelId: "events", data };
    case "event_cancelled":
      return { title: `${eventName} est annulé`, body: "Nous sommes désolés pour ce changement. Les détails sont disponibles dans Connexio.", channelId: "events", data };
    case "highlight_comment":
      return { title: `${actor} a commenté votre Temps fort`, body: preview(event.preview), channelId: "community", data };
    case "highlight_reply":
      return { title: `${actor} vous a répondu`, body: `Une réponse vous attend sur ${highlight}.`, channelId: "community", data };
    case "highlight_reaction":
      return { title: `${actor} a réagi à votre Temps fort`, body: "Votre publication suscite une nouvelle interaction.", channelId: "community", data };
    case "automation_sent":
      return { title: "Automatisation envoyée", body: `${clean(event.automationName, "Votre message programmé")} a bien été publié dans ${group}.`, channelId: "groups", data };
    case "moderation_warning":
      return { title: "Un ajustement est nécessaire", body: clean(event.warningReason, "Merci de vérifier votre contenu avant de le publier à nouveau."), channelId: "account", data };
    case "account_security":
      return { title: "Activité de sécurité sur votre compte", body: preview(event.preview ?? "Vérifiez cette activité dans les paramètres de Connexio."), channelId: "account", data };
  }
}
