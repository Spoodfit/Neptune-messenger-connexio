from __future__ import annotations

import base64
import json
import re
from pathlib import Path

ROOT = Path.cwd()


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: motif attendu une fois, trouvé {count}.")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str, flags: int = 0) -> str:
    result, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: motif regex attendu une fois, trouvé {count}.")
    return result


# Official assets supplied by the user.
assets = json.loads(read("scripts/rc1_assets.json"))
for name, encoded in assets.items():
    target = ROOT / "assets" / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(base64.b64decode(encoded, validate=True))


# Message model carries the sender's Neptune status.
messaging = read("src/types/messaging.ts")
if "senderRole?: UserRole;" not in messaging:
    messaging = replace_once(
        messaging,
        "  senderAvatarUrl?: string;\n  body: string;",
        "  senderAvatarUrl?: string;\n  /** Statut Neptune de l’auteur, utilisé pour le contour et le badge. */\n  senderRole?: UserRole;\n  body: string;",
        "Ajout senderRole"
    )
write("src/types/messaging.ts", messaging)


# Wire normalization accepts role/status from the message or nested sender.
wire = read("src/services/api/wireExtensions.ts")
if "function optionalUserRole" not in wire:
    marker = '''function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  return values.length ? [...new Set(values)] : undefined;
}
'''
    addition = marker + '''const USER_ROLES = new Set([
  "visionnaire",
  "visionary",
  "amiral",
  "admiral",
  "capitaine",
  "captain",
  "legende",
  "moussaillon",
  "triton",
  "member",
  "allie",
  "ally",
  "free",
  "admin"
]);

function optionalUserRole(value: unknown): ChatMessage["senderRole"] {
  const role = optionalString(value);
  return role && USER_ROLES.has(role)
    ? (role as ChatMessage["senderRole"])
    : undefined;
}
'''
    wire = replace_once(wire, marker, addition, "Normalisation rôle")
if 'const rawSender = first(value, "sender", "author", "user");' not in wire:
    wire = replace_once(
        wire,
        '''  const message = normalizeBaseMessage(input);
  const rawAttachments = first(value, "attachments");
''',
        '''  const message = normalizeBaseMessage(input);
  const rawSender = first(value, "sender", "author", "user");
  const senderRole =
    optionalUserRole(first(value, "senderRole", "sender_role", "author_role")) ??
    (isRecord(rawSender)
      ? optionalUserRole(first(rawSender, "role", "status", "membership_role"))
      : undefined);
  const rawAttachments = first(value, "attachments");
''',
        "Extraction rôle auteur"
    )
    wire = replace_once(
        wire,
        '''  return { ...message, body: poll && !hasBody ? "" : message.body, attachments, poll };
''',
        '''  return {
    ...message,
    senderRole,
    body: poll && !hasBody ? "" : message.body,
    attachments,
    poll
  };
''',
        "Retour rôle auteur"
    )
write("src/services/api/wireExtensions.ts", wire)


# Demo messages get the same status as their member record.
mock = read("src/data/mockData.ts")
role_by_sender = {
    "user-johan": "visionary",
    "user-lea": "visionary",
    "user-oceane": "captain",
    "user-nabiha": "captain",
    "user-christelle": "captain",
}
for sender_id, role in role_by_sender.items():
    pattern = (
        rf'(senderId: "{re.escape(sender_id)}",\n'
        rf'(?:\s+senderName:.*\n)'
        rf'(?:\s+senderInitials:.*\n)'
        rf'(?:\s+senderAvatarUrl:.*\n))'
        rf'(?!\s+senderRole:)'
    )
    mock = re.sub(pattern, rf'\1    senderRole: "{role}",\n', mock)
write("src/data/mockData.ts", mock)


# Chat bubble: status ring, status label, breathing room, long-press reactions only.
bubble = read("src/components/MessageBubble.tsx")
if 'import { getRoleAppearance } from "../domain/roleAppearance";' not in bubble:
    bubble = replace_once(
        bubble,
        'import { colors, gradients, spacing, typography } from "../theme";',
        'import { getRoleAppearance } from "../domain/roleAppearance";\nimport { colors, gradients, spacing, typography } from "../theme";',
        "Import apparence statut"
    )

bubble = bubble.replace(
    '  const showDetachedReactionButton = Boolean(onReact) && !message.isMine;',
    '  const canReactWithLongPress = Boolean(onReact) && !message.isMine;\n  const senderRoleAppearance = getRoleAppearance(message.senderRole ?? "triton");'
)
bubble = bubble.replace(
    '''              onLongPress={
                showDetachedReactionButton
                  ? () => setReactionOpen(true)
                  : undefined
              }''',
    '''              onLongPress={
                canReactWithLongPress
                  ? () => setReactionOpen(true)
                  : undefined
              }'''
)
bubble = bubble.replace(
    '{showDetachedReactionButton || reactionOpen ? (',
    '{reactionOpen ? ('
)

