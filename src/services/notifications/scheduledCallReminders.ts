import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { ScheduledCall } from "../../types/calls";

const CALL_SOUND = "connexio_notification.mp3";

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const current = await Notifications.getPermissionsAsync();
  const status = current.status === "granted"
    ? current.status
    : (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("calls", {
      name: "Appels et rappels",
      description: "Appels programmés, rappels et appels entrants",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 240, 90, 240],
      sound: CALL_SOUND,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE
    });
  }
  return true;
}

function reminderOffsets(msUntilCall: number): Array<{ offsetMs: number; label: string }> {
  const candidates = [
    { offsetMs: 24 * 60 * 60 * 1000, label: "demain" },
    { offsetMs: 60 * 60 * 1000, label: "dans 1 heure" },
    { offsetMs: 10 * 60 * 1000, label: "dans 10 minutes" }
  ];
  return candidates.filter((item) => msUntilCall > item.offsetMs + 90_000);
}

export async function scheduleScheduledCallReminders(call: ScheduledCall, memberName: string): Promise<string[]> {
  if (!(await ensurePermission())) return [];
  const scheduledAt = Date.parse(call.scheduledAt);
  const now = Date.now();
  if (!Number.isFinite(scheduledAt) || scheduledAt <= now + 5_000) return [];

  const ids: string[] = [];
  for (const reminder of reminderOffsets(scheduledAt - now)) {
    const date = new Date(scheduledAt - reminder.offsetMs);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Appel avec ${memberName} ${reminder.label}`,
        body: call.subject,
        sound: CALL_SOUND,
        data: {
          type: "scheduled_call_reminder",
          scheduledCallId: call.id,
          conversationId: call.conversationId,
          memberId: call.memberId,
          mode: call.mode,
          reason: call.subject
        }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: Platform.OS === "android" ? "calls" : undefined
      }
    });
    ids.push(id);
  }

  const startId = await Notifications.scheduleNotificationAsync({
    content: {
      title: `Appel programmé avec ${memberName}`,
      body: `Objet : ${call.subject}`,
      sound: CALL_SOUND,
      data: {
        type: "scheduled_call_due",
        scheduledCallId: call.id,
        conversationId: call.conversationId,
        memberId: call.memberId,
        mode: call.mode,
        reason: call.subject
      }
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(scheduledAt),
      channelId: Platform.OS === "android" ? "calls" : undefined
    }
  });
  ids.push(startId);
  return ids;
}

export async function cancelScheduledCallReminders(ids: readonly string[] = []): Promise<void> {
  if (Platform.OS === "web" || ids.length === 0) return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}
