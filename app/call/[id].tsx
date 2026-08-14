import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { AppAlert } from "@/services/ui/AppAlert";

import CallSurface from "@/components/CallSurface";
import type { CallUnansweredEvent } from "@/components/CallSurface.types";
import { StatusAvatar } from "@/components/StatusAvatar";
import { VoicePromptInput } from "@/components/VoicePromptInput";
import { env } from "@/config/env";
import { canInitiatePrivateInteraction, TRITON_CHECKOUT_URL } from "@/domain/accessPolicy";
import { useExperience } from "@/providers/ExperienceProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { NeptuneCallApi } from "@/services/api/callApi";
import { useActionSounds } from "@/services/audio/actionSounds";
import { createMockCallSession, type CallMode, type IntegratedCallSession } from "@/services/calls/callRoom";
import { scheduleCallBackReminder } from "@/services/notifications/pushNotifications";
import { colors, spacing, typography } from "@/theme";
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
    scheduled?: string;
    returnTo?: string;
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
  const scheduled = first(params.scheduled) === "1" && initialReason.trim().length >= 3;
  const requestedReturnTo = first(params.returnTo);
  const returnTo = requestedReturnTo && requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("/call/")
    ? requestedReturnTo
    : conversationId ? `/chat/${encodeURIComponent(conversationId)}` : "/(tabs)/calls";
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
  const api = useMemo(() => (env.mockMode ? null : new NeptuneCallApi(accessToken)), [accessToken]);
  const ringtonePlayer = useAudioPlayer(require("../../assets/audio/connexio-ringtone.mp3"));

  useEffect(() => {
    const shouldRing = incoming && !session && !unanswered && !declining && !preparing;
    ringtonePlayer.loop = true;
    ringtonePlayer.volume = 0.68;
    if (shouldRing) ringtonePlayer.play();
    else {
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
    if (api && activeSession && !activeSession.mock) await api.endCall(activeSession.id).catch(() => undefined);
    router.replace(returnTo as never);
  };

  const startOutgoingCall = async () => {
    if (preparing) return;
    if (!canInitiatePrivateInteraction(currentUser.role)) {
      AppAlert.alert("Passez Triton", "Un compte Free peut recevoir un appel, mais doit passer Triton pour appeler.", [
        { text: "Plus tard", style: "cancel" },
        { text: "Passer Triton", onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL) }
      ]);
      return;
    }
    const cleanReason = reason.trim();
    if (cleanReason.length < 3) {
      AppAlert.alert("Objet de l’appel requis", "Expliquez brièvement pourquoi vous appelez. Le destinataire verra cette information avant de répondre.");
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
      setError(callError instanceof Error ? callError.message : "L’appel n’a pas pu être créé.");
    } finally {
      setPreparing(false);
    }
  };

  const acceptIncomingCall = async () => {
    if (preparing) return;
    setPreparing(true);
    setError(null);
    try {
      const nextSession = api && incomingCallId
        ? await api.joinSession(incomingCallId, conversationId, mode)
        : createMockCallSession(conversationId, mode, initialReason || "Appel Neptune", false);
      setSession({ ...nextSession, reason: (nextSession.reason ?? initialReason) || "Appel Neptune", initiator: false });
    } catch (callError) {
      setError(callError instanceof Error ? callError.message : "Impossible d’accepter l’appel.");
    } finally {
      setPreparing(false);
    }
  };

  const declineIncomingCall = async (response: DeclineResponse) => {
    if (declining) return;
    setDeclining(response);
    try {
      if (api && incomingCallId) await api.declineCall(incomingCallId, response);
      playCallEnd();
      const topic = initialReason || "votre appel";
      const body = response === "callback_10m"
        ? `Je suis indisponible pour le moment. Je vous rappelle dans 10 minutes au sujet de « ${topic} ».`
        : `Je ne peux pas répondre pour le moment, mais nous pouvons échanger par message au sujet de « ${topic} ».`;
      const sent = await sendMessage(conversationId, body);
      if (!sent) throw new Error("Le message automatique n’a pas pu être envoyé.");
      if (response === "callback_10m") {
        const reminderScheduled = await scheduleCallBackReminder(conversationId, callerName);
        if (!reminderScheduled) AppAlert.alert("Rappel non programmé", "Le message a été envoyé, mais les notifications ne sont pas autorisées sur cet appareil.");
      }
      router.replace(`/chat/${encodeURIComponent(conversationId)}`);
    } catch (declineError) {
      AppAlert.alert("Action impossible", declineError instanceof Error ? declineError.message : "La réponse n’a pas pu être envoyée.");
    } finally {
      setDeclining(null);
    }
  };

  const handleUnanswered = async (event: CallUnansweredEvent) => {
    const activeSession = session;
    setUnanswered(event);
    setSession(null);
    playCallEnd();
    if (api && activeSession && !activeSession.mock) await api.endCall(activeSession.id).catch(() => undefined);
  };

  if (session) {
    return <CallSurface session={session} displayName={remoteDisplayName} onClose={() => void close()} onUnanswered={(event) => void handleUnanswered(event)} />;
  }

  if (unanswered) {
    return (
      <CallShell member={remoteMember} icon="mic-outline" title="Aucune réponse" description="Ouvrez la conversation pour laisser un message vocal ou écrire un message.">
        <ReasonCard value={unanswered.reason || reason || "Appel Neptune"} />
        <PrimaryButton icon="chatbubble-ellipses-outline" label="Laisser un message" onPress={() => router.replace(`/chat/${encodeURIComponent(conversationId)}`)} />
        <SecondaryButton label="Fermer" onPress={() => void close()} />
      </CallShell>
    );
  }

  if (incoming) {
    return (
      <CallShell member={remoteMember} icon={mode === "audio" ? "call-outline" : "videocam-outline"} title={callerName} eyebrow={mode === "audio" ? "APPEL AUDIO ENTRANT" : "APPEL VIDÉO ENTRANT"} description="Consultez l’objet de l’appel avant de répondre.">
        <ReasonCard value={initialReason || "Aucun objet précisé"} />
        {error ? <ThemedError value={error} /> : null}
        <View style={styles.declineGrid}>
          <ChoiceButton icon="time-outline" label="Je rappelle dans 10 min" busy={declining === "callback_10m"} disabled={preparing || Boolean(declining)} onPress={() => void declineIncomingCall("callback_10m")} />
          <ChoiceButton icon="chatbubble-ellipses-outline" label="Échanger par message" busy={declining === "message_available"} disabled={preparing || Boolean(declining)} onPress={() => void declineIncomingCall("message_available")} />
        </View>
        <PrimaryButton icon="call" label="Accepter l’appel" busy={preparing} disabled={Boolean(declining)} success onPress={() => void acceptIncomingCall()} />
      </CallShell>
    );
  }

  return (
    <CallShell
      member={remoteMember}
      icon={mode === "audio" ? "call-outline" : "videocam-outline"}
      title={scheduled ? "Rendez-vous programmé" : "Pourquoi appelez-vous ?"}
      description={scheduled ? "L’objet a déjà été défini lors de la programmation. Vous pouvez rejoindre directement l’appel." : "Une phrase suffit. Elle s’affichera avant que le destinataire décroche."}
    >
      {scheduled ? <ReasonCard value={initialReason} /> : <ReasonEditor reason={reason} setReason={setReason} onSubmit={() => void startOutgoingCall()} />}
      {error ? <ThemedError value={error} /> : null}
      <PrimaryButton icon={mode === "audio" ? "call" : "videocam"} label={preparing ? "Préparation…" : scheduled ? "Rejoindre le rendez-vous" : "Lancer l’appel"} busy={preparing} disabled={reason.trim().length < 3} onPress={() => void startOutgoingCall()} />
      <SecondaryButton label="Annuler" onPress={() => void close()} />
    </CallShell>
  );
}

