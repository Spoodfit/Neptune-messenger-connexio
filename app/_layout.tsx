import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { Redirect, router, Stack, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import {
  initialWindowMetrics,
  SafeAreaProvider
} from "react-native-safe-area-context";

import { ExperienceProvider } from "../src/providers/ExperienceProvider";
import { capabilitiesForBackendContract } from "../src/config/backendCapabilities";
import { env } from "../src/config/env";
import { GroupAdminProvider } from "../src/providers/GroupAdminProvider";
import { MessagingProvider } from "../src/providers/MessagingProvider";
import { ScheduledCallsProvider } from "../src/providers/ScheduledCallsProvider";
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
const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);
const MESSAGING_AVAILABLE = env.mockMode || BACKEND_CAPABILITIES.messaging;
const CALLS_AVAILABLE = env.mockMode || BACKEND_CAPABILITIES.calls;

const PUBLIC_ROUTES = new Set(["sign-in", "access-help", "privacy"]);
const MESSAGING_ROUTES = new Set([
  "chat",
  "conversation",
  "group",
  "new-conversation",
  "schedule-message"
]);

function chatPath(conversationId: string): `/chat/${string}` {
  return `/chat/${encodeURIComponent(conversationId)}`;
}

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
  const processedNotificationResponseId = useRef<string | null>(null);
  const hasAccessToken = Boolean(accessToken);
  const currentRootSegment = segments[0];
  const secondarySegment = (segments as readonly string[])[1];
  const onSignInRoute = currentRootSegment === "sign-in";
  const onPublicRoute =
    typeof currentRootSegment === "string" && PUBLIC_ROUTES.has(currentRootSegment);
  const onUnavailableMessagingRoute =
    !MESSAGING_AVAILABLE &&
    typeof currentRootSegment === "string" &&
    MESSAGING_ROUTES.has(currentRootSegment);
  const onUnavailableCallRoute =
    !CALLS_AVAILABLE &&
    (currentRootSegment === "call" ||
      currentRootSegment === "schedule-call" ||
      (currentRootSegment === "(tabs)" && secondarySegment === "calls"));

  useEffect(() => {
    if (!sessionReady || !isAuthenticated) return;

    const conversationId = pendingConversationId.current;
    if (conversationId) {
      pendingConversationId.current = null;
      router.replace(chatPath(conversationId));
      return;
    }

    if (onSignInRoute) {
      router.replace(
        MESSAGING_AVAILABLE
          ? "/(tabs)/messages"
          : "/(tabs)/highlights"
      );
    }
  }, [isAuthenticated, onSignInRoute, sessionReady]);

  useEffect(() => {
    if (
      Platform.OS === "web" ||
      !sessionReady ||
      !isAuthenticated ||
      !hasAccessToken ||
      !BACKEND_CAPABILITIES.pushNotifications
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
            .catch(() => undefined);
        }
      );
    })().catch(() => undefined);

    return () => {
      cancelled = true;
      tokenSubscription?.remove();
    };
  }, [getAccessToken, hasAccessToken, isAuthenticated, sessionReady]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const openNotificationTarget = (
      response: Notifications.NotificationResponse | null
    ) => {
      if (!response) return;
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

      const responseId = response.notification.request.identifier;
      if (processedNotificationResponseId.current === responseId) return;
      const data = response.notification.request.content.data ?? {};

      if (data.type === "scheduled_call_due" && typeof data.conversationId === "string") {
        processedNotificationResponseId.current = responseId;
        void Notifications.clearLastNotificationResponseAsync();
        const mode = data.mode === "audio" ? "audio" : "video";
        const reason = typeof data.reason === "string" ? data.reason : "Appel programmé";
        router.push({
          pathname: "/call/[id]",
          params: {
            id: data.conversationId,
            mode,
            reason,
            scheduled: "1",
            autoStart: env.mockMode ? "1" : "0"
          }
        });
        return;
      }

      if (!BACKEND_CAPABILITIES.messaging) return;
      const conversationId = data.conversationId;
      if (typeof conversationId !== "string" || !conversationId.trim()) return;

      processedNotificationResponseId.current = responseId;
      pendingConversationId.current = conversationId.trim();
      void Notifications.clearLastNotificationResponseAsync();

      if (!sessionReady) return;
      if (isAuthenticated) {
        pendingConversationId.current = null;
        router.push(chatPath(conversationId.trim()));
      } else {
        router.replace("/sign-in");
      }
    };

    void Notifications.getLastNotificationResponseAsync()
      .then(openNotificationTarget)
      .catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(
      openNotificationTarget
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
          animation: Platform.OS === "web" ? "fade" : "default"
        }}
      />
    </>
  );

  if (!isAuthenticated) {
    if (!onPublicRoute) return <Redirect href="/sign-in" />;
    return applicationStack;
  }

  if (onUnavailableMessagingRoute || onUnavailableCallRoute) {
    return <Redirect href="/(tabs)/highlights" />;
  }

  return (
    <MessagingProvider key={`user:${currentUser.id}`}>
      <GroupAdminProvider>
        <ExperienceProvider>
          <ScheduledCallsProvider>{applicationStack}</ScheduledCallsProvider>
        </ExperienceProvider>
      </GroupAdminProvider>
    </MessagingProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <SessionProvider>
        <AuthenticatedApp />
      </SessionProvider>
    </SafeAreaProvider>
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
