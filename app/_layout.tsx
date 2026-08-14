import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { Redirect, router, Stack, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { FloatingBackButton } from "../src/components/FloatingBackButton";
import { capabilitiesForBackendContract } from "../src/config/backendCapabilities";
import { env } from "../src/config/env";
import { ExperienceProvider } from "../src/providers/ExperienceProvider";
import { GroupAdminProvider } from "../src/providers/GroupAdminProvider";
import { LanguageProvider } from "../src/providers/LanguageProvider";
import { MessagingProvider } from "../src/providers/MessagingProvider";
import { ScheduledCallsProvider } from "../src/providers/ScheduledCallsProvider";
import { SessionProvider, useSession } from "../src/providers/SessionProvider";
import { ThemeProvider, useAppTheme } from "../src/providers/ThemeProvider";
import { NeptuneMessagingApi } from "../src/services/api/neptuneApi";
import {
  configureNotificationPresentation,
  getRegisteredPushToken,
  registerForPushNotifications,
  registrationFromDevicePushToken,
  rememberRegisteredPushToken
} from "../src/services/notifications/pushNotifications";
import { AppAlertHost } from "../src/services/ui/AppAlert";
import { colors } from "../src/theme";
import type { PushTokenRegistration } from "../src/types/messaging";

configureNotificationPresentation();
const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);
const MESSAGING_AVAILABLE = env.mockMode || BACKEND_CAPABILITIES.messaging;
const CALLS_AVAILABLE = env.mockMode || BACKEND_CAPABILITIES.calls;
const PUBLIC_ROUTES = new Set(["sign-in", "access-help", "privacy"]);
const MESSAGING_ROUTES = new Set(["chat", "conversation", "group", "new-conversation", "schedule-message"]);

type PendingChatTarget = { conversationId: string; messageId?: string; focusMention?: boolean };

function openChatTarget(target: PendingChatTarget, replace = false) {
  const navigation = {
    pathname: "/chat/[id]" as const,
    params: {
      id: target.conversationId,
      ...(target.messageId ? { focusMessageId: target.messageId } : {}),
      ...(target.focusMention ? { focusMention: "1" } : {})
    }
  };
  if (replace) router.replace(navigation);
  else router.push(navigation);
}

function AuthenticatedApp() {
  const { sessionReady, isAuthenticated, accessToken, currentUser, getAccessToken } = useSession();
  const theme = useAppTheme();
  const segments = useSegments();
  const pendingChatTarget = useRef<PendingChatTarget | null>(null);
  const processedNotificationResponseId = useRef<string | null>(null);
  const hasAccessToken = Boolean(accessToken);
  const currentRootSegment = segments[0];
  const secondarySegment = (segments as readonly string[])[1];
  const onSignInRoute = currentRootSegment === "sign-in";
  const onPublicRoute = typeof currentRootSegment === "string" && PUBLIC_ROUTES.has(currentRootSegment);
  const onUnavailableMessagingRoute = !MESSAGING_AVAILABLE && typeof currentRootSegment === "string" && MESSAGING_ROUTES.has(currentRootSegment);
  const onUnavailableCallRoute = !CALLS_AVAILABLE && (currentRootSegment === "call" || currentRootSegment === "schedule-call" || (currentRootSegment === "(tabs)" && secondarySegment === "calls"));

  useEffect(() => {
    if (!sessionReady || !isAuthenticated) return;
    const target = pendingChatTarget.current;
    if (target) {
      pendingChatTarget.current = null;
      openChatTarget(target, true);
      return;
    }
    if (onSignInRoute) router.replace(MESSAGING_AVAILABLE ? "/(tabs)/messages" : "/(tabs)/highlights");
  }, [isAuthenticated, onSignInRoute, sessionReady]);

  useEffect(() => {
    if (Platform.OS === "web" || !sessionReady || !isAuthenticated || !hasAccessToken || !BACKEND_CAPABILITIES.pushNotifications) return;
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
          if (previousToken && previousToken !== registration.token) await api.unregisterPushToken(previousToken).catch(() => undefined);
          if (!cancelled) await rememberRegisteredPushToken(registration.token);
        });
        return synchronization;
      };
      const registration = await registerForPushNotifications();
      if (registration && !cancelled) await synchronize(registration);
      if (cancelled) return;
      tokenSubscription = Notifications.addPushTokenListener((devicePushToken) => {
        void registrationFromDevicePushToken(devicePushToken).then((rotatedRegistration) => rotatedRegistration ? synchronize(rotatedRegistration) : undefined).catch(() => undefined);
      });
    })().catch(() => undefined);
    return () => { cancelled = true; tokenSubscription?.remove(); };
  }, [getAccessToken, hasAccessToken, isAuthenticated, sessionReady]);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const openNotificationTarget = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const responseId = response.notification.request.identifier;
      if (processedNotificationResponseId.current === responseId) return;
      const data = response.notification.request.content.data ?? {};
      if (data.type === "scheduled_call_due" && typeof data.conversationId === "string") {
        processedNotificationResponseId.current = responseId;
        void Notifications.clearLastNotificationResponseAsync();
        router.push({ pathname: "/call/[id]", params: { id: data.conversationId, mode: data.mode === "audio" ? "audio" : "video", reason: typeof data.reason === "string" ? data.reason : "Appel programmé", scheduled: "1", autoStart: env.mockMode ? "1" : "0" } });
        return;
      }
      if (!BACKEND_CAPABILITIES.messaging) return;
      const conversationId = data.conversationId;
      if (typeof conversationId !== "string" || !conversationId.trim()) return;
      const target: PendingChatTarget = {
        conversationId: conversationId.trim(),
        messageId: typeof data.messageId === "string" && data.messageId.trim() ? data.messageId.trim() : undefined,
        focusMention: data.type === "mention" || data.type === "message_mention" || data.mention === true
      };
      processedNotificationResponseId.current = responseId;
      pendingChatTarget.current = target;
      void Notifications.clearLastNotificationResponseAsync();
      if (!sessionReady) return;
      if (isAuthenticated) {
        pendingChatTarget.current = null;
        openChatTarget(target);
      } else router.replace("/sign-in");
    };
    void Notifications.getLastNotificationResponseAsync().then(openNotificationTarget).catch(() => undefined);
    const subscription = Notifications.addNotificationResponseReceivedListener(openNotificationTarget);
    return () => subscription.remove();
  }, [isAuthenticated, sessionReady]);

  if (!sessionReady) return <View style={[styles.loading, { backgroundColor: theme.pageBackground }]} accessibilityLabel="Chargement de Connexio"><ActivityIndicator size="large" color={colors.primary} /></View>;

  const applicationStack = (
    <>
      <StatusBar style={theme.isLight ? "dark" : "light"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.pageBackground }, animation: "fade" }} />
      <FloatingBackButton />
      <AppAlertHost />
    </>
  );

  if (!isAuthenticated) {
    if (!onPublicRoute) return <Redirect href="/sign-in" />;
    return applicationStack;
  }
  if (onUnavailableMessagingRoute || onUnavailableCallRoute) return <Redirect href="/(tabs)/highlights" />;

  return <MessagingProvider key={`user:${currentUser.id}`}><GroupAdminProvider><ExperienceProvider><ScheduledCallsProvider>{applicationStack}</ScheduledCallsProvider></ExperienceProvider></GroupAdminProvider></MessagingProvider>;
}

export default function RootLayout() {
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}><ThemeProvider><LanguageProvider><SessionProvider><AuthenticatedApp /></SessionProvider></LanguageProvider></ThemeProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: "center", justifyContent: "center" } });