bubble = regex_once(
    bubble,
    r'''\n\s*\{showDetachedReactionButton \? \(\n\s*<Pressable[\s\S]*?accessibilityLabel="Ajouter une réaction"[\s\S]*?</Pressable>\n\s*\) : null\}''',
    "",
    "Suppression bouton réaction"
)

open_avatar = '<LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>'
if open_avatar in bubble:
    bubble = bubble.replace(
        open_avatar,
        '''<View
              style={[
                styles.avatarShell,
                {
                  backgroundColor: senderRoleAppearance.background,
                  borderColor: senderRoleAppearance.foreground,
                  shadowColor: senderRoleAppearance.foreground
                }
              ]}
            >''',
        1
    )
    start = bubble.index('''<View
              style={[
                styles.avatarShell,''')
    close = bubble.index("</LinearGradient>", start)
    bubble = bubble[:close] + "</View>" + bubble[close + len("</LinearGradient>"):]

old_sender = '''              <Text numberOfLines={1} style={styles.sender}>
                {message.senderName}
              </Text>'''
new_sender = '''              <View style={styles.senderLine}>
                <Text numberOfLines={1} style={styles.sender}>
                  {message.senderName}
                </Text>
                <Text
                  accessibilityLabel={`Statut ${senderRoleAppearance.label}`}
                  numberOfLines={1}
                  style={[
                    styles.senderRole,
                    {
                      color: senderRoleAppearance.foreground,
                      borderColor: senderRoleAppearance.border,
                      backgroundColor: senderRoleAppearance.background
                    }
                  ]}
                >
                  {senderRoleAppearance.shortLabel}
                </Text>
              </View>'''
if old_sender in bubble:
    bubble = bubble.replace(old_sender, new_sender, 1)

bubble = bubble.replace(
    '  gestureStage: { width: "100%", position: "relative" },',
    '  gestureStage: {\n    width: "100%",\n    position: "relative",\n    marginBottom: spacing.md\n  },'
)
bubble = bubble.replace(
    '''  avatarShell: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    padding: 2,
    borderRadius: 12,
    flexShrink: 0,''',
    '''  avatarShell: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    padding: 2,
    borderRadius: 12,
    borderWidth: 2,
    flexShrink: 0,'''
)
if "  senderLine:" not in bubble:
    bubble = bubble.replace(
        '''  sender: {
    ...typography.caption,''',
        '''  senderLine: {
    minHeight: 28,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: spacing.sm
  },
  senderRole: {
    maxWidth: 92,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "900"
  },
  sender: {
    ...typography.caption,''',
        1
    )
    bubble = bubble.replace('    marginLeft: spacing.sm,\n    fontSize: 10,', '    fontSize: 10,', 1)
write("src/components/MessageBubble.tsx", bubble)


# Central notification catalogue covering every actionable app event.
catalog = r'''export const NOTIFICATION_EVENT_TYPES = [
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
'''
write("src/services/notifications/notificationCatalog.ts", catalog)


# Notification service uses dedicated channels and catalogue copy.
push = read("src/services/notifications/pushNotifications.ts")
if 'from "./notificationCatalog";' not in push:
    push = replace_once(
        push,
        'import type { PushTokenRegistration } from "../../types/messaging";',
        '''import type { PushTokenRegistration } from "../../types/messaging";
import {
  buildNotificationCopy,
  type NotificationEvent,
  type NotificationChannelId
} from "./notificationCatalog";''',
        "Import catalogue notifications"
    )

channels_function = r'''async function ensureAndroidChannels(): Promise<void> {
  if (Platform.OS !== "android") return;
  const channels: Array<{
    id: NotificationChannelId;
    name: string;
    description: string;
    importance: Notifications.AndroidImportance;
    vibrationPattern: number[];
  }> = [
    { id: "messages", name: "Messages", description: "Messages privés et de groupe", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 180, 120, 180] },
    { id: "mentions", name: "Mentions et réponses", description: "Mentions et réponses qui demandent votre attention", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 220, 100, 180] },
    { id: "calls", name: "Appels et rappels", description: "Appels entrants, appels manqués et rappels", importance: Notifications.AndroidImportance.MAX, vibrationPattern: [0, 240, 90, 240] },
    { id: "groups", name: "Groupes et annonces", description: "Invitations, annonces, sondages et automatisations", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 180, 120, 180] },
    { id: "events", name: "Évènements", description: "Votes, rappels et modifications d’évènements", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 180, 120, 180] },
    { id: "community", name: "Communauté", description: "Réactions, commentaires et Temps forts", importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 140] },
    { id: "account", name: "Compte et sécurité", description: "Sécurité du compte et informations importantes", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 220, 100, 220] }
  ];

  await Promise.all(
    channels.map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        vibrationPattern: channel.vibrationPattern,
        sound: NOTIFICATION_SOUND,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE
      })
    )
  );
}'''
push = regex_once(
    push,
    r'async function ensureAndroidChannels\(\): Promise<void> \{[\s\S]*?\n\}',
    channels_function,
    "Canaux Android"
)

