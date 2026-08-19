import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import { StatusAvatar } from "@/components/StatusAvatar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  canJoinCoworkingSpace,
  orderedCoworkingSpaces,
  participantPresence,
  roomOccupancyLabel
} from "@/domain/coworking";
import { useCoworking } from "@/providers/CoworkingProvider";
import { useExperience } from "@/providers/ExperienceProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { AppAlert } from "@/services/ui/AppAlert";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import type { AppUser } from "@/types/messaging";
import type { CoworkingPresenceMode, CoworkingSpace, CoworkingSpaceKind } from "@/types/coworking";

const HUB_POSITIONS = [
  { left: "5%", top: "16%" },
  { left: "68%", top: "12%" },
  { left: "5%", top: "56%" },
  { left: "68%", top: "55%" },
  { left: "26%", top: "3%" },
  { left: "48%", top: "70%" },
  { left: "80%", top: "31%" },
  { left: "16%", top: "72%" }
] as const;

const PRESENCE_META: Record<CoworkingPresenceMode, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  focus: { icon: "radio-button-on", label: "Focus" },
  available: { icon: "sparkles", label: "Disponible" },
  talk: { icon: "chatbubbles", label: "Disponible pour échanger" },
  break: { icon: "cafe", label: "Pause" }
};

function userForId(members: AppUser[], currentUser: AppUser, id: string): AppUser | undefined {
  return id === currentUser.id ? currentUser : members.find((member) => member.id === id);
}

