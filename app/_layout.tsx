import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { router, Stack, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { MessagingProvider } from "../src/providers/MessagingProvider";
import { SessionProvider, useSession } from "../src/providers/SessionProvider";
import { NeptuneMessagingApi } from "../src/services/api/neptuneApi";
import {
  configureNotificationPresentation,
  getRegisteredPushToken,
  registerForPushNotifications,
  registrationFromDevicePushToken,
  rememberRegisteredPushToken
} from "../src/services/notifications/pushNotifications";
import type { PushTokenRegistration } from "../src/types/messaging";
import { colors } from "../src/theme";

configureNotificationPresentation();

function AuthenticatedApp() {
  const {
    sessionReady,
    isAuthenticated,
    accessToken,
    currentUser,
    getAccessToken
  } = useSession();
  const segments = useSegments();
  const pendingConversationId = useRef<string | null>(null);
  const hasAccessToken = Boolean(accessToken);

  useEffect(() => {
    if (!sessionReady) return;
    const onSignInRoute = segments[0] === "sign-in";
    if (!isAuthenticated && !onSignInRoute) {
      router.replace("/sign-in");
      return;
    }
    if (isAuthenticated && onSignInRoute) {
      const conversationId = pendingConversationId.current;
      pendingConversationId.current = null;
      router.replace(
        conversationId ? `/chat/${conversationId}` : "/(tabs)/messages"
      );
    }
  }, [isAuthenticated, segments, sessionReady]);

  useEffect(() => {
    if (
      Platform.OS === "web" ||
      !sessionReady ||
      !isAuthenticated ||
      !hasAccessToken
    ) {
      return;
    }

    let cancelled = false;
    let tokenSubscription: Notifications.EventSubscription | null = null;

    void (async () => {
      const token = await getAccessToken();
      if (!token || cancelled) return;
      const api = new NeptuneMessagingApi(token);
      let synchronization = Promise.resolve();

      const synchronize = (registration: PushTokenRegistration) => {
        synchronization = synchronization.then(async () => {
          if (cancelled) return;
          const previousToken = await getRegisteredPushToken();
          await api.registerPushToken(registration);
          if (previousToken && previousToken !== registration.token) {
            await api.unregisterPushToken(previousToken).catch(() => undefined);
          }
          if (!cancelled) {
            await rememberRegisteredPushToken(registration.token);
          }
        });
        return synchronization;
      };

      const registration = await registerForPushNotifications();
      if (registration && !cancelled) await synchronize(registration);
      if (cancelled) return;

      tokenSubscription = Notifications.addPushTokenListener(
        (devicePushToken) => {
          void registrationFromDevicePushToken(devicePushToken)
            .then((rotatedRegistration) =>
              rotatedRegistration ? synchronize(rotatedRegistration) : undefined
            )
            .catch(() => {
              // Une rotation échouée sera retentée au prochain démarrage actif.
            });
        }
      );
    })().catch(() => {
      // Le refus ou l’échec d’enregistrement push ne bloque pas la messagerie.
    });

    return () => {
      cancelled = true;
      tokenSubscription?.remove();
    };
  }, [getAccessToken, hasAccessToken, isAuthenticated, sessionReady]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const openConversation = (
      response: Notifications.NotificationResponse | null
    ) => {
      if (!response) return;
      if (
        response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        return;
      }
      const conversationId =
        response.notification.request.content.data?.conversationId;
      if (typeof conversationId !== "string" || conversationId.length === 0) {
        return;
      }
      pendingConversationId.current = conversationId;
      if (!sessionReady) return;
      if (isAuthenticated) {
        pendingConversationId.current = null;
        router.push(`/chat/${conversationId}`);
      } else {
        router.replace("/sign-in");
      }
      void Notifications.clearLastNotificationResponseAsync();
    };

    void Notifications.getLastNotificationResponseAsync().then(openConversation);
    const subscription = Notifications.addNotificationResponseReceivedListener(
      openConversation
    );
    return () => subscription.remove();
  }, [isAuthenticated, sessionReady]);

  if (!sessionReady) {
    return (
      <View style={styles.loading} accessibilityLabel="Chargement de Connexio">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const applicationStack = (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "fade_from_bottom"
        }}
      />
    </>
  );

  if (!isAuthenticated) {
    return applicationStack;
  }

  return (
    <MessagingProvider key={`user:${currentUser.id}`}>
      {applicationStack}
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
