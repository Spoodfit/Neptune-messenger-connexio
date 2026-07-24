import { Stack, router } from "expo-router";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";

import { MessagingProvider } from "@/providers/MessagingProvider";
import { SessionProvider } from "@/providers/SessionProvider";
import {
  configureNotificationPresentation,
  registerForPushNotifications
} from "@/services/notifications/pushNotifications";
import { colors } from "@/theme";

configureNotificationPresentation();

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    void registerForPushNotifications();

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const conversationId =
          response.notification.request.content.data?.conversationId;

        if (typeof conversationId === "string" && conversationId.length > 0) {
          router.push(`/chat/${conversationId}`);
        }
      });

    return () => subscription.remove();
  }, []);

  return (
    <SessionProvider>
      <MessagingProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background }
          }}
        />
      </MessagingProvider>
    </SessionProvider>
  );
}