if "export function buildRemotePushPayload" not in push:
    push = replace_once(
        push,
        "export async function scheduleCallBackReminder(",
        '''export function buildRemotePushPayload(event: NotificationEvent) {
  const copy = buildNotificationCopy(event);
  return {
    title: copy.title,
    body: copy.body,
    sound: NOTIFICATION_SOUND,
    channelId: copy.channelId,
    data: copy.data
  };
}

export async function scheduleCallBackReminder(''',
        "Payload distant"
    )
push = replace_once(
    push,
    '''    content: {
      title: `Rappeler ${callerName}`,
      body: "Les 10 minutes sont écoulées. Ouvrez Connexio pour rappeler cette personne.",
      sound: NOTIFICATION_SOUND,
      data: {
        type: "call-back-reminder",
        conversationId
      }
    },''',
    '''    content: {
      ...buildRemotePushPayload({
        type: "call_back_reminder",
        actorName: callerName,
        conversationId
      }),
      data: {
        type: "call_back_reminder",
        conversationId
      }
    },''',
    "Copie rappel appel"
)
write("src/services/notifications/pushNotifications.ts", push)


# Tests and backend contract.
write("tests/notificationCatalog.test.ts", r'''import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNotificationCopy,
  NOTIFICATION_EVENT_TYPES,
  type NotificationEvent
} from "../src/services/notifications/notificationCatalog";

test("chaque évènement produit une notification exploitable et concise", () => {
  for (const type of NOTIFICATION_EVENT_TYPES) {
    const event: NotificationEvent = {
      type,
      actorName: "Océane",
      conversationName: "Club Carcassonne",
      groupName: "Club Carcassonne",
      eventName: "Afterwork Neptune",
      highlightTitle: "Une réussite du réseau",
      preview: "Une information utile et chaleureuse pour la communauté.",
      conversationId: "carcassonne",
      groupId: "carcassonne",
      eventId: "afterwork",
      highlightId: "highlight-1",
      callId: "call-1",
      automationName: "Rappel hebdomadaire",
      warningReason: "Merci de reformuler ce message avec un ton respectueux."
    };
    const copy = buildNotificationCopy(event);
    assert.ok(copy.title.trim().length > 0, type);
    assert.ok(copy.body.trim().length > 0, type);
    assert.ok(copy.title.length <= 70, `${type}: titre trop long`);
    assert.ok(copy.body.length <= 180, `${type}: corps trop long`);
    assert.equal(copy.data.type, type);
  }
});

test("les données absentes produisent une copie humaine sans placeholder technique", () => {
  const copy = buildNotificationCopy({ type: "direct_message" });
  assert.doesNotMatch(`${copy.title} ${copy.body}`, /undefined|null|\{\{/i);
});
''')

write("docs/PUSH_NOTIFICATION_MATRIX.md", r'''# Matrice des notifications Connexio

Cette matrice est la source de vérité partagée entre le client mobile et le backend push.

## Évènements couverts

- messages privés et messages de groupe ;
- mentions, réponses et réactions ;
- appels audio/vidéo entrants, appels manqués et rappels ;
- invitations, demandes d’adhésion, approbations et nomination d’un responsable ;
- annonces, sondages, fermeture et résultats ;
- votes d’évènements, rappels, modifications et annulations ;
- commentaires, réponses et réactions aux Temps forts ;
- automatisations envoyées ;
- avertissements de modération ;
- sécurité du compte.

Les textes sont construits dans `src/services/notifications/notificationCatalog.ts`.
Ils doivent rester humains, chaleureux, professionnels et courts.

## Payload serveur attendu

```json
{
  "to": "<ExpoPushToken>",
  "title": "Océane vous a mentionné",
  "body": "Votre attention est demandée dans Club Carcassonne.",
  "sound": "connexio-notification.mp3",
  "channelId": "mentions",
  "data": {
    "type": "mention",
    "conversationId": "carcassonne"
  }
}
```

Le backend ne doit jamais notifier l’auteur de sa propre action. Les préférences,
la sourdine, les horaires calmes et les blocages sont appliqués côté serveur.

## Limite de validation

Le client, les canaux, le son, les textes et le contrat sont testés dans le dépôt.
La réception distante réelle reste à vérifier avec APNs/FCM, les identifiants EAS
et un backend de préproduction.
''')

# Keep the final branch clean.
for temporary in ("scripts/rc1_assets.json", "scripts/rc1_finish_patch.py"):
    (ROOT / temporary).unlink(missing_ok=True)

print("RC1 final patch applied.")