export default function CoworkingScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { currentUser } = useSession();
  const { members } = useExperience();
  const {
    serviceAvailable,
    snapshot,
    activeCount,
    currentSpace,
    loading,
    error,
    joinSpace,
    createSpace,
    updatePresence,
    leaveCurrentSpace
  } = useCoworking();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<AppUser | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomKind, setRoomKind] = useState<Exclude<CoworkingSpaceKind, "hub">>("open");
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const hubUsers = useMemo(
    () => snapshot.hub.participantIds
      .map((id) => userForId(members, currentUser, id))
      .filter((user): user is AppUser => Boolean(user)),
    [currentUser, members, snapshot.hub.participantIds]
  );
  const visibleHubUsers = useMemo(
    () => hubUsers.slice(0, width < 340 ? 4 : width < 430 ? 6 : HUB_POSITIONS.length),
    [hubUsers, width]
  );
  const orbitOuterSize = Math.min(310, Math.max(240, width - 24));
  const spaces = useMemo(() => orderedCoworkingSpaces(snapshot.spaces), [snapshot.spaces]);
  const inviteCandidates = useMemo(
    () => members.filter((member) => member.id !== currentUser.id).slice(0, 18),
    [currentUser.id, members]
  );

  const openSpace = async (space: CoworkingSpace) => {
    if (!canJoinCoworkingSpace(space, currentUser.id)) return;
    setJoiningId(space.id);
    try {
      await joinSpace(space.id);
      router.push({ pathname: "/coworking/[spaceId]", params: { spaceId: space.id } });
    } catch (joinError) {
      AppAlert.alert("Coworking indisponible", joinError instanceof Error ? joinError.message : "Impossible de rejoindre cet espace.");
    } finally {
      setJoiningId(null);
    }
  };

  const openHub = async () => {
    setJoiningId(snapshot.hub.id);
    try {
      await joinSpace(snapshot.hub.id);
      router.push({ pathname: "/coworking/[spaceId]", params: { spaceId: snapshot.hub.id } });
    } catch (joinError) {
      AppAlert.alert("Coworking indisponible", joinError instanceof Error ? joinError.message : "Impossible d’entrer dans le Hub.");
    } finally {
      setJoiningId(null);
    }
  };

  const createBubbleWith = async (member: AppUser) => {
    setSelectedMember(null);
    setCreating(true);
    try {
      const result = await createSpace({
        name: `Avec ${member.name.split(/\s+/)[0] ?? member.name}`,
        kind: "private",
        access: "invite",
        invitedUserIds: [member.id],
        activity: "Travailler ensemble"
      });
      router.push({ pathname: "/coworking/[spaceId]", params: { spaceId: result.spaceId } });
    } catch (createError) {
      AppAlert.alert("Création impossible", createError instanceof Error ? createError.message : "L’espace privé n’a pas pu être créé.");
    } finally {
      setCreating(false);
    }
  };

  const submitCreate = async () => {
    if (creating) return;
    const name = roomName.trim() || (roomKind === "focus" ? "Session Focus" : roomKind === "private" ? "Espace privé" : "Espace ouvert");
    setCreating(true);
    try {
      const result = await createSpace({
        name,
        kind: roomKind,
        access: roomKind === "private" ? "invite" : "open",
        invitedUserIds: roomKind === "private" ? selectedInviteIds : undefined,
        activity: roomKind === "focus" ? "50 min de concentration" : undefined,
        focusMinutes: roomKind === "focus" ? 50 : undefined
      });
      setCreateOpen(false);
      setRoomName("");
      setSelectedInviteIds([]);
      router.push({ pathname: "/coworking/[spaceId]", params: { spaceId: result.spaceId } });
    } catch (createError) {
      AppAlert.alert("Création impossible", createError instanceof Error ? createError.message : "L’espace n’a pas pu être créé.");
    } finally {
      setCreating(false);
    }
  };

  const toggleInvite = (id: string) => {
    setSelectedInviteIds((previous) => previous.includes(id)
      ? previous.filter((value) => value !== id)
      : previous.length >= 5 ? previous : [...previous, id]);
  };

  if (!serviceAvailable) {
    return (
      <LinearGradient colors={theme.pageGradient} style={styles.screen}>
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 10), borderBottomColor: theme.borderSoft }]}>
          <Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={styles.topButton}><Ionicons name="chevron-back" size={24} color={theme.pageText} /></Pressable>
          <Text style={[styles.topTitle, { color: theme.pageText }]}>Coworking</Text>
          <View style={styles.topButton} />
        </View>
        <View style={styles.unavailable}>
          <LinearGradient colors={theme.isLight ? [theme.surface, theme.surfaceStrong] : gradients.glass} style={[styles.unavailableCard, { borderColor: theme.borderSoft }]}>
            <Ionicons name="people-circle-outline" size={44} color={theme.violet} />
            <Text style={[styles.unavailableTitle, { color: theme.pageText }]}>Coworking protégé</Text>
            <Text style={[styles.unavailableText, { color: theme.pageTextMuted }]}>L’espace sera activé avec le backend temps réel Connexio.</Text>
          </LinearGradient>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8), borderBottomColor: theme.borderSoft }]}>
        <Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={styles.topButton}><Ionicons name="chevron-back" size={24} color={theme.pageText} /></Pressable>
        <View style={styles.titleBlock}>
          <Text style={[styles.topTitle, { color: theme.pageText }]}>Coworking</Text>
          <View style={styles.liveLine}><View style={styles.liveDot} /><Text style={[styles.liveText, { color: theme.pageTextMuted }]}>{activeCount} présent{activeCount > 1 ? "s" : ""}</Text></View>
        </View>
        <Pressable accessibilityLabel="Créer un espace" onPress={() => setCreateOpen(true)} style={[styles.topButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="layers-outline" size={22} color={theme.violet} /></Pressable>
      </View>

      {loading && activeCount === 0 ? <View style={styles.loading}><ActivityIndicator size="large" color={theme.violet} /></View> : (
        <View style={styles.body}>
          <View style={[styles.hubStage, { minHeight: width <= 390 ? 300 : 340 }]}>
            <View pointerEvents="none" style={[styles.orbitOuter, { width: orbitOuterSize, height: orbitOuterSize, borderRadius: orbitOuterSize / 2, marginLeft: -orbitOuterSize / 2, marginTop: -orbitOuterSize / 2, borderColor: theme.borderSoft }]} />
            <View pointerEvents="none" style={[styles.orbitInner, { borderColor: theme.violetSoft }]} />
            <LinearGradient colors={theme.isLight ? [theme.accentSoft, theme.violetSoft] : ["rgba(0,72,186,0.34)", "rgba(107,79,234,0.25)"]} style={[styles.hubCore, { borderColor: theme.borderSoft }]}>
              <Ionicons name="people-circle" size={31} color={theme.violet} />
              <Text style={[styles.hubTitle, { color: theme.pageText }]}>Hub Neptune</Text>
              <Text style={[styles.hubCount, { color: theme.pageTextMuted }]}>{snapshot.hub.participantIds.length} ici</Text>
            </LinearGradient>

            {visibleHubUsers.map((user, index) => {
              const presence = participantPresence(snapshot, user.id);
              const meta = PRESENCE_META[presence?.mode ?? "available"];
              return (
                <Pressable
                  key={user.id}
                  accessibilityLabel={`${user.name}, ${meta.label}`}
                  onPress={() => user.id !== currentUser.id && setSelectedMember(user)}
                  style={[styles.personBubble, HUB_POSITIONS[index], presence?.speaking && styles.personSpeaking]}
                >
                  <View style={[styles.personAvatarShell, { backgroundColor: theme.pageBackground, borderColor: presence?.speaking ? theme.success : theme.borderSoft }]}>
                    <StatusAvatar user={user} size={52} ringWidth={2} accessible={false} />
                    {presence?.cameraOn ? <View style={[styles.cameraBadge, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="videocam" size={10} color={theme.success} /></View> : null}
                  </View>
                  <Text numberOfLines={1} style={[styles.personName, { color: theme.pageText }]}>{user.id === currentUser.id ? "Moi" : user.name.split(/\s+/)[0]}</Text>
                  <View style={[styles.presenceChip, { backgroundColor: theme.surface }]}><Ionicons name={meta.icon} size={10} color={presence?.mode === "focus" ? theme.violet : presence?.mode === "break" ? theme.warning : theme.success} /><Text numberOfLines={1} style={[styles.presenceText, { color: theme.pageTextMuted }]}>{meta.label}</Text></View>
                </Pressable>
              );
            })}

            {hubUsers.length === 0 ? (
              <View style={styles.emptyHub} pointerEvents="none">
                <Text style={[styles.emptyHubTitle, { color: theme.pageText }]}>Le Hub est calme</Text>
                <Text style={[styles.emptyHubText, { color: theme.pageTextMuted }]}>Entrez, les prochains membres vous verront ici.</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.roomSection}>
            <View style={styles.roomHeadingRow}>
              <Text style={[styles.roomHeading, { color: theme.pageText }]}>Espaces en cours</Text>
              <Text style={[styles.roomMeta, { color: theme.pageTextMuted }]}>{spaces.length}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomScroller}>
              {spaces.map((space) => (
                <RoomCard key={space.id} space={space} members={members} currentUser={currentUser} joining={joiningId === space.id} onPress={() => void openSpace(space)} />
              ))}
              <Pressable accessibilityLabel="Créer un espace" onPress={() => setCreateOpen(true)} style={[styles.createCard, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
                <Ionicons name="add-circle-outline" size={28} color={theme.violet} />
                <Text style={[styles.createCardText, { color: theme.pageText }]}>Créer</Text>
              </Pressable>
            </ScrollView>
          </View>

          <View style={[styles.threshold, { paddingBottom: Math.max(insets.bottom, 10), borderTopColor: theme.borderSoft, backgroundColor: theme.shellBackground }]}>
            {currentSpace ? (
              <>
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/coworking/[spaceId]", params: { spaceId: currentSpace.id } })} style={[styles.currentSpace, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}>
                  <View style={[styles.currentSpaceIcon, { backgroundColor: theme.violetSoft }]}><Ionicons name={currentSpace.id === "hub" ? "people" : "videocam"} size={21} color={theme.violet} /></View>
                  <View style={styles.currentSpaceCopy}><Text numberOfLines={1} style={[styles.currentSpaceTitle, { color: theme.pageText }]}>{currentSpace.name}</Text><Text style={[styles.currentSpaceSub, { color: theme.pageTextMuted }]}>Touchez pour revenir</Text></View>
                  <Ionicons name="chevron-forward" size={20} color={theme.pageTextMuted} />
                </Pressable>
                <View style={styles.presenceModes}>
                  {(Object.keys(PRESENCE_META) as CoworkingPresenceMode[]).map((mode) => {
                    const ownPresence = participantPresence(snapshot, currentUser.id);
                    const active = ownPresence?.mode === mode;
                    const meta = PRESENCE_META[mode];
                    return <Pressable key={mode} accessibilityLabel={meta.label} accessibilityState={{ selected: active }} onPress={() => void updatePresence(mode)} style={[styles.modeButton, { backgroundColor: active ? theme.violetSoft : theme.surface }]}><Ionicons name={meta.icon} size={18} color={active ? theme.violet : theme.pageTextMuted} /></Pressable>;
                  })}
                  <Pressable accessibilityLabel="Quitter le Coworking" onPress={() => void leaveCurrentSpace()} style={[styles.modeButton, { backgroundColor: theme.dangerSoft }]}><Ionicons name="exit-outline" size={19} color={theme.danger} /></Pressable>
                </View>
              </>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="Entrer dans le Hub Neptune" disabled={Boolean(joiningId)} onPress={() => void openHub()} style={({ pressed }) => [styles.enterPressable, pressed && styles.pressed]}>
                <LinearGradient colors={gradients.primaryWarm} style={styles.enterGradient}>
                  <View style={styles.enterAvatars}>
                    {hubUsers.slice(0, 3).map((member, index) => <View key={member.id} style={index > 0 ? styles.enterAvatarOverlap : undefined}><StatusAvatar user={member} size={27} ringWidth={1.5} accessible={false} /></View>)}
                    {hubUsers.length === 0 ? <Ionicons name="videocam" size={23} color={colors.white} /> : null}
                  </View>
                  <View style={styles.enterCopy}><Text style={styles.enterTitle}>{joiningId === snapshot.hub.id ? "Entrée…" : "Entrer dans le Hub"}</Text><Text style={styles.enterSub}>Micro coupé au départ</Text></View>
                  {joiningId === snapshot.hub.id ? <ActivityIndicator color={colors.white} /> : <Ionicons name="arrow-forward" size={22} color={colors.white} />}
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {error ? <View pointerEvents="none" style={[styles.errorToast, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}><Ionicons name="alert-circle" size={17} color={theme.danger} /><Text numberOfLines={2} style={[styles.errorText, { color: theme.pageText }]}>{error}</Text></View> : null}

      <Modal transparent animationType="fade" visible={Boolean(selectedMember)} onRequestClose={() => setSelectedMember(null)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]} onPress={() => setSelectedMember(null)}>
          <Pressable style={[styles.memberSheet, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]} onPress={() => undefined}>
            {selectedMember ? <StatusAvatar user={selectedMember} size={72} showBadge /> : null}
            <Text style={[styles.memberName, { color: theme.pageText }]}>{selectedMember?.name}</Text>
            <Text style={[styles.memberCompany, { color: theme.pageTextMuted }]}>{selectedMember?.company}</Text>
            <Pressable disabled={creating} onPress={() => selectedMember && void createBubbleWith(selectedMember)} style={({ pressed }) => [styles.memberAction, { backgroundColor: theme.violetSoft }, pressed && styles.pressed]}><Ionicons name="videocam" size={21} color={theme.violet} /><Text style={[styles.memberActionText, { color: theme.pageText }]}>{creating ? "Création…" : "Travailler ensemble"}</Text><Ionicons name="arrow-forward" size={18} color={theme.pageTextMuted} /></Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent animationType="slide" visible={createOpen} onRequestClose={() => setCreateOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: theme.overlay, justifyContent: "flex-end" }]}>
          <View style={[styles.createSheet, { paddingBottom: Math.max(insets.bottom, 14), backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            <View style={[styles.handle, { backgroundColor: theme.pageTextMuted }]} />
            <View style={styles.createHeader}><Text style={[styles.createTitle, { color: theme.pageText }]}>Nouvel espace</Text><Pressable accessibilityLabel="Fermer" onPress={() => setCreateOpen(false)} style={[styles.closeButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="close" size={21} color={theme.pageTextMuted} /></Pressable></View>
            <View style={[styles.nameShell, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}><Ionicons name="pencil-outline" size={18} color={theme.pageTextMuted} /><TextInput value={roomName} onChangeText={setRoomName} placeholder="Nom de l’espace" placeholderTextColor={theme.pageTextMuted} style={[styles.nameInput, { color: theme.pageText }]} /></View>
            <View style={styles.kindRow}>
              {([
                ["open", "people-outline", "Ouvert"],
                ["focus", "radio-button-on-outline", "Focus"],
                ["private", "lock-closed-outline", "Privé"]
              ] as const).map(([kind, icon, label]) => {
                const active = roomKind === kind;
                return <Pressable key={kind} accessibilityState={{ selected: active }} onPress={() => setRoomKind(kind)} style={[styles.kindButton, { backgroundColor: active ? theme.violetSoft : theme.surfaceStrong, borderColor: active ? theme.violet : theme.borderSoft }]}><Ionicons name={icon} size={20} color={active ? theme.violet : theme.pageTextMuted} /><Text style={[styles.kindText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{label}</Text></Pressable>;
              })}
            </View>
            {roomKind === "private" ? (
              <View style={styles.inviteBlock}>
                <Text style={[styles.inviteTitle, { color: theme.pageText }]}>Avec qui ?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inviteScroller}>
                  {inviteCandidates.map((member) => {
                    const selected = selectedInviteIds.includes(member.id);
                    return <Pressable key={member.id} accessibilityState={{ selected }} onPress={() => toggleInvite(member.id)} style={[styles.invitePerson, { backgroundColor: selected ? theme.violetSoft : theme.surfaceStrong, borderColor: selected ? theme.violet : theme.borderSoft }]}><StatusAvatar user={member} size={38} ringWidth={1.5} accessible={false} /><Text numberOfLines={1} style={[styles.inviteName, { color: theme.pageText }]}>{member.name.split(/\s+/)[0]}</Text>{selected ? <Ionicons name="checkmark-circle" size={16} color={theme.success} /> : null}</Pressable>;
                  })}
                </ScrollView>
              </View>
            ) : null}
            <Pressable disabled={creating} onPress={() => void submitCreate()} style={({ pressed }) => [styles.createSubmit, pressed && styles.pressed]}><LinearGradient colors={gradients.primary} style={styles.createSubmitGradient}>{creating ? <ActivityIndicator color={colors.white} /> : <Ionicons name={roomKind === "focus" ? "timer-outline" : "enter-outline"} size={21} color={colors.white} />}<Text style={styles.createSubmitText}>{creating ? "Création…" : "Créer et entrer"}</Text></LinearGradient></Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

function RoomCard({ space, members, currentUser, joining, onPress }: { space: CoworkingSpace; members: AppUser[]; currentUser: AppUser; joining: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  const joinable = canJoinCoworkingSpace(space, currentUser.id);
  const roomMembers = space.participantIds.map((id) => userForId(members, currentUser, id)).filter((member): member is AppUser => Boolean(member));
  return (
    <Pressable disabled={!joinable || joining} onPress={onPress} style={({ pressed }) => [styles.roomCard, { backgroundColor: theme.surface, borderColor: space.kind === "focus" ? theme.violet : theme.borderSoft, opacity: joinable ? 1 : 0.72 }, pressed && styles.pressed]}>
      <View style={styles.roomTop}><View style={[styles.roomIcon, { backgroundColor: space.kind === "focus" ? theme.violetSoft : theme.surfaceStrong }]}><Ionicons name={space.kind === "focus" ? "timer-outline" : space.access === "invite" ? "lock-closed" : "videocam"} size={17} color={space.kind === "focus" ? theme.violet : theme.pageTextMuted} /></View><Text style={[styles.roomCount, { color: theme.pageTextMuted }]}>{roomOccupancyLabel(space)}</Text></View>
      <Text numberOfLines={1} style={[styles.roomName, { color: theme.pageText }]}>{space.name}</Text>
      <Text numberOfLines={1} style={[styles.roomActivity, { color: theme.pageTextMuted }]}>{space.activity ?? (space.access === "invite" ? "Sur invitation" : "Porte ouverte")}</Text>
      <View style={styles.roomBottom}>
        <View style={styles.roomAvatars}>{roomMembers.slice(0, 4).map((member, index) => <View key={member.id} style={index > 0 ? styles.roomAvatarOverlap : undefined}><StatusAvatar user={member} size={25} ringWidth={1.3} accessible={false} /></View>)}</View>
        {joining ? <ActivityIndicator size="small" color={theme.violet} /> : <Ionicons name={joinable ? "arrow-forward-circle" : "lock-closed"} size={21} color={joinable ? theme.violet : theme.pageTextMuted} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { minHeight: 64, paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  topButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  titleBlock: { flex: 1, minWidth: 0, alignItems: "center" },
  topTitle: { ...typography.heading2, textAlign: "center" },
  liveLine: { flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  liveText: { fontSize: 11, fontWeight: "800" },
  body: { flex: 1, minHeight: 0 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  hubStage: { flex: 1, minHeight: 300, maxHeight: 430, position: "relative", overflow: "hidden", alignSelf: "stretch" },
  orbitOuter: { position: "absolute", borderWidth: 1, alignSelf: "center", top: "50%", left: "50%", opacity: 0.55 },
  orbitInner: { position: "absolute", width: 190, height: 190, borderRadius: 95, borderWidth: 1, alignSelf: "center", top: "50%", left: "50%", marginLeft: -95, marginTop: -95, opacity: 0.75 },
  hubCore: { position: "absolute", width: 126, height: 126, borderRadius: 63, top: "50%", left: "50%", marginLeft: -63, marginTop: -63, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 2, shadowColor: "#6B4FEA", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 8 } },
  hubTitle: { fontSize: 14, fontWeight: "900" },
  hubCount: { fontSize: 11, fontWeight: "700" },
  personBubble: { position: "absolute", width: 82, alignItems: "center" },
  personSpeaking: { transform: [{ scale: 1.05 }] },
  personAvatarShell: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  cameraBadge: { position: "absolute", right: -1, bottom: -1, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  personName: { width: 80, marginTop: 3, textAlign: "center", fontSize: 11, fontWeight: "900" },
  presenceChip: { maxWidth: 80, minHeight: 22, borderRadius: 11, paddingHorizontal: 6, marginTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3 },
  presenceText: { maxWidth: 62, fontSize: 11, fontWeight: "800" },
  emptyHub: { position: "absolute", left: 20, right: 20, bottom: 14, alignItems: "center" },
  emptyHubTitle: { fontSize: 13, fontWeight: "900" },
  emptyHubText: { fontSize: 12, textAlign: "center" },
  roomSection: { minHeight: 150, paddingTop: 4 },
  roomHeadingRow: { minHeight: 28, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roomHeading: { fontSize: 13, fontWeight: "900" },
  roomMeta: { fontSize: 11, fontWeight: "800" },
  roomScroller: { paddingHorizontal: 10, paddingBottom: 8, gap: 8 },
  roomCard: { width: 142, height: 112, borderRadius: 20, borderWidth: 1, padding: 10 },
  roomTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roomIcon: { width: 29, height: 29, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  roomCount: { fontSize: 11, fontWeight: "900" },
  roomName: { marginTop: 5, fontSize: 12, fontWeight: "900" },
  roomActivity: { fontSize: 11, marginTop: 1 },
  roomBottom: { flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  roomAvatars: { flexDirection: "row", paddingLeft: 2 },
  roomAvatarOverlap: { marginLeft: -8 },
  createCard: { width: 92, height: 112, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  createCardText: { fontSize: 11, fontWeight: "900" },
  threshold: { borderTopWidth: 1, paddingHorizontal: 10, paddingTop: 9, gap: 8 },
  enterPressable: { width: "100%", maxWidth: 620, alignSelf: "center", height: 62, borderRadius: 22, overflow: "hidden" },
  enterGradient: { flex: 1, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  enterAvatars: { width: 72, flexDirection: "row", alignItems: "center" },
  enterAvatarOverlap: { marginLeft: -9 },
  enterCopy: { flex: 1, minWidth: 0 },
  enterTitle: { color: colors.white, fontSize: 14, fontWeight: "900" },
  enterSub: { color: "rgba(255,255,255,0.78)", fontSize: 11, marginTop: 1, fontWeight: "700" },
  currentSpace: { minHeight: 56, borderRadius: 19, borderWidth: 1, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 9 },
  currentSpaceIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  currentSpaceCopy: { flex: 1, minWidth: 0 },
  currentSpaceTitle: { fontSize: 13, fontWeight: "900" },
  currentSpaceSub: { fontSize: 11, marginTop: 1 },
  presenceModes: { minHeight: 48, flexDirection: "row", justifyContent: "center", gap: 3 },
  modeButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  errorToast: { position: "absolute", top: 84, left: 12, right: 12, minHeight: 44, borderRadius: 15, borderWidth: 1, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 20 },
  errorText: { flex: 1, fontSize: 11, fontWeight: "700" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
  modalBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 12 },
  memberSheet: { width: "100%", maxWidth: 360, borderRadius: 28, borderWidth: 1, padding: 18, alignItems: "center" },
  memberName: { ...typography.heading2, marginTop: 11, textAlign: "center" },
  memberCompany: { fontSize: 12, marginTop: 2, marginBottom: 15, textAlign: "center" },
  memberAction: { width: "100%", minHeight: 54, borderRadius: 18, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  memberActionText: { flex: 1, fontSize: 13, fontWeight: "900" },
  createSheet: { width: "100%", maxWidth: 620, maxHeight: "82%", alignSelf: "center", borderRadius: 28, borderWidth: 1, padding: 14, gap: 12 },
  handle: { width: 44, height: 4, borderRadius: 2, alignSelf: "center", opacity: 0.35 },
  createHeader: { minHeight: 48, flexDirection: "row", alignItems: "center" },
  createTitle: { ...typography.heading2, flex: 1 },
  closeButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  nameShell: { minHeight: 50, borderRadius: 17, borderWidth: 1, paddingLeft: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  nameInput: { flex: 1, minHeight: 48, fontSize: 15, paddingRight: 10 },
  kindRow: { flexDirection: "row", gap: 7 },
  kindButton: { flex: 1, minHeight: 58, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  kindText: { fontSize: 11, fontWeight: "900" },
  inviteBlock: { gap: 6 },
  inviteTitle: { fontSize: 12, fontWeight: "900" },
  inviteScroller: { gap: 7, paddingVertical: 2 },
  invitePerson: { width: 82, height: 82, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  inviteName: { width: 68, textAlign: "center", fontSize: 11, fontWeight: "800" },
  createSubmit: { height: 56, borderRadius: 19, overflow: "hidden" },
  createSubmitGradient: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  createSubmitText: { color: colors.white, fontSize: 13, fontWeight: "900" },
  unavailable: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  unavailableCard: { width: "100%", maxWidth: 390, borderRadius: radii.xl, borderWidth: 1, padding: spacing.lg, alignItems: "center", gap: spacing.sm },
  unavailableTitle: { ...typography.heading3 },
  unavailableText: { ...typography.bodySmall, textAlign: "center" }
});
