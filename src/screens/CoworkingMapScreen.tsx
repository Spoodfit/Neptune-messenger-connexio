import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CoworkingMediaSurface from "../components/CoworkingMediaSurface";
import { StatusAvatar } from "../components/StatusAvatar";
import { useCoworking } from "../providers/CoworkingProvider";
import { useExperience } from "../providers/ExperienceProvider";
import { useMessaging } from "../providers/MessagingProvider";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { gradients } from "../theme";
import type {
  CoworkingParticipantPresence,
  CoworkingPresenceMode,
  CoworkingSpace
} from "../types/coworking";

const FALLBACK_POSITIONS = [
  [18, 23],
  [42, 19],
  [70, 26],
  [84, 48],
  [27, 55],
  [58, 61],
  [77, 77],
  [36, 82],
  [62, 41],
  [15, 72],
  [88, 20]
] as const;

const PRESENCE_META: Record<
  CoworkingPresenceMode,
  { label: string; icon: keyof typeof Ionicons.glyphMap; tone: string }
> = {
  available: {
    label: "Disponible",
    icon: "chatbubble-ellipses-outline",
    tone: "#36D48A"
  },
  focus: { label: "Focus", icon: "headset-outline", tone: "#8D7BFF" },
  break: { label: "En pause", icon: "cafe-outline", tone: "#F2A64B" },
  talk: { label: "En échange", icon: "people-outline", tone: "#50B5FF" }
};

function spaceForParticipant(
  userId: string,
  hub: CoworkingSpace,
  spaces: CoworkingSpace[]
): CoworkingSpace | undefined {
  if (hub.participantIds.includes(userId)) return hub;
  return spaces.find((space) => space.participantIds.includes(userId));
}

