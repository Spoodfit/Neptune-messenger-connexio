import { Text } from "@/components/LocalizedText";
import CoworkingMediaSurface from "@/components/CoworkingMediaSurface";
import { StatusAvatar } from "@/components/StatusAvatar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { participantPresence } from "@/domain/coworking";
import { useCoworking } from "@/providers/CoworkingProvider";
import { useExperience } from "@/providers/ExperienceProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { colors, gradients, spacing, typography } from "@/theme";
import type { AppUser } from "@/types/messaging";
import type { CoworkingPresenceMode, CoworkingSpace } from "@/types/coworking";

const MOCK_POSITIONS = [
  { left: "8%", top: "12%" },
  { right: "7%", top: "9%" },
  { left: "15%", bottom: "12%" },
  { right: "13%", bottom: "16%" },
  { left: "39%", top: "4%" },
  { left: "41%", bottom: "5%" }
] as const;

function first(value?: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function userForId(members: AppUser[], currentUser: AppUser, id: string): AppUser | undefined {
  return id === currentUser.id ? currentUser : members.find((member) => member.id === id);
}

function formatRemaining(endsAt?: string, now = Date.now()): string | null {
  if (!endsAt) return null;
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return null;
  const seconds = Math.max(0, Math.ceil((end - now) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function CoworkingRoomScreen() {
  const params = useLocalSearchParams<{ spaceId?: string | string[] }>();
  const spaceId = first(params.spaceId);
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentUser } = useSession();
  const { members } = useExperience();
  const {
    snapshot,
    currentSpace,
    mediaForSpace,
    joinSpace,
    leaveCurrentSpace,
    updatePresence
  } = useCoworking();
  const [cameraOn, setCameraOn] = useState(true);
  const [microphoneOn, setMicrophoneOn] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [now, setNow] = useState(Date.now());

  const space = useMemo<CoworkingSpace | undefined>(() => {
    if (snapshot.hub.id === spaceId) return snapshot.hub;
    return snapshot.spaces.find((item) => item.id === spaceId);
  }, [snapshot.hub, snapshot.spaces, spaceId]);
  const media = mediaForSpace(spaceId);
  const participants = useMemo(
    () => (space?.participantIds ?? [])
      .map((id) => userForId(members, currentUser, id))
      .filter((member): member is AppUser => Boolean(member)),
    [currentUser, members, space?.participantIds]
  );
  const ownPresence = participantPresence(snapshot, currentUser.id);
  const remaining = formatRemaining(space?.focusEndsAt, now);

  useEffect(() => {
    if (!space?.focusEndsAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [space?.focusEndsAt]);

  useEffect(() => {
    if (!ownPresence) return;
    setCameraOn(ownPresence.cameraOn);
    setMicrophoneOn(ownPresence.microphoneOn);
  }, [ownPresence?.cameraOn, ownPresence?.microphoneOn, ownPresence?.userId]);

  const leave = async () => {
    try {
      await leaveCurrentSpace();
    } finally {
      router.replace("/coworking");
    }
  };

  const reconnect = async () => {
    if (!space || reconnecting) return;
    setReconnecting(true);
    setMediaError(null);
    try {
      await joinSpace(space.id);
    } catch (error) {
      setMediaError(error instanceof Error ? error.message : "Connexion visio impossible.");
    } finally {
      setReconnecting(false);
    }
  };

  const setMode = async (mode: CoworkingPresenceMode) => {
    await updatePresence(mode);
  };

  if (!space || currentSpace?.id !== space.id) {
    return (
      <LinearGradient colors={theme.pageGradient} style={styles.screen}>
        <View style={[styles.missing, { paddingTop: insets.top + 20 }]}>
          <Ionicons name="layers-outline" size={42} color={theme.violet} />
          <Text style={[styles.missingTitle, { color: theme.pageText }]}>Cet espace n’est plus actif</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/coworking")} style={[styles.backToLobby, { backgroundColor: theme.violetSoft }]}><Ionicons name="arrow-back" size={19} color={theme.violet} /><Text style={[styles.backToLobbyText, { color: theme.pageText }]}>Retour au Coworking</Text></Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8), borderBottomColor: theme.borderSoft }]}>
        <Pressable accessibilityLabel="Retour au Coworking sans quitter" onPress={() => router.replace("/coworking")} style={[styles.topButton, { backgroundColor: theme.surface }]}><Ionicons name="chevron-back" size={23} color={theme.pageText} /></Pressable>
        <View style={styles.roomIdentity}>
          <View style={styles.roomTitleRow}>
            <View style={styles.liveDot} />
            <Text numberOfLines={1} style={[styles.roomTitle, { color: theme.pageText }]}>{space.name}</Text>
            {space.access === "invite" ? <Ionicons name="lock-closed" size={12} color={theme.pageTextMuted} /> : null}
          </View>
          <Text style={[styles.roomSubtitle, { color: theme.pageTextMuted }]}>{participants.length} ici{remaining ? ` · ${remaining}` : ""}</Text>
        </View>
        <Pressable accessibilityLabel="Quitter l’espace" onPress={() => void leave()} style={[styles.topButton, { backgroundColor: theme.dangerSoft }]}><Ionicons name="exit-outline" size={22} color={theme.danger} /></Pressable>
      </View>

      <View style={styles.stageShell}>
        <View pointerEvents="none" style={[styles.glowOne, { backgroundColor: theme.violetSoft }]} />
        <View pointerEvents="none" style={[styles.glowTwo, { backgroundColor: theme.accentSoft }]} />
        {media && !media.mock ? (
          <CoworkingMediaSurface
            session={media}
            displayName={currentUser.name}
            cameraOn={cameraOn}
            microphoneOn={microphoneOn}
            onError={setMediaError}
          />
        ) : (
          <MockPresenceStage participants={participants} currentUser={currentUser} snapshot={snapshot} />
        )}

        {!media && !mediaError ? (
          <Pressable accessibilityRole="button" disabled={reconnecting} onPress={() => void reconnect()} style={({ pressed }) => [styles.reconnectCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}>
            {reconnecting ? <ActivityIndicator size="small" color={theme.violet} /> : <Ionicons name="videocam-outline" size={21} color={theme.violet} />}
            <Text style={[styles.reconnectText, { color: theme.pageText }]}>{reconnecting ? "Connexion…" : "Reprendre la visio"}</Text>
          </Pressable>
        ) : null}
        {mediaError ? (
          <Pressable accessibilityRole="button" onPress={() => void reconnect()} style={[styles.mediaError, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
            <Ionicons name="alert-circle" size={18} color={theme.danger} />
            <Text numberOfLines={2} style={[styles.mediaErrorText, { color: theme.pageText }]}>{mediaError}</Text>
            <Ionicons name="refresh" size={18} color={theme.pageText} />
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.contextBar, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <View style={styles.contextIdentity}>
          <Ionicons name={ownPresence?.mode === "focus" ? "radio-button-on" : ownPresence?.mode === "break" ? "cafe" : "sparkles"} size={17} color={ownPresence?.mode === "focus" ? theme.violet : theme.success} />
          <View style={styles.contextCopy}>
            <Text style={[styles.contextTitle, { color: theme.pageText }]}>{ownPresence?.mode === "focus" ? "Focus" : ownPresence?.mode === "break" ? "Pause" : ownPresence?.mode === "talk" ? "Disponible pour échanger" : "Disponible"}</Text>
            <Text numberOfLines={1} style={[styles.contextText, { color: theme.pageTextMuted }]}>{space.activity ?? "Coworking en cours"}</Text>
          </View>
        </View>
        <View style={styles.statusActions}>
          <Pressable accessibilityLabel="Mode Focus" onPress={() => void setMode("focus")} style={[styles.miniStatus, { backgroundColor: ownPresence?.mode === "focus" ? theme.violetSoft : theme.surfaceStrong }]}><Ionicons name="timer-outline" size={18} color={ownPresence?.mode === "focus" ? theme.violet : theme.pageTextMuted} /></Pressable>
          <Pressable accessibilityLabel="Mode disponible" onPress={() => void setMode("available")} style={[styles.miniStatus, { backgroundColor: ownPresence?.mode === "available" ? theme.successSoft : theme.surfaceStrong }]}><Ionicons name="sparkles-outline" size={18} color={ownPresence?.mode === "available" ? theme.success : theme.pageTextMuted} /></Pressable>
        </View>
      </View>

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: theme.shellBackground, borderTopColor: theme.borderSoft }]}>
        <Control icon={microphoneOn ? "mic" : "mic-off"} label={microphoneOn ? "Couper le micro" : "Activer le micro"} active={microphoneOn} onPress={() => setMicrophoneOn((value) => !value)} />
        <Control icon={cameraOn ? "videocam" : "videocam-off"} label={cameraOn ? "Couper la caméra" : "Activer la caméra"} active={cameraOn} onPress={() => setCameraOn((value) => !value)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Quitter le Coworking" onPress={() => void leave()} style={({ pressed }) => [styles.leaveControl, { backgroundColor: theme.danger }, pressed && styles.controlPressed]}><Ionicons name="exit" size={25} color={colors.white} /></Pressable>
        <Control icon="chatbubble-ellipses-outline" label="Disponible pour échanger" active={ownPresence?.mode === "talk"} onPress={() => void setMode("talk")} />
        <Control icon="cafe-outline" label="Pause" active={ownPresence?.mode === "break"} onPress={() => void setMode("break")} />
      </View>
    </LinearGradient>
  );
}

function MockPresenceStage({ participants, currentUser, snapshot }: { participants: AppUser[]; currentUser: AppUser; snapshot: ReturnType<typeof useCoworking>["snapshot"] }) {
  const theme = useAppTheme();
  return (
    <View style={styles.mockStage}>
      <View pointerEvents="none" style={[styles.mockOrbit, { borderColor: theme.borderSoft }]} />
      {participants.slice(0, MOCK_POSITIONS.length).map((member, index) => {
        const presence = participantPresence(snapshot, member.id);
        const isMe = member.id === currentUser.id;
        return (
          <View key={member.id} style={[styles.mockPerson, MOCK_POSITIONS[index]]}>
            {presence?.speaking ? <View style={[styles.speakingRing, { borderColor: theme.success }]} /> : null}
            <LinearGradient colors={presence?.cameraOn ? gradients.activeTab : gradients.glass} style={[styles.mockVideo, { borderColor: presence?.speaking ? theme.success : theme.borderSoft }]}>
              <StatusAvatar user={member} size={68} ringWidth={2.2} accessible={false} />
              {!presence?.microphoneOn ? <View style={[styles.mutedBadge, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="mic-off" size={11} color={theme.pageTextMuted} /></View> : null}
            </LinearGradient>
            <Text numberOfLines={1} style={[styles.mockName, { color: theme.pageText }]}>{isMe ? "Moi" : member.name.split(/\s+/)[0]}</Text>
          </View>
        );
      })}
      {participants.length === 0 ? <View style={styles.alone}><Ionicons name="sparkles-outline" size={30} color={theme.violet} /><Text style={[styles.aloneText, { color: theme.pageTextMuted }]}>Vous êtes le premier ici</Text></View> : null}
    </View>
  );
}

function Control({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.control, { backgroundColor: active ? theme.violetSoft : theme.surfaceStrong, borderColor: active ? theme.violet : theme.borderSoft }, pressed && styles.controlPressed]}><Ionicons name={icon} size={22} color={active ? theme.violet : theme.pageTextMuted} /></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { minHeight: 66, paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  topButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  roomIdentity: { flex: 1, minWidth: 0, alignItems: "center" },
  roomTitleRow: { maxWidth: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  roomTitle: { maxWidth: "78%", fontSize: 15, fontWeight: "900" },
  roomSubtitle: { fontSize: 11, marginTop: 1, fontWeight: "700" },
  stageShell: { flex: 1, minHeight: 0, margin: 8, borderRadius: 30, overflow: "hidden", position: "relative" },
  glowOne: { position: "absolute", width: 260, height: 260, borderRadius: 130, left: -100, top: -90, opacity: 0.4 },
  glowTwo: { position: "absolute", width: 290, height: 290, borderRadius: 145, right: -120, bottom: -110, opacity: 0.32 },
  mockStage: { flex: 1, minHeight: 280, position: "relative", overflow: "hidden" },
  mockOrbit: { position: "absolute", width: 270, height: 270, borderRadius: 135, borderWidth: 1, left: "50%", top: "50%", marginLeft: -135, marginTop: -135, opacity: 0.5 },
  mockPerson: { position: "absolute", width: 106, alignItems: "center" },
  speakingRing: { position: "absolute", width: 92, height: 92, top: -4, borderRadius: 46, borderWidth: 2, opacity: 0.75 },
  mockVideo: { width: 84, height: 84, borderRadius: 30, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  mutedBadge: { position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  mockName: { width: 100, textAlign: "center", fontSize: 11, marginTop: 4, fontWeight: "900" },
  alone: { position: "absolute", left: 20, right: 20, top: "45%", alignItems: "center", gap: 7 },
  aloneText: { fontSize: 12, fontWeight: "800" },
  reconnectCard: { position: "absolute", left: 16, right: 16, bottom: 16, minHeight: 48, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  reconnectText: { fontSize: 12, fontWeight: "900" },
  mediaError: { position: "absolute", left: 12, right: 12, bottom: 12, minHeight: 48, borderRadius: 17, borderWidth: 1, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 8 },
  mediaErrorText: { flex: 1, fontSize: 11, fontWeight: "700" },
  contextBar: { minHeight: 58, marginHorizontal: 10, marginBottom: 7, borderRadius: 19, borderWidth: 1, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  contextIdentity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  contextCopy: { flex: 1, minWidth: 0 },
  contextTitle: { fontSize: 12, fontWeight: "900" },
  contextText: { fontSize: 11, marginTop: 1 },
  statusActions: { flexDirection: "row", gap: 6 },
  miniStatus: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  controls: { minHeight: 72, paddingHorizontal: 6, paddingTop: 8, borderTopWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  control: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  controlPressed: { opacity: 0.8, transform: [{ scale: 0.94 }] },
  leaveControl: { width: 56, height: 50, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.lg },
  missingTitle: { ...typography.heading2, textAlign: "center" },
  backToLobby: { minHeight: 48, borderRadius: 17, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 7 },
  backToLobbyText: { fontSize: 13, fontWeight: "900" }
});
