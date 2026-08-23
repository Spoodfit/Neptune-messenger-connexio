import { Text } from "@/components/LocalizedText";
import CoworkingMediaSurface from "@/components/CoworkingMediaSurface";
import { StatusAvatar } from "@/components/StatusAvatar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { env } from "@/config/env";
import { participantPresence } from "@/domain/coworking";
import { useCoworking } from "@/providers/CoworkingProvider";
import { useExperience } from "@/providers/ExperienceProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { CoworkingMapApi } from "@/services/api/coworkingMapApi";
import { AppAlert } from "@/services/ui/AppAlert";
import { colors } from "@/theme";
import type { AppUser } from "@/types/messaging";
import type { CoworkingSpace } from "@/types/coworking";

const DEFAULT_POSITIONS = [
  [19, 22], [43, 18], [71, 22], [84, 40], [67, 49], [35, 48], [16, 61],
  [43, 68], [72, 73], [87, 84], [56, 88], [27, 87], [10, 39], [88, 62],
  [53, 35], [27, 34], [12, 82], [74, 91], [48, 55], [90, 23]
] as const;

function first(value?: string | string[]): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] || value;
}

function userForId(members: AppUser[], currentUser: AppUser, id: string): AppUser | undefined {
  return id === currentUser.id ? currentUser : members.find((member) => member.id === id);
}