export default function CoworkingMapScreen() {
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const theme = useAppTheme();
  const { currentUser } = useSession();
  const { members, localConversations } = useExperience();
  const { visibleConversations } = useMessaging();
  const {
    serviceAvailable,
    snapshot,
    activeCount,
    currentSpace,
    loading,
    error,
    refresh,
    joinSpace,
    leaveCurrentSpace,
    updatePresence,
    mediaForSpace
  } = useCoworking();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const participants = useMemo(
    () => snapshot.participants.filter((participant) => participant.userId !== currentUser.id),
    [currentUser.id, snapshot.participants]
  );
  const currentPresence = snapshot.participants.find(
    (participant) => participant.userId === currentUser.id
  );
  const selectedPresence = participants.find(
    (participant) => participant.userId === selectedUserId
  );
  const selectedMember = members.find((member) => member.id === selectedUserId);
  const selectedSpace = selectedUserId
    ? spaceForParticipant(selectedUserId, snapshot.hub, snapshot.spaces)
    : undefined;
  const mediaSession =
    snapshot.observerMedia ?? (currentSpace ? mediaForSpace(currentSpace.id) : undefined);

  const participantLayout = useMemo(
    () =>
      Object.fromEntries(
        participants.map((participant, index) => {
          const fallback = FALLBACK_POSITIONS[index % FALLBACK_POSITIONS.length] ?? [50, 50];
          const width = participant.cameraOn ? 112 : 76;
          const height = participant.cameraOn ? 122 : 76;
          const hitWidth = width + 20;
          const horizontalInset = hitWidth / 2 + 4;
          const minimumX = Math.min(50, (horizontalInset / Math.max(viewportWidth, 1)) * 100);
          const maximumX = 100 - minimumX;
          const rawX = participant.mapX ?? fallback[0];
          const x = Math.max(minimumX, Math.min(maximumX, rawX));
          const y = participant.mapY ?? fallback[1];
          return [participant.userId, { x, y, width, height }];
        })
      ),
    [participants, viewportWidth]
  );

  const directConversationFor = (userId: string) =>
    [...visibleConversations, ...localConversations].find((conversation) => {
      if (conversation.type !== "direct") return false;
      const memberIds = conversation.memberIds ?? [];
      return memberIds.includes(userId) && memberIds.includes(currentUser.id);
    });

  const sayHello = () => {
    if (!selectedMember) return;
    const conversation = directConversationFor(selectedMember.id);
    setSelectedUserId(null);
    if (conversation) {
      router.push({
        pathname: "/chat/[id]",
        params: { id: conversation.id, draft: "Bonjour 👋" }
      });
      return;
    }
    router.push({
      pathname: "/new-conversation",
      params: { memberId: selectedMember.id, prefill: "Bonjour 👋" }
    });
  };

  const joinHub = async () => {
    if (joining) return;
    setJoining(true);
    try {
      await joinSpace(snapshot.hub.id);
    } finally {
      setJoining(false);
    }
  };

  const joinSelected = async () => {
    if (!selectedSpace || joining) return;
    setJoining(true);
    try {
      if (currentSpace?.id !== selectedSpace.id) {
        await joinSpace(selectedSpace.id);
      }
      setSelectedUserId(null);
      router.push(`/coworking/${encodeURIComponent(selectedSpace.id)}`);
    } finally {
      setJoining(false);
    }
  };

  if (!serviceAvailable) {
    return (
      <View style={[styles.unavailable, { backgroundColor: theme.pageBackground }]}>
        <Ionicons name="people-circle-outline" size={42} color={theme.violet} />
        <Text style={[styles.unavailableTitle, { color: theme.pageText }]}>Coworking indisponible</Text>
        <Text style={[styles.unavailableText, { color: theme.pageTextMuted }]}>
          L’espace réapparaîtra dès que le service temps réel sera activé.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[styles.backAction, { backgroundColor: theme.surfaceStrong }]}
        >
          <Text style={{ color: theme.pageText, fontWeight: "900" }}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.pageBackground }]}>
      <LinearGradient colors={theme.pageGradient} style={StyleSheet.absoluteFill} />

      <View pointerEvents="none" style={styles.officeBackdrop}>
        <View style={[styles.zone, styles.zoneQuiet, { borderColor: theme.borderSoft }]}>
          <Text style={[styles.zoneLabel, { color: theme.pageTextMuted }]}>FOCUS</Text>
        </View>
        <View style={[styles.zone, styles.zoneOpen, { borderColor: theme.borderSoft }]}>
          <Text style={[styles.zoneLabel, { color: theme.pageTextMuted }]}>ESPACE OUVERT</Text>
        </View>
        <View style={[styles.zone, styles.zoneBreak, { borderColor: theme.borderSoft }]}>
          <Text style={[styles.zoneLabel, { color: theme.pageTextMuted }]}>PAUSE</Text>
        </View>
        {Array.from({ length: 7 }).map((_, index) => (
          <View
            key={`v-${index}`}
            style={[
              styles.gridLineVertical,
              { left: `${12 + index * 13}%`, backgroundColor: theme.borderSoft }
            ]}
          />
        ))}
        {Array.from({ length: 6 }).map((_, index) => (
          <View
            key={`h-${index}`}
            style={[
              styles.gridLineHorizontal,
              { top: `${14 + index * 15}%`, backgroundColor: theme.borderSoft }
            ]}
          />
        ))}
      </View>

      <View pointerEvents="none" style={styles.avatarLayer}>
        {participants.map((participant) => {
          const member = members.find((candidate) => candidate.id === participant.userId);
          const position = participantLayout[participant.userId];
          if (!member || !position) return null;
          return (
            <View
              key={`fallback-${participant.userId}`}
              style={[
                styles.fallbackNode,
                {
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  width: position.width,
                  height: position.height,
                  marginLeft: -position.width / 2,
                  marginTop: -position.height / 2,
                  borderColor: theme.borderSoft,
                  backgroundColor: theme.surfaceStrong
                }
              ]}
            >
              <StatusAvatar
                user={member}
                size={participant.cameraOn ? 62 : 52}
                accessible={false}
              />
            </View>
          );
        })}
      </View>

      {mediaSession ? (
        <View pointerEvents="none" style={styles.mediaLayer}>
          <CoworkingMediaSurface
            session={mediaSession}
            displayName={currentUser.name}
            cameraOn={currentPresence?.cameraOn ?? false}
            microphoneOn={currentPresence?.microphoneOn ?? false}
            mapMode
            participantLayout={participantLayout}
            onError={setMediaError}
          />
        </View>
      ) : null}

      <View pointerEvents="box-none" style={styles.interactionLayer}>
        {participants.map((participant) => {
          const member = members.find((candidate) => candidate.id === participant.userId);
          const position = participantLayout[participant.userId];
          if (!member || !position) return null;
          const meta = PRESENCE_META[participant.mode];
          return (
            <Pressable
              key={participant.userId}
              accessibilityRole="button"
              accessibilityLabel={`${member.name}, ${meta.label}${participant.cameraOn ? ", caméra active" : ""}`}
              onPress={() => setSelectedUserId(participant.userId)}
              style={({ pressed }) => [
                styles.personHit,
                {
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  width: position.width + 20,
                  height: position.height + 38,
                  marginLeft: -(position.width + 20) / 2,
                  marginTop: -(position.height + 38) / 2
                },
                pressed && styles.personPressed
              ]}
            >
              <View
                style={[
                  styles.personFrame,
                  {
                    width: position.width,
                    height: position.height,
                    borderColor: participant.speaking
                      ? meta.tone
                      : participant.cameraOn
                        ? theme.violet
                        : theme.borderSoft
                  }
                ]}
              />
              <View
                style={[
                  styles.personStatus,
                  { backgroundColor: theme.surface, borderColor: meta.tone }
                ]}
              >
                <View style={[styles.statusDot, { backgroundColor: meta.tone }]} />
                <Text style={[styles.statusText, { color: theme.pageText }]}>{meta.label}</Text>
                {participant.cameraOn ? (
                  <Ionicons name="videocam" size={11} color={theme.violet} />
                ) : null}
              </View>
              <Text numberOfLines={1} style={[styles.personName, { color: theme.pageText }]}>
                {member.name.split(" ")[0]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, 10),
            paddingLeft: Math.max(insets.left, 10),
            paddingRight: Math.max(insets.right, 10)
          }
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer le coworking"
          onPress={() => router.back()}
          style={[
            styles.circleButton,
            { backgroundColor: theme.surface, borderColor: theme.borderSoft }
          ]}
        >
          <Ionicons name="close" size={22} color={theme.pageText} />
        </Pressable>
        <View
          style={[
            styles.liveTitle,
            { backgroundColor: theme.surface, borderColor: theme.borderSoft }
          ]}
        >
          <View style={styles.liveDot} />
          <View>
            <Text style={[styles.title, { color: theme.pageText }]}>Coworking</Text>
            <Text style={[styles.subtitle, { color: theme.pageTextMuted }]}>
              {loading ? "Connexion…" : `${activeCount} présent${activeCount > 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualiser la map"
          onPress={() => void refresh()}
          style={[
            styles.circleButton,
            { backgroundColor: theme.surface, borderColor: theme.borderSoft }
          ]}
        >
          <Ionicons name="refresh" size={20} color={theme.pageText} />
        </Pressable>
      </View>

      {currentSpace ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.presenceRail, { top: Math.max(insets.top, 10) + 62 }]}
          contentContainerStyle={styles.presenceRailContent}
        >
          {(["available", "focus", "break", "talk"] as CoworkingPresenceMode[]).map(
            (mode) => {
              const meta = PRESENCE_META[mode];
              const active = currentPresence?.mode === mode;
              return (
                <Pressable
                  key={mode}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => void updatePresence(mode)}
                  style={[
                    styles.presenceChip,
                    {
                      backgroundColor: active ? meta.tone : theme.surface,
                      borderColor: active ? meta.tone : theme.borderSoft
                    }
                  ]}
                >
                  <Ionicons
                    name={meta.icon}
                    size={14}
                    color={active ? "#FFFFFF" : meta.tone}
                  />
                  <Text
                    style={[
                      styles.presenceChipText,
                      { color: active ? "#FFFFFF" : theme.pageText }
                    ]}
                  >
                    {meta.label}
                  </Text>
                </Pressable>
              );
            }
          )}
        </ScrollView>
      ) : null}

      {!currentSpace ? (
        <View
          style={[
            styles.joinDock,
            {
              bottom: Math.max(insets.bottom, 12),
              backgroundColor: theme.surface,
              borderColor: theme.borderSoft
            }
          ]}
        >
          <View style={styles.joinCopy}>
            <Text style={[styles.joinTitle, { color: theme.pageText }]}>Le bureau est ouvert</Text>
            <Text style={[styles.joinText, { color: theme.pageTextMuted }]}>
              Entre sans rendez-vous. Micro coupé par défaut.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rejoindre le coworking"
            onPress={() => void joinHub()}
            disabled={joining}
            style={styles.joinButton}
          >
            <LinearGradient colors={gradients.primary} style={styles.joinGradient}>
              <Ionicons name="enter-outline" size={19} color="#FFFFFF" />
              <Text style={styles.joinButtonText}>{joining ? "Connexion…" : "J’entre"}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitter le coworking"
          onPress={() => void leaveCurrentSpace()}
          style={[
            styles.leaveButton,
            {
              bottom: Math.max(insets.bottom, 14),
              backgroundColor: theme.surface,
              borderColor: theme.danger
            }
          ]}
        >
          <Ionicons name="exit-outline" size={18} color={theme.danger} />
        </Pressable>
      )}

      {error || mediaError ? (
        <View
          style={[
            styles.errorPill,
            {
              top: Math.max(insets.top, 10) + (currentSpace ? 112 : 64),
              backgroundColor: theme.dangerSoft
            }
          ]}
        >
          <Text style={[styles.errorText, { color: theme.danger }]}>{mediaError ?? error}</Text>
        </View>
      ) : null}

      {selectedMember && selectedPresence ? (
        <Pressable style={styles.sheetBackdrop} onPress={() => setSelectedUserId(null)}>
          <Pressable
            onPress={() => undefined}
            style={[
              styles.personSheet,
              {
                paddingBottom: Math.max(insets.bottom, 14),
                backgroundColor: theme.surface,
                borderColor: theme.borderSoft
              }
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetMember}>
              <StatusAvatar user={selectedMember} size={52} accessible={false} />
              <View style={styles.sheetCopy}>
                <Text style={[styles.sheetName, { color: theme.pageText }]}>{selectedMember.name}</Text>
                <Text
                  style={[styles.sheetCompany, { color: theme.pageTextMuted }]}
                  numberOfLines={1}
                >
                  {selectedMember.company}
                </Text>
                <View style={styles.sheetPresence}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: PRESENCE_META[selectedPresence.mode].tone }
                    ]}
                  />
                  <Text style={[styles.sheetPresenceText, { color: theme.pageTextSecondary }]}>
                    {selectedPresence.statusText || PRESENCE_META[selectedPresence.mode].label}
                    {selectedPresence.cameraOn ? " · en visio" : ""}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sheetActions}>
              <Pressable
                accessibilityRole="button"
                onPress={sayHello}
                style={[styles.sheetAction, { backgroundColor: theme.violetSoft }]}
              >
                <Ionicons name="hand-left-outline" size={20} color={theme.violet} />
                <Text style={[styles.sheetActionText, { color: theme.pageText }]}>Dire bonjour</Text>
              </Pressable>
              {selectedSpace ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void joinSelected()}
                  disabled={joining}
                  style={[styles.sheetAction, { backgroundColor: theme.surfaceStrong }]}
                >
                  <Ionicons name="people-outline" size={20} color={theme.violet} />
                  <Text style={[styles.sheetActionText, { color: theme.pageText }]}>
                    {currentSpace?.id === selectedSpace.id ? "Ouvrir l’espace" : "Les rejoindre"}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  const id = selectedMember.id;
                  setSelectedUserId(null);
                  router.push(`/profile/${encodeURIComponent(id)}`);
                }}
                style={[styles.sheetAction, { backgroundColor: theme.surfaceStrong }]}
              >
                <Ionicons name="person-outline" size={20} color={theme.pageTextMuted} />
                <Text style={[styles.sheetActionText, { color: theme.pageText }]}>Profil</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
  unavailable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 10
  },
  unavailableTitle: { fontSize: 20, fontWeight: "900" },
  unavailableText: { maxWidth: 360, textAlign: "center", fontSize: 13, lineHeight: 18 },
  backAction: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8
  },
  officeBackdrop: { ...StyleSheet.absoluteFillObject },
  zone: {
    position: "absolute",
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 28,
    opacity: 0.72
  },
  zoneQuiet: { left: "5%", top: "12%", width: "43%", height: "38%" },
  zoneOpen: { right: "4%", top: "13%", width: "43%", height: "56%" },
  zoneBreak: { left: "8%", bottom: "7%", width: "42%", height: "34%" },
  zoneLabel: {
    position: "absolute",
    top: 10,
    left: 12,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2
  },
  gridLineVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    opacity: 0.16
  },
  gridLineHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    opacity: 0.16
  },
  avatarLayer: { ...StyleSheet.absoluteFillObject },
  mediaLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
  interactionLayer: { ...StyleSheet.absoluteFillObject },
  fallbackNode: {
    position: "absolute",
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  personHit: { position: "absolute", alignItems: "center", justifyContent: "center" },
  personPressed: { opacity: 0.76 },
  personFrame: { borderRadius: 22, borderWidth: 2, backgroundColor: "transparent" },
  personStatus: {
    position: "absolute",
    bottom: 9,
    minHeight: 24,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: "900" },
  personName: {
    position: "absolute",
    bottom: -7,
    maxWidth: 104,
    fontSize: 10,
    fontWeight: "900"
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  circleButton: {
    width: 48,
    height: 48,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  liveTitle: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#36D48A" },
  title: { fontSize: 14, fontWeight: "900" },
  subtitle: { fontSize: 10, fontWeight: "700", marginTop: 1 },
  presenceRail: { position: "absolute", left: 0, right: 0, maxHeight: 54 },
  presenceRailContent: { paddingHorizontal: 10, gap: 7 },
  presenceChip: {
    minHeight: 48,
    paddingHorizontal: 11,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  presenceChipText: { fontSize: 10, fontWeight: "900" },
  joinDock: {
    position: "absolute",
    left: 10,
    right: 10,
    minHeight: 72,
    borderRadius: 22,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  joinCopy: { flex: 1, minWidth: 0 },
  joinTitle: { fontSize: 13, fontWeight: "900" },
  joinText: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  joinButton: { minWidth: 104, height: 48, borderRadius: 16, overflow: "hidden" },
  joinGradient: {
    flex: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7
  },
  joinButtonText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  leaveButton: {
    position: "absolute",
    right: 14,
    width: 48,
    height: 48,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  errorPill: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "88%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14
  },
  errorText: { fontSize: 10, lineHeight: 14, fontWeight: "800", textAlign: "center" },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "flex-end"
  },
  personSheet: {
    width: "100%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 14,
    gap: 13
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(150,160,180,0.48)",
    alignSelf: "center"
  },
  sheetMember: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 11 },
  sheetCopy: { flex: 1, minWidth: 0 },
  sheetName: { fontSize: 16, fontWeight: "900" },
  sheetCompany: { fontSize: 11, marginTop: 2 },
  sheetPresence: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  sheetPresenceText: { fontSize: 11, fontWeight: "700" },
  sheetActions: { flexDirection: "row", gap: 8 },
  sheetAction: {
    flex: 1,
    minHeight: 56,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  sheetActionText: { fontSize: 10, fontWeight: "900", textAlign: "center" }
});
