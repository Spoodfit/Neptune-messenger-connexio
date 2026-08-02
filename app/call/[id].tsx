import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import CallSurface from "@/components/CallSurface";
import type { CallUnansweredEvent } from "@/components/CallSurface.types";
import { env } from "@/config/env";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneCallApi } from "@/services/api/callApi";
import {
  createMockCallSession,
  type CallMode,
  type IntegratedCallSession
} from "@/services/calls/callRoom";
import { scheduleCallBackReminder } from "@/services/notifications/pushNotifications";
import { colors, gradients, spacing, typography } from "@/theme";

type DeclineResponse = "callback_10m" | "message_available";

export default function CallRoomScreen() {
  const params = useLocalSearchParams<{
    id: string;
    mode?: string;
    direction?: string;
    callId?: string;
    callerName?: string;
    reason?: string;
  }>();
  const { accessToken } = useSession();
  const { getConversation, sendMessage } = useMessaging();
  const conversationId = useMemo(
    () =>
      Array.isArray(params.id)
        ? (params.id[0] ?? "")
        : (params.id ?? ""),
    [params.id]
  );
  const mode: CallMode = params.mode === "audio" ? "audio" : "video";
  const incoming = params.direction === "incoming";
  const incomingCallId = Array.isArray(params.callId)
    ? params.callId[0]
    : params.callId;
  const callerName =
    (Array.isArray(params.callerName)
      ? params.callerName[0]
      : params.callerName) ?? "Un membre Neptune";
  const initialReason =
    (Array.isArray(params.reason) ? params.reason[0] : params.reason) ?? "";
  const conversation = getConversation(conversationId);
  const remoteDisplayName = incoming
    ? callerName
    : conversation?.name ?? "Membre Neptune";

  const [reason, setReason] = useState(initialReason);
  const [session, setSession] = useState<IntegratedCallSession | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [declining, setDeclining] = useState<DeclineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unanswered, setUnanswered] = useState<CallUnansweredEvent | null>(null);
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneCallApi(accessToken)),
    [accessToken]
  );

  const close = async () => {
    const currentSession = session;
    setSession(null);
    if (api && currentSession && !currentSession.mock) {
      await api.endCall(currentSession.id).catch(() => undefined);
    }
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/calls");
  };

  const startOutgoingCall = async () => {
    if (preparing) return;
    const cleanReason = reason.trim();
    if (cleanReason.length < 3) {
      Alert.alert(
        "Objet de l’appel requis",
        "Expliquez en quelques mots pourquoi vous appelez. Le destinataire verra cette information avant de répondre."
      );
      return;
    }
    setPreparing(true);
    setError(null);
    try {
      const nextSession = api
        ? await api.createSession(conversationId, mode, cleanReason)
        : createMockCallSession(conversationId, mode, cleanReason, true);
      setSession(nextSession);
    } catch (callError) {
      setError(
        callError instanceof Error
          ? callError.message
          : "L’appel n’a pas pu être créé."
      );
    } finally {
      setPreparing(false);
    }
  };

  const acceptIncomingCall = async () => {
    if (preparing) return;
    setPreparing(true);
    setError(null);
    try {
      const nextSession =
        api && incomingCallId
          ? await api.joinSession(incomingCallId, conversationId, mode)
          : createMockCallSession(
              conversationId,
              mode,
              initialReason || "Appel Neptune",
              false
            );
      setSession({
        ...nextSession,
        reason: nextSession.reason ?? initialReason || "Appel Neptune",
        initiator: false
      });
    } catch (callError) {
      setError(
        callError instanceof Error
          ? callError.message
          : "Impossible d’accepter l’appel."
      );
    } finally {
      setPreparing(false);
    }
  };

  const declineIncomingCall = async (response: DeclineResponse) => {
    if (declining) return;
    setDeclining(response);
    try {
      if (api && incomingCallId) {
        await api.declineCall(incomingCallId, response);
      }
      const body =
        response === "callback_10m"
          ? `Je suis indisponible pour le moment. Je vous rappelle dans 10 minutes au sujet de « ${initialReason || "votre appel"} ».`
          : `Je ne peux pas répondre à l’appel pour le moment, mais nous pouvons échanger par message au sujet de « ${initialReason || "votre demande"} ».`;
      await sendMessage(conversationId, body);

      if (response === "callback_10m") {
        const reminderScheduled = await scheduleCallBackReminder(
          conversationId,
          callerName
        );
        if (!reminderScheduled) {
          Alert.alert(
            "Rappel non programmé",
            "Le message a été envoyé, mais les notifications ne sont pas autorisées sur cet appareil."
          );
        }
      }
      router.replace(`/chat/${encodeURIComponent(conversationId)}`);
    } catch (declineError) {
      Alert.alert(
        "Action impossible",
        declineError instanceof Error
          ? declineError.message
          : "La réponse n’a pas pu être envoyée."
      );
    } finally {
      setDeclining(null);
    }
  };

  const handleUnanswered = async (event: CallUnansweredEvent) => {
    setUnanswered(event);
    const currentSession = session;
    setSession(null);
    if (api && currentSession && !currentSession.mock) {
      await api.endCall(currentSession.id).catch(() => undefined);
    }
  };

  if (session) {
    return (
      <CallSurface
        session={session}
        displayName={remoteDisplayName}
        onClose={() => void close()}
        onUnanswered={(event) => void handleUnanswered(event)}
      />
    );
  }

  if (unanswered) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.center}>
        <View style={styles.statusIcon}>
          <Ionicons name="mic-outline" size={31} color={colors.orange} />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Aucune réponse
        </Text>
        <Text style={styles.message}>
          L’appel n’a pas été décroché. Ouvrez la conversation pour laisser un
          message vocal ou écrire un message.
        </Text>
        <View style={styles.reasonReadOnly}>
          <Text style={styles.reasonLabel}>Objet de l’appel</Text>
          <Text style={styles.reasonValue}>{unanswered.reason || reason}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir la conversation pour laisser un message"
          onPress={() =>
            router.replace(`/chat/${encodeURIComponent(conversationId)}`)
          }
          style={styles.primaryButton}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.white} />
          <Text style={styles.primaryButtonText}>Laisser un message</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          onPress={() => void close()}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Fermer</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  if (incoming) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.center}>
        <View style={styles.incomingHalo}>
          <LinearGradient colors={gradients.primaryWarm} style={styles.callerAvatar}>
            <Text style={styles.callerInitials}>
              {callerName
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0] ?? "")
                .join("")
                .toLocaleUpperCase("fr")}
            </Text>
          </LinearGradient>
        </View>
        <Text style={styles.incomingEyebrow}>
          {mode === "audio" ? "APPEL AUDIO ENTRANT" : "APPEL VIDÉO ENTRANT"}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {callerName}
        </Text>
        <View style={styles.reasonReadOnly}>
          <Text style={styles.reasonLabel}>Objet de l’appel</Text>
          <Text style={styles.reasonValue}>
            {initialReason || "Aucun objet précisé"}
          </Text>
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {error}
          </Text>
        ) : null}
        <View style={styles.incomingActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Décliner et rappeler dans dix minutes"
            disabled={Boolean(declining) || preparing}
            onPress={() => void declineIncomingCall("callback_10m")}
            style={styles.declineOption}
          >
            {declining === "callback_10m" ? (
              <ActivityIndicator color={colors.orange} />
            ) : (
              <Ionicons name="time-outline" size={21} color={colors.orange} />
            )}
            <Text style={styles.declineOptionTitle}>Je rappelle dans 10 min</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Décliner et proposer un échange par message"
            disabled={Boolean(declining) || preparing}
            onPress={() => void declineIncomingCall("message_available")}
            style={styles.declineOption}
          >
            {declining === "message_available" ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={21}
                color={colors.text}
              />
            )}
            <Text style={styles.declineOptionTitle}>Échanger par message</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Accepter l’appel"
          disabled={preparing || Boolean(declining)}
          onPress={() => void acceptIncomingCall()}
          style={[styles.acceptButton, preparing && styles.disabled]}
        >
          {preparing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Ionicons name="call" size={23} color={colors.white} />
          )}
          <Text style={styles.acceptButtonText}>Accepter l’appel</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.screen} style={styles.center}>
      <View style={styles.statusIcon}>
        <Ionicons
          name={mode === "audio" ? "call-outline" : "videocam-outline"}
          size={31}
          color={colors.orange}
        />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        {mode === "audio" ? "Préparer l’appel audio" : "Préparer l’appel vidéo"}
      </Text>
      <Text style={styles.message}>
        Indiquez la raison de l’appel. Elle sera affichée au destinataire avant
        qu’il accepte ou décline.
      </Text>
      <View style={styles.reasonField}>
        <Text style={styles.reasonLabel}>Objet de l’appel</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Ex. Valider le lieu de l’afterwork de vendredi"
          placeholderTextColor={colors.textMuted}
          maxLength={160}
          multiline
          textAlignVertical="top"
          style={styles.reasonInput}
        />
        <Text style={styles.counter}>{reason.length}/160</Text>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Lancer l’appel"
        disabled={preparing}
        onPress={() => void startOutgoingCall()}
        style={[styles.primaryButton, preparing && styles.disabled]}
      >
        {preparing ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Ionicons
            name={mode === "audio" ? "call" : "videocam"}
            size={21}
            color={colors.white}
          />
        )}
        <Text style={styles.primaryButtonText}>
          {preparing ? "Préparation…" : "Lancer l’appel"}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Annuler"
        onPress={() => void close()}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryButtonText}>Annuler</Text>
      </Pressable>
    </LinearGradient>
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
  statusIcon: {
    width: 68,
    height: 68,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,177,131,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,177,131,0.28)"
  },
  title: { ...typography.heading2, color: colors.text, textAlign: "center" },
  message: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 480
  },
  reasonField: {
    width: "100%",
    maxWidth: 520,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  reasonLabel: {
    color: colors.orange,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  reasonInput: {
    minHeight: 94,
    marginTop: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  counter: {
    marginTop: 6,
    color: colors.textMuted,
    fontSize: 9,
    textAlign: "right"
  },
  reasonReadOnly: {
    width: "100%",
    maxWidth: 520,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  reasonValue: {
    marginTop: 7,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center"
  },
  primaryButton: {
    minWidth: 220,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  primaryButtonText: { color: colors.white, fontSize: 13, fontWeight: "900" },
  secondaryButton: {
    minWidth: 130,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryButtonText: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  errorText: {
    maxWidth: 520,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: 10,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16
  },
  incomingHalo: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(107,79,234,0.12)",
    borderWidth: 1,
    borderColor: "rgba(107,79,234,0.28)"
  },
  callerAvatar: {
    width: 98,
    height: 98,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  callerInitials: { color: colors.white, fontSize: 28, fontWeight: "900" },
  incomingEyebrow: {
    color: colors.orange,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1
  },
  incomingActions: {
    width: "100%",
    maxWidth: 520,
    flexDirection: "row",
    gap: 9
  },
  declineOption: {
    flex: 1,
    minHeight: 86,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 7
  },
  declineOptionTitle: {
    color: colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "900",
    textAlign: "center"
  },
  acceptButton: {
    minWidth: 240,
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    borderRadius: 21,
    backgroundColor: colors.success,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9
  },
  acceptButtonText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  disabled: { opacity: 0.55 }
});
