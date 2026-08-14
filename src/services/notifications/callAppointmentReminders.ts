import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CALL_NOTIFICATION_SOUND = "connexio_notification.mp3";

async function ensureCallsChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("calls", {
    name: "Appels et rappels",
    description: "Appels entrants et rendez-vous d’appel Connexio",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 240, 90, 240],
    sound: CALL_NOTIFICATION_SOUND,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE
  });
}

export async function scheduleCallAppointmentReminders(input: {
  appointmentId: string;
  conversationId: string;
  memberName: string;
  subject: string;
  scheduledAt: string;
}): Promise<string[]> {
  if (Platform.OS === "web") return [];
  const current = await Notifications.getPermissionsAsync();
  const status = current.status === "granted"
    ? current.status
    : (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return [];

  await ensureCallsChannel();

  const scheduledTime = Date.parse(input.scheduledAt);
  if (!Number.isFinite(scheduledTime)) return [];
  const now = Date.now();
  const checkpoints = [
    { offsetMs: 30 * 60_000, title: "Rendez-vous Connexio dans 30 min", prefix: "Préparez" },
    { offsetMs: 5 * 60_000, title: "Appel Connexio dans 5 min", prefix: "Bientôt" },
    { offsetMs: 0, title: "C’est l’heure de votre appel", prefix: "Maintenant" }
  ];
  const identifiers: string[] = [];

  for (const checkpoint of checkpoints) {
    const triggerAt = scheduledTime - checkpoint.offsetMs;
    const seconds = Math.round((triggerAt - now) / 1000);
    if (seconds < 2) continue;
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: checkpoint.title,
        body: `${checkpoint.prefix} « ${input.subject} » avec ${input.memberName}.`,
        sound: CALL_NOTIFICATION_SOUND,
        data: {
          type: "call_appointment_reminder",
          appointmentId: input.appointmentId,
          conversationId: input.conversationId,
          subject: input.subject
        }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
        channelId: Platform.OS === "android" ? "calls" : undefined
      }
    });
    identifiers.push(identifier);
  }
  return identifiers;
}

export async function cancelCallAppointmentReminders(ids: readonly string[]): Promise<void> {
  if (Platform.OS === "web") return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}
