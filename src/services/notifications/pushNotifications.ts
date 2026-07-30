import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { env } from "../../config/env";
import type { PushTokenRegistration } from "../../types/messaging";

const REGISTERED_PUSH_TOKEN_KEY = "connexio.push.registered-token";

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

export async function rememberRegisteredPushToken(token: string): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(REGISTERED_PUSH_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
}

export async function getRegisteredPushToken(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  return SecureStore.getItemAsync(REGISTERED_PUSH_TOKEN_KEY);
}

export async function forgetRegisteredPushToken(): Promise<void> {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(REGISTERED_PUSH_TOKEN_KEY);
}

export async function unregisterDeviceFromPushNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.unregisterForNotificationsAsync();
  } finally {
    await forgetRegisteredPushToken();
  }
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
