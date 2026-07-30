import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { router, Stack, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { MessagingProvider } from "../src/providers/MessagingProvider";
import { SessionProvider, useSession } from "../src/providers/SessionProvider";
import { NeptuneMessagingApi } from "../src/services/api/neptuneApi";
import {
  configureNotificationPresentation,
  registerForPushNotifications
} from "../src/services/notifications/pushNotifications";
import { colors } from "../src/theme";

configureNotificationPresentation();

function AuthenticatedApp() {
  const { sessionReady, isAuthenticated, accessToken } = useSession();
  const segments = useSegments();

  useEffect(() => {
    if (!sessionReady) return;
    const onSignInRoute = segments[0] === "sign-in";
    if (!isAuthenticated && !onSignInRoute) {
      router.replace("/sign-in");
    } else if (isAuthenticated && onSignInRoute) {
      router.replace("/(tabs)/messages");
    }
  }, [isAuthenticated, segments, sessionReady]);

  useEffect(() => {
    if (Platform.OS === "web" || !accessToken) return;
    let cancelled = false;
    void (async () => {
      const registration = await registerForPushNotifications();
      if (!registration || cancelled) return;
      await new NeptuneMessagingApi(accessToken).registerPushToken(registration);
    })().catch(() => {
      // Le refus ou l’échec d’enregistrement push ne bloque pas la messagerie.
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const openConversation = (response: Notifications.NotificationResponse | null) => {
      const conversationId = response?.notification.request.content.data?.conversationId;
      if (typeof conversationId === "string" && conversationId.length > 0) {
        router.push(`/chat/${conversationId}`);
      }
    };
    void Notifications.getLastNotificationResponseAsync().then(openConversation);
    const subscription = Notifications.addNotificationResponseReceivedListener(
      openConversation
    );
    return () => subscription.remove();
  }, []);

  if (!sessionReady) {
    return (
      <View style={styles.loading} accessibilityLabel="Chargement de Connexio">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <MessagingProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade_from_bottom"
        }}
      />
    </MessagingProvider>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <AuthenticatedApp />
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.navy
  }
});