function CallShell({ icon, title, description, eyebrow, children, member }: { icon: keyof typeof Ionicons.glyphMap; title: string; description: string; eyebrow?: string; children: React.ReactNode; member?: AppUser }) {
  const theme = useAppTheme();
  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      {member ? <View style={styles.memberIdentity}><StatusAvatar user={member} size={70} /></View> : <View style={[styles.iconShell, { backgroundColor: theme.orangeSoft, borderColor: theme.orange }]}><Ionicons name={icon} size={31} color={theme.orange} /></View>}
      {eyebrow ? <Text style={[styles.eyebrow, { color: theme.orange }]}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={[styles.title, { color: theme.pageText }]}>{title}</Text>
      <Text style={[styles.description, { color: theme.pageTextMuted }]}>{description}</Text>
      {children}
    </LinearGradient>
  );
}

function ReasonEditor({ reason, setReason, onSubmit }: { reason: string; setReason: (value: string) => void; onSubmit: () => void }) {
  const theme = useAppTheme();
  return <View style={[styles.reasonEditor, { borderColor: theme.border, backgroundColor: theme.surface }]}><Text style={[styles.label, { color: theme.orange }]}>Objet de l’appel</Text><VoicePromptInput value={reason} onChangeText={setReason} onSubmit={onSubmit} placeholder="Ex. Valider le lieu de l’afterwork de vendredi" maxLength={160} /><Text style={[styles.counter, { color: theme.pageTextMuted }]}>{reason.length}/160</Text></View>;
}

