import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import CallSurface from "@/components/CallSurface";
import { env } from "@/config/env";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneCallApi } from "@/services/api/callApi";
import {
  createMockCallSession,
  type CallMode,
  type IntegratedCallSession
} from "@/services/calls/callRoom";
import { colors, gradients, spacing, typography } from "@/theme";

export default function CallRoomScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const { currentUser, accessToken } = useSession();
  const conversationId = useMemo(
    () =>
      Array.isArray(params.id)
        ? (params.id[0] ?? "")
        : (params.id ?? ""),
    [params.id]
  );
  const mode: CallMode = params.mode === "audio" ? "audio" : "video";
  const [session, setSession] = useState<IntegratedCallSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneCallApi(accessToken)),
    [accessToken]
  );

  useEffect(() => {
    let cancelled = false;
    setSession(null);
    setError(null);
    void (async () => {
      try {
        const nextSession = api
          ? await api.createSession(conversationId, mode)
          : createMockCallSession(conversationId, mode);
        if (!cancelled) setSession(nextSession);
      } catch (callError) {
        if (!cancelled) {
          setError(
            callError instanceof Error
              ? callError.message
              : "L’appel n’a pas pu être créé."
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, conversationId, mode]);

  const close = async () => {
    const currentSession = session;
    setSession(null);
    if (api && currentSession && !currentSession.mock) {
      await api.endCall(currentSession.id).catch(() => undefined);
    }
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/calls");
  };

  if (error) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.center}>
        <View style={styles.errorIcon}>
          <Ionicons name="call-outline" size={30} color={colors.danger} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Appel indisponible
        </Text>
        <Text accessibilityRole="alert" style={styles.message}>
          {error}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir aux conversations"
          onPress={() => void close()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Retour</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  if (!session) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.center}>
        <ActivityIndicator size="large" color={colors.violet} />
        <Text style={styles.title}>
          {mode === "audio" ? "Préparation de l’appel audio" : "Préparation de la visio"}
        </Text>
        <Text style={styles.message}>
          Connexio sécurise la session et initialise la caméra et le microphone.
        </Text>
      </LinearGradient>
    );
  }

  return (
    <CallSurface
      session={session}
      displayName={currentUser.name}
      onClose={() => void close()}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft
  },
  title: { ...typography.heading2, color: colors.text, textAlign: "center" },
  message: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 430
  },
  button: {
    minWidth: 130,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: { color: colors.white, fontSize: 13, fontWeight: "900" }
});
