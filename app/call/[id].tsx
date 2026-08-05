import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import CallSurface from "@/components/CallSurface";
import { StatusAvatar } from "@/components/StatusAvatar";
import { VoicePromptInput } from "@/components/VoicePromptInput";
import type { CallUnansweredEvent } from "@/components/CallSurface.types";
import { env } from "@/config/env";
import {
  canInitiatePrivateInteraction,
  TRITON_CHECKOUT_URL
} from "@/domain/accessPolicy";
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
import { useExperience } from "@/providers/ExperienceProvider";
import { useActionSounds } from "@/services/audio/actionSounds";
import type { AppUser } from "@/types/messaging";

type DeclineResponse = "callback_10m" | "message_available";

function first(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function CallRoomScreen() {
  const params = useLocalSearchParams<{
    id: string;
    mode?: string;
    direction?: string;
    callId?: string;
    callerName?: string;
    reason?: string;
  }>();
  const { accessToken, currentUser } = useSession();
  const { getConversation, sendMessage } = useMessaging();
  const { members } = useExperience();
  const { playCallEnd } = useActionSounds();
  const conversationId = first(params.id) ?? "";
  const mode: CallMode = first(params.mode) === "audio" ? "audio" : "video";
  const incoming = first(params.direction) === "incoming";
  const incomingCallId = first(params.callId);
  const callerName = first(params.callerName) ?? "Un membre Neptune";
  const initialReason = first(params.reason) ?? "";
  const conversation = getConversation(conversationId);
  const remoteMember = (conversation?.memberIds ?? [])
    .map((memberId) => members.find((member) => member.id === memberId))
    .find((member): member is AppUser => Boolean(member && member.id !== currentUser.id));
  const remoteDisplayName = incoming
    ? remoteMember?.name ?? callerName
    : remoteMember?.name ?? conversation?.name ?? "Membre Neptune";

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
  const ringtonePlayer = useAudioPlayer(
    require("../../assets/audio/connexio-ringtone.mp3")
  );

  useEffect(() => {
    const shouldRing =
      incoming && !session && !unanswered && !declining && !preparing;
    ringtonePlayer.loop = true;
    ringtonePlayer.volume = 0.68;
    if (shouldRing) {
      ringtonePlayer.play();
    } else {
      ringtonePlayer.pause();
      void ringtonePlayer.seekTo(0);
    }
    return () => {
      ringtonePlayer.pause();
      void ringtonePlayer.seekTo(0);
    };
  }, [declining, incoming, preparing, ringtonePlayer, session, unanswered]);

  const close = async () => {
    const activeSession = session;
    setSession(null);
    if (activeSession) playCallEnd();
    if (api && activeSession && !activeSession.mock) {
      await api.endCall(activeSession.id).catch(() => undefined);
    }
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/calls");
  };

  const startOutgoingCall = async () => {
    if (preparing) return;
    if (!canInitiatePrivateInteraction(currentUser.role)) {
      Alert.alert(
        "Passez Triton",
        "Un compte Free peut recevoir un appel, mais doit passer Triton pour appeler.",
        [
          { text: "Plus tard", style: "cancel" },
          {
            text: "Passer Triton",
            onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL)
          }
        ]
      );
      return;
    }
    const cleanReason = reason.trim();
    if (cleanReason.length < 3) {
      Alert.alert(
        "Objet de l’appel requis",
        "Expliquez brièvement pourquoi vous appelez. Le destinataire verra cette information avant de répondre."
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
        reason: (nextSession.reason ?? initialReason) || "Appel Neptune",
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
      playCallEnd();
      const topic = initialReason || "votre appel";
      const body =
        response === "callback_10m"
          ? `Je suis indisponible pour le moment. Je vous rappelle dans 10 minutes au sujet de « ${topic} ».`
          : `Je ne peux pas répondre pour le moment, mais nous pouvons échanger par message au sujet de « ${topic} ».`;
      const sent = await sendMessage(conversationId, body);
      if (!sent) throw new Error("Le message automatique n’a pas pu être envoyé.");

      if (response === "callback_10m") {
        const scheduled = await scheduleCallBackReminder(conversationId, callerName);
        if (!scheduled) {
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
    const activeSession = session;
    setUnanswered(event);
    setSession(null);
    playCallEnd();
    if (api && activeSession && !activeSession.mock) {
      await api.endCall(activeSession.id).catch(() => undefined);
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
      <CallShell
        member={remoteMember}
        icon="mic-outline"
        title="Aucune réponse"
        description="Ouvrez la conversation pour laisser un message vocal ou écrire un message."
      >
        <ReasonCard value={unanswered.reason || reason || "Appel Neptune"} />
        <PrimaryButton
          icon="chatbubble-ellipses-outline"
          label="Laisser un message"
          onPress={() =>
            router.replace(`/chat/${encodeURIComponent(conversationId)}`)
          }
        />
        <SecondaryButton label="Fermer" onPress={() => void close()} />
      </CallShell>
    );
  }

  if (incoming) {
    return (
      <CallShell
        member={remoteMember}
        icon={mode === "audio" ? "call-outline" : "videocam-outline"}
        title={callerName}
        eyebrow={mode === "audio" ? "APPEL AUDIO ENTRANT" : "APPEL VIDÉO ENTRANT"}
        description="Consultez l’objet de l’appel avant de répondre."
      >
        <ReasonCard value={initialReason || "Aucun objet précisé"} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.declineGrid}>
          <ChoiceButton
            icon="time-outline"
            label="Je rappelle dans 10 min"
            busy={declining === "callback_10m"}
            disabled={preparing || Boolean(declining)}
            onPress={() => void declineIncomingCall("callback_10m")}
          />
          <ChoiceButton
            icon="chatbubble-ellipses-outline"
            label="Échanger par message"
            busy={declining === "message_available"}
            disabled={preparing || Boolean(declining)}
            onPress={() => void declineIncomingCall("message_available")}
          />
        </View>
        <PrimaryButton
          icon="call"
          label="Accepter l’appel"
          busy={preparing}
          disabled={Boolean(declining)}
          success
          onPress={() => void acceptIncomingCall()}
        />
      </CallShell>
    );
  }

  return (
    <CallShell
      member={remoteMember}
      icon={mode === "audio" ? "call-outline" : "videocam-outline"}
      title="Pourquoi appelez-vous ?"
      description="Une phrase suffit. Elle s’affichera avant que le destinataire décroche."
    >
      <View style={styles.reasonEditor}>
        <Text style={styles.label}>Objet de l’appel</Text>
        <VoicePromptInput
          value={reason}
          onChangeText={setReason}
          onSubmit={() => void startOutgoingCall()}
          placeholder="Ex. Valider le lieu de l’afterwork de vendredi"
          maxLength={160}
        />
        <Text style={styles.counter}>{reason.length}/160</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <PrimaryButton
        icon={mode === "audio" ? "call" : "videocam"}
        label={preparing ? "Préparation…" : "Lancer l’appel"}
        busy={preparing}
        disabled={reason.trim().length < 3}
        onPress={() => void startOutgoingCall()}
      />
      <SecondaryButton label="Annuler" onPress={() => void close()} />
    </CallShell>
  );
}

interface CallShellProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  eyebrow?: string;
  children: React.ReactNode;
  member?: AppUser;
}

function CallShell({ icon, title, description, eyebrow, children, member }: CallShellProps) {
  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      {member ? (
        <View style={styles.memberIdentity}>
          <StatusAvatar user={member} size={70} showBadge />
        </View>
      ) : (
        <View style={styles.iconShell}>
          <Ionicons name={icon} size={31} color={colors.orange} />
        </View>
      )}
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>
      {children}
    </LinearGradient>
  );
}

function ReasonCard({ value }: { value: string }) {
  return (
    <View style={styles.reasonCard}>
      <Text style={styles.label}>Objet de l’appel</Text>
      <Text style={styles.reasonValue}>{value}</Text>
    </View>
  );
}

interface PrimaryButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  success?: boolean;
}