function ReasonCard({ value }: { value: string }) {
  const theme = useAppTheme();
  return <View style={[styles.reasonCard, { borderColor: theme.border, backgroundColor: theme.surface }]}><Text style={[styles.label, { color: theme.orange }]}>Objet de l’appel</Text><Text style={[styles.reasonValue, { color: theme.pageText }]}>{value}</Text></View>;
}

function ThemedError({ value }: { value: string }) {
  const theme = useAppTheme();
  return <Text accessibilityRole="alert" style={[styles.error, { color: theme.danger, backgroundColor: theme.dangerSoft }]}>{value}</Text>;
}

function PrimaryButton({ icon, label, onPress, busy = false, disabled = false, success = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; busy?: boolean; disabled?: boolean; success?: boolean }) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ busy, disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress} style={[styles.primary, { backgroundColor: success ? theme.success : colors.primary }, (disabled || busy) && styles.disabled]}>
      {busy ? <ActivityIndicator color={colors.white} /> : <Ionicons name={icon} size={21} color={colors.white} />}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.secondary}><Text style={[styles.secondaryText, { color: theme.pageTextMuted }]}>{label}</Text></Pressable>;
}

function ChoiceButton({ icon, label, busy, disabled, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; busy: boolean; disabled: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ busy, disabled }} disabled={disabled} onPress={onPress} style={[styles.choice, { borderColor: theme.borderSoft, backgroundColor: theme.surface }, disabled && styles.disabled]}>
      {busy ? <ActivityIndicator color={theme.orange} /> : <Ionicons name={icon} size={21} color={theme.orange} />}
      <Text style={[styles.choiceText, { color: theme.pageTextSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  memberIdentity: { marginBottom: 5 },
  iconShell: { width: 70, height: 70, borderRadius: 24, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  eyebrow: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  title: { ...typography.heading2, textAlign: "center" },
  description: { ...typography.body, textAlign: "center", maxWidth: 500 },
  reasonEditor: { width: "100%", maxWidth: 520, padding: spacing.md, borderRadius: 22, borderWidth: 1 },
  reasonCard: { width: "100%", maxWidth: 520, padding: spacing.md, borderRadius: 20, borderWidth: 1 },
  label: { fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.6 },
  counter: { marginTop: 6, fontSize: 11, textAlign: "right" },
  reasonValue: { marginTop: 7, fontSize: 14, lineHeight: 20, fontWeight: "800", textAlign: "center" },
  error: { width: "100%", maxWidth: 520, padding: 10, borderRadius: 14, textAlign: "center", fontSize: 11 },
  primary: { minWidth: 230, minHeight: 54, paddingHorizontal: spacing.lg, borderRadius: 19, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  secondary: { minWidth: 130, minHeight: 48, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 14, fontWeight: "800" },
  declineGrid: { width: "100%", maxWidth: 520, flexDirection: "row", gap: 9 },
  choice: { flex: 1, minHeight: 88, padding: 10, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  choiceText: { fontSize: 11, lineHeight: 14, fontWeight: "900", textAlign: "center" },
  disabled: { opacity: 0.55 }
});
