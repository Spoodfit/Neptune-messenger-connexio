import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { env } from "../../config/env";
import type { PushTokenRegistration } from "../../types/messaging";

export function configureNotificationPresentation(): void {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true
    })
  });
}

export async function registerForPushNotifications(): Promise<PushTokenRegistration | null> {
  if (Platform.OS === "web" || !Device.isDevice) return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("messages", {
      name: "Messages",
      description: "Nouveaux messages et mentions Connexio",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;

  const projectId = env.easProjectId || Constants.easConfig?.projectId || undefined;
  if (!projectId) return null;

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const platform: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";
  return {
    token: token.data,
    provider: "expo",
    platform,
    appVersion: Constants.expoConfig?.version ?? "0.0.0",
    deviceName: Device.deviceName ?? undefined
  };
}