function PrimaryButton({
  icon,
  label,
  onPress,
  busy = false,
  disabled = false,
  success = false
}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        styles.primary,
        success && styles.primarySuccess,
        (disabled || busy) && styles.disabled
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Ionicons name={icon} size={21} color={colors.white} />
      )}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.secondary}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

interface ChoiceButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}

function ChoiceButton({ icon, label, busy, disabled, onPress }: ChoiceButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choice, disabled && styles.disabled]}
    >
      {busy ? (
        <ActivityIndicator color={colors.orange} />
      ) : (
        <Ionicons name={icon} size={21} color={colors.orange} />
      )}
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md
  },
  memberIdentity: { marginBottom: 5 },
  iconShell: {
    width: 70,
    height: 70,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,177,131,0.12)",
    borderWidth: 1,
    borderColor: "rgba(244,177,131,0.28)"
  },
  eyebrow: {
    color: colors.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1
  },
  title: { ...typography.heading2, color: colors.text, textAlign: "center" },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 500
  },
  reasonEditor: {
    width: "100%",
    maxWidth: 520,
    padding: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  reasonCard: {
    width: "100%",
    maxWidth: 520,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  label: {
    color: colors.orange,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  input: {
    minHeight: 92,
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
  counter: { marginTop: 6, color: colors.textMuted, fontSize: 11, textAlign: "right" },
  reasonValue: {
    marginTop: 7,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center"
  },
  error: {
    width: "100%",
    maxWidth: 520,
    padding: 10,
    borderRadius: 14,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    textAlign: "center",
    fontSize: 11
  },
  primary: {
    minWidth: 230,
    minHeight: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: 19,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  primarySuccess: { backgroundColor: colors.success },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  secondary: {
    minWidth: 130,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryText: { color: colors.textMuted, fontSize: 14, fontWeight: "800" },
  declineGrid: { width: "100%", maxWidth: 520, flexDirection: "row", gap: 9 },
  choice: {
    flex: 1,
    minHeight: 88,
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  choiceText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "900",
    textAlign: "center"
  },
  disabled: { opacity: 0.55 }
});