export default function CoworkingRoomScreen() {
  const params = useLocalSearchParams<{ spaceId?: string | string[] }>();
  const spaceId = first(params.spaceId);
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { currentUser, accessToken } = useSession();
  const { members } = useExperience();
  const {
    snapshot,
    currentSpace,
    mediaForSpace,
    leaveCurrentSpace,
    createSpace
  } = useCoworking();
  const mapApi = useMemo(() => (env.mockMode ? null : new CoworkingMapApi(accessToken)), [accessToken]);
  const [cameraOn, setCameraOn] = useState(true);
  const [microphoneOn, setMicrophoneOn] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [ownPosition, setOwnPosition] = useState({ x: 50, y: 54 });
  const [stageSize, setStageSize] = useState({ width: 1, height: 1 });
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"hello" | "office" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const space = useMemo<CoworkingSpace | undefined>(() => {
    if (snapshot.hub.id === spaceId) return snapshot.hub;
    return snapshot.spaces.find((item) => item.id === spaceId);
  }, [snapshot.hub, snapshot.spaces, spaceId]);
  const isGeneralRoom = Boolean(space && space.id === snapshot.hub.id);
  const media = mediaForSpace(spaceId);
  const participants = useMemo(
    () => (space?.participantIds ?? [])
      .map((id) => userForId(members, currentUser, id))
      .filter((member): member is AppUser => Boolean(member)),
    [currentUser, members, space?.participantIds]
  );
  const selectedMember = participants.find((member) => member.id === selectedUserId);
  const nodeSize = participants.length <= 6 ? 80 : participants.length <= 10 ? 72 : 64;
  const nodeHeight = nodeSize + 30;

  const participantLayout = useMemo(() => {
    const layout: Record<string, { x: number; y: number; width: number; height: number }> = {};
    participants.forEach((member, index) => {
      if (member.id === currentUser.id) {
        layout[member.id] = { x: ownPosition.x, y: ownPosition.y, width: nodeSize, height: nodeSize };
        return;
      }
      const fallback = DEFAULT_POSITIONS[index % DEFAULT_POSITIONS.length] ?? [50, 50];
      layout[member.id] = { x: fallback[0], y: fallback[1], width: nodeSize, height: nodeSize };
    });
    return layout;
  }, [currentUser.id, nodeSize, ownPosition.x, ownPosition.y, participants]);

  const leave = async () => {
    try {
      await leaveCurrentSpace();
      router.replace("/coworking");
    }
  };

  const onStageLayout = (event: LayoutChangeEvent) => {
    setStageSize({
      width: Math.max(1, event.nativeEvent.layout.width),
      height: Math.max(1, event.nativeEvent.layout.height)
    });
  };

  const moveMe = (event: GestureResponderEvent) => {
    if (!isGeneralRoom) return;
    const nextX = Math.max(9, Math.min(91, (event.nativeEvent.locationX / stageSize.width) * 100));
    const nextY = Math.max(12, Math.min(88, (event.nativeEvent.locationY / stageSize.height) * 100));
    setOwnPosition({ x: nextX, y: nextY });
  };

  const sayHello = async () => {
    if (!selectedMember || busyAction) return;
    setBusyAction("hello");
    try {
      if (mapApi) await mapApi.sayHello(selectedMember.id);
      setNotice(`Bonjour envoyé à ${firstName(selectedMember.name)} 👋`);
      setSelectedUserId(null);
    } catch (error) {
      AppAlert.alert("Bonjour non envoyé", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    } finally {
      setBusyAction(null);
    }
  };

  const createPrivateOffice = async () => {
    if (!selectedMember || busyAction) return;
    setBusyAction("office");
    try {
      const result = await createSpace({
        name: `Bureau de ${firstName(currentUser.name)}`,
        kind: "private",
        access: "invite",
        invitedUserIds: [selectedMember.id],
        activity: `Échange avec ${firstName(selectedMember.name)}`
      });
      setSelectedUserId(null);
      router.replace(`/coworking/${encodeURIComponent(result.spaceId)}`);
    } catch (error) {
      AppAlert.alert("Bureau indisponible", error instanceof Error ? error.message : "Réessayez dans quelques instants.");
    } finally {
      setBusyAction(null);
    }
  };

  if (!space || currentSpace?.id !== space.id) {
    return (
      <LinearGradient colors={theme.pageGradient} style={styles.screen}>
        <View style={[styles.missing, { paddingTop: insets.top + 20 }]}>
          <Ionicons name="people-circle-outline" size={42} color={theme.violet} />
          <Text style={[styles.missingTitle, { color: theme.pageText }]}>Cet espace n’est plus actif</Text>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/coworking")} style={[styles.backToMap, { backgroundColor: theme.violetSoft }]}>
            <Ionicons name="map-outline" size={19} color={theme.violet} />
            <Text style={[styles.backToMapText, { color: theme.pageText }]}>Retour à la Map</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}> 
      <LinearGradient colors={theme.pageGradient} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 9), borderBottomColor: theme.borderSoft, backgroundColor: theme.shellBackground }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour à la Map sans quitter" onPress={() => router.replace("/coworking")} style={[styles.headerButton, { backgroundColor: theme.surfaceStrong }]}>
          <Ionicons name="map-outline" size={21} color={theme.pageText} />
        </Pressable>
        <View style={styles.headerCopy}>
          <View style={styles.headerTitleLine}>
            <View style={[styles.liveDot, { backgroundColor: theme.success }]} />
            <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.pageText }]}>{isGeneralRoom ? "Salle générale" : space.name}</Text>
          </View>
          <Text style={[styles.headerMeta, { color: theme.pageTextMuted }]}>
            {isGeneralRoom ? `${participants.length} ici · rapproche-toi pour mieux entendre` : `${participants.length} participant${participants.length > 1 ? "s" : ""}`}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Quitter la salle" onPress={() => void leave()} style={[styles.headerButton, { backgroundColor: theme.dangerSoft }]}>
          <Ionicons name="exit-outline" size={21} color={theme.danger} />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole={isGeneralRoom ? "button" : undefined}
        accessibilityLabel={isGeneralRoom ? "Espace de déplacement de la Salle générale" : undefined}
        onPress={moveMe}
        onLayout={onStageLayout}
        style={[styles.stage, { borderColor: theme.borderSoft }]}
      >
        {isGeneralRoom ? (
          <View pointerEvents="none" style={styles.spatialBackdrop}>
            <View style={[styles.proximityAnchor, { left: `${ownPosition.x}%`, top: `${ownPosition.y}%` }]}>
              <View style={[styles.proximityCircle, styles.proximityNear, { borderColor: theme.success }]} />
              <View style={[styles.proximityCircle, styles.proximityFar, { borderColor: theme.borderSoft }]} />
            </View>
            <Text style={[styles.moveHint, { color: theme.pageTextMuted }]}>Touchez l’espace pour vous déplacer</Text>
          </View>
        ) : null}

        <View pointerEvents="none" style={styles.avatarLayer}>
          {participants.map((member) => {
            const position = participantLayout[member.id];
            if (!position) return null;
            const presence = participantPresence(snapshot, member.id);
            const isMe = member.id === currentUser.id;
            return (
              <View
                key={`fallback-${member.id}`}
                style={[
                  styles.personVisual,
                  {
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    width: nodeSize,
                    height: nodeSize,
                    marginLeft: -nodeSize / 2,
                    marginTop: -nodeSize / 2,
                    borderColor: presence?.speaking ? theme.success : isMe ? theme.violet : theme.borderSoft,
                    backgroundColor: theme.surfaceStrong,
                    borderRadius: Math.max(18, nodeSize * 0.28)
                  }
                ]}
              >
                <StatusAvatar user={member} size={Math.max(42, nodeSize - 20)} accessible={false} />
              </View>
            );
          })}
        </View>

        {media && !media.mock ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <CoworkingMediaSurface
              session={media}
              displayName={currentUser.name}
              cameraOn={cameraOn}
              microphoneOn={microphoneOn}
              spatialAudio={isGeneralRoom}
              participantLayout={isGeneralRoom ? participantLayout : undefined}
              onError={setMediaError}
            />
          </View>
        ) : null}

        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {participants.map((member) => {
            const position = participantLayout[member.id];
            if (!position) return null;
            const presence = participantPresence(snapshot, member.id);
            const isMe = member.id === currentUser.id;
            return (
              <Pressable
                key={member.id}
                accessibilityRole="button"
                accessibilityLabel={`${isMe ? "Moi" : member.name}${presence?.cameraOn ? ", caméra active" : ""}`}
                disabled={isMe}
                onPress={() => setSelectedUserId(member.id)}
                style={({ pressed }) => [
                  styles.personHit,
                  {
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    width: nodeSize + 18,
                    height: nodeHeight,
                    marginLeft: -(nodeSize + 18) / 2,
                    marginTop: -nodeSize / 2
                  },
                  pressed && styles.pressed
                ]}
              >
                <View style={styles.personNameRow}>
                  {presence?.speaking ? <View style={[styles.speakingDot, { backgroundColor: theme.success }]} /> : null}
                  <Text numberOfLines={1} style={[styles.personName, { color: theme.pageText }]}>{isMe ? "Moi" : firstName(member.name)}</Text>
                  {!presence?.microphoneOn ? <Ionicons name="mic-off" size={10} color={theme.pageTextMuted} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {mediaError ? (
          <View pointerEvents="none" style={[styles.mediaWarning, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
            <Ionicons name="alert-circle-outline" size={16} color={theme.danger} />
            <Text numberOfLines={2} style={[styles.mediaWarningText, { color: theme.pageText }]}>Connexion média réduite. La présence reste disponible.</Text>
          </View>
        ) : null}
      </Pressable>

      {selectedMember ? (
        <View style={[styles.memberSheet, { bottom: Math.max(insets.bottom, 10) + 78, backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <View style={styles.memberSheetTop}>
            <StatusAvatar user={selectedMember} size={46} accessible={false} />
            <View style={styles.memberSheetCopy}>
              <Text numberOfLines={1} style={[styles.memberSheetName, { color: theme.pageText }]}>{selectedMember.name}</Text>
              <Text numberOfLines={1} style={[styles.memberSheetMeta, { color: theme.pageTextMuted }]}>{selectedMember.company}{selectedMember.city ? ` · ${selectedMember.city}` : ""}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer la fiche" onPress={() => setSelectedUserId(null)} style={styles.closeSheet}>
              <Ionicons name="close" size={20} color={theme.pageTextMuted} />
            </Pressable>
          </View>
          <View style={styles.sheetActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Dire bonjour" disabled={Boolean(busyAction)} onPress={() => void sayHello()} style={[styles.sheetAction, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
              <Ionicons name="hand-left-outline" size={19} color={theme.violet} />
              <Text style={[styles.sheetActionText, { color: theme.pageText }]}>Bonjour</Text>
            </Pressable>
            {isGeneralRoom ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Inviter dans un bureau privé" disabled={Boolean(busyAction)} onPress={() => void createPrivateOffice()} style={[styles.sheetAction, { backgroundColor: theme.violet, borderColor: theme.violet }]}>
                {busyAction === "office" ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="enter-outline" size={19} color="#FFFFFF" />}
                <Text style={styles.sheetPrimaryText}>Bureau privé</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Proposer un rendez-vous" onPress={() => router.push({ pathname: "/schedule-call", params: { memberId: selectedMember.id, mode: "video" } })} style={[styles.sheetIconAction, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
              <Ionicons name="calendar-outline" size={20} color={theme.pageText} />
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: theme.shellBackground, borderTopColor: theme.borderSoft }]}>
        <Control icon={microphoneOn ? "mic" : "mic-off"} label={microphoneOn ? "Couper le micro" : "Activer le micro"} active={microphoneOn} onPress={() => setMicrophoneOn((value) => !value)} />
        <Control icon={cameraOn ? "videocam" : "videocam-off"} label={cameraOn ? "Couper la caméra" : "Activer la caméra"} active={cameraOn} onPress={() => setCameraOn((value) => !value)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Quitter la salle" onPress={() => void leave()} style={({ pressed }) => [styles.leaveControl, { backgroundColor: theme.danger }, pressed && styles.pressed]}>
          <Ionicons name="exit" size={24} color={colors.white} />
        </Pressable>
      </View>

      {notice ? (
        <View pointerEvents="none" style={[styles.notice, { bottom: Math.max(insets.bottom, 10) + 84, backgroundColor: theme.pageText }]}>
          <Text style={[styles.noticeText, { color: theme.pageBackground }]}>{notice}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Control({ icon, label, active, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.control,
        { backgroundColor: active ? theme.violetSoft : theme.surfaceStrong, borderColor: active ? theme.violet : theme.borderSoft },
        pressed && styles.pressed
      ]}
    >
      <Ionicons name={icon} size={22} color={active ? theme.violet : theme.pageTextMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 24 },
  missingTitle: { fontSize: 17, fontWeight: "900" },
  backToMap: { minHeight: 48, borderRadius: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  backToMapText: { fontSize: 12, fontWeight: "900" },
  header: { minHeight: 70, paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: 1, flexDirection: "row", alignItems: "flex-end", gap: 9 },
  headerButton: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, minWidth: 0, minHeight: 48, justifyContent: "center", alignItems: "center" },
  headerTitleLine: { maxWidth: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  headerTitle: { maxWidth: "82%", fontSize: 15, lineHeight: 19, fontWeight: "900" },
  headerMeta: { marginTop: 2, maxWidth: "100%", fontSize: 10, lineHeight: 13, fontWeight: "700", textAlign: "center" },
  stage: { flex: 1, margin: 8, borderRadius: 28, borderWidth: 1, overflow: "hidden", position: "relative", minHeight: 280 },
  spatialBackdrop: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  proximityAnchor: { position: "absolute", width: 0, height: 0 },
  proximityCircle: { position: "absolute", borderWidth: 1, opacity: 0.18 },
  proximityNear: { width: 260, height: 260, borderRadius: 130, left: -130, top: -130 },
  proximityFar: { width: 420, height: 420, borderRadius: 210, left: -210, top: -210 },
  moveHint: { position: "absolute", top: 12, left: 14, right: 14, textAlign: "center", fontSize: 10, fontWeight: "800" },
  avatarLayer: { ...StyleSheet.absoluteFillObject },
  personVisual: { position: "absolute", borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  personHit: { position: "absolute", alignItems: "center", justifyContent: "flex-end", paddingBottom: 2 },
  personNameRow: { minHeight: 24, maxWidth: "100%", borderRadius: 12, paddingHorizontal: 7, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "rgba(2,10,26,0.78)" },
  personName: { maxWidth: 72, fontSize: 10, lineHeight: 13, fontWeight: "900" },
  speakingDot: { width: 7, height: 7, borderRadius: 4 },
  mediaWarning: { position: "absolute", left: 12, right: 12, bottom: 12, minHeight: 42, borderRadius: 15, borderWidth: 1, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  mediaWarningText: { flex: 1, fontSize: 10, lineHeight: 14, fontWeight: "800" },
  memberSheet: { position: "absolute", left: 10, right: 10, borderRadius: 22, borderWidth: 1, padding: 10, gap: 9, elevation: 16, shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 16, shadowOffset: { width: 0, height: 7 } },
  memberSheetTop: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8 },
  memberSheetCopy: { flex: 1, minWidth: 0 },
  memberSheetName: { fontSize: 13, lineHeight: 17, fontWeight: "900" },
  memberSheetMeta: { marginTop: 2, fontSize: 10, lineHeight: 13, fontWeight: "700" },
  closeSheet: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  sheetActions: { minHeight: 50, flexDirection: "row", gap: 7 },
  sheetAction: { flex: 1, minWidth: 0, minHeight: 50, borderRadius: 17, borderWidth: 1, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  sheetActionText: { fontSize: 10, fontWeight: "900" },
  sheetPrimaryText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  sheetIconAction: { width: 50, height: 50, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  controls: { minHeight: 72, paddingTop: 8, paddingHorizontal: 12, borderTopWidth: 1, flexDirection: "row", alignItems: "flex-start", justifyContent: "center", gap: 12 },
  control: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  leaveControl: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  notice: { position: "absolute", left: 28, right: 28, minHeight: 44, borderRadius: 16, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", elevation: 18 },
  noticeText: { textAlign: "center", fontSize: 11, fontWeight: "900" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.97 }] }
});
