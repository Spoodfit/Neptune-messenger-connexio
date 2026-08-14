import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { StatusAvatar } from "@/components/StatusAvatar";
import { env } from "@/config/env";
import { useExperience } from "@/providers/ExperienceProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useScheduledCalls } from "@/providers/ScheduledCallsProvider";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import { colors, gradients, spacing, typography } from "@/theme";
import type { AppUser } from "@/types/messaging";

function directionLabel(direction: "incoming" | "outgoing" | "missed") {
  if (direction === "missed") return "Appel manqué";
  if (direction === "incoming") return "Appel entrant";
  return "Appel sortant";
}

function recencyBoost(iso: string): number {
  const ageDays = Math.max(0, (Date.now() - Date.parse(iso)) / 86_400_000);
  if (ageDays <= 3) return 6;
  if (ageDays <= 14) return 4;
  if (ageDays <= 45) return 2;
  return 0;
}

function frequentMembers(history: ReturnType<typeof useExperience>["callHistory"], members: AppUser[], currentUserId: string): AppUser[] {
  const scores = new Map<string, number>();
  for (const call of history) {
    const durationBoost = call.durationSeconds ? Math.min(3, call.durationSeconds / 300) : 0;
    scores.set(call.member.id, (scores.get(call.member.id) ?? 0) + 4 + recencyBoost(call.occurredAt) + durationBoost);
  }
  return members
    .filter((member) => member.id !== currentUserId)
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .filter((member) => (scores.get(member.id) ?? 0) > 0)
    .slice(0, 6);
}

export default function CallsScreen() {
  const { accessToken, currentUser } = useSession();
  const { callHistory, members, localConversations, createPrivateConversation } = useExperience();
  const { visibleConversations, refreshConversations } = useMessaging();
  const { calls: scheduledCalls, acceptScheduledCall, cancelScheduledCall } = useScheduledCalls();
  const api = useMemo(() => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)), [accessToken]);
  const [query, setQuery] = useState("");
  const [openingMemberId, setOpeningMemberId] = useState<string | null>(null);
  const [busyScheduledId, setBusyScheduledId] = useState<string | null>(null);

  const frequent = useMemo(() => frequentMembers(callHistory, members, currentUser.id), [callHistory, currentUser.id, members]);
  const normalizedQuery = query.trim().toLocaleLowerCase("fr");
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return members
      .filter((member) => member.id !== currentUser.id)
      .filter((member) => [member.name, member.company, member.city, member.roleLabel].join(" ").toLocaleLowerCase("fr").includes(normalizedQuery))
      .slice(0, 12);
  }, [currentUser.id, members, normalizedQuery]);
  const upcoming = useMemo(() => scheduledCalls
    .filter((call) => call.status === "pending" || call.status === "accepted")
    .filter((call) => Date.parse(call.scheduledAt) > Date.now() - 5 * 60_000)
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt)), [scheduledCalls]);

  const ensureConversation = async (memberId: string) => {
    const existing = [...visibleConversations, ...localConversations].find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(memberId));
    if (existing) return existing;
    const conversation = api
      ? await api.createPrivateConversation([memberId])
      : createPrivateConversation({ memberIds: [memberId] });
    if (api) await refreshConversations();
    return conversation;
  };

  const startCall = async (memberId: string, mode: "audio" | "video", reason?: string) => {
    if (openingMemberId) return;
    setOpeningMemberId(memberId);
    try {
      const conversation = await ensureConversation(memberId);
      router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode, ...(reason ? { reason } : {}) } });
    } finally {
      setOpeningMemberId(null);
    }
  };

  const scheduleWith = (memberId: string) => router.push({ pathname: "/schedule-call", params: { memberId } });

  const simulateAcceptance = async (scheduledId: string, memberName: string) => {
    if (!env.mockMode || busyScheduledId) return;
    setBusyScheduledId(scheduledId);
    try { await acceptScheduledCall(scheduledId, memberName); }
    finally { setBusyScheduledId(null); }
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <BrandHeader title="Appels" subtitle="Trouver, appeler ou programmer une mise en relation." />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.searchShell}>
          <Ionicons name="search" size={21} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nom, entreprise, ville…"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Rechercher une personne à appeler"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {query ? <Pressable accessibilityLabel="Effacer la recherche" onPress={() => setQuery("")} style={styles.clearSearch}><Ionicons name="close-circle" size={20} color={colors.textMuted} /></Pressable> : null}
        </View>

        {normalizedQuery ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Résultats</Text><Text style={styles.sectionMeta}>{searchResults.length}</Text></View>
            <View style={styles.peopleList}>
              {searchResults.map((member) => <PersonRow key={member.id} member={member} busy={openingMemberId === member.id} onCall={() => void startCall(member.id, "audio")} onVideo={() => void startCall(member.id, "video")} onSchedule={() => scheduleWith(member.id)} />)}
              {searchResults.length === 0 ? <View style={styles.empty}><Ionicons name="search-outline" size={28} color={colors.textMuted} /><Text style={styles.emptyText}>Aucun membre ne correspond à cette recherche.</Text></View> : null}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHead}><Text style={styles.sectionTitle}>À joindre rapidement</Text><Text style={styles.sectionMeta}>Selon vos appels récents</Text></View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frequentRow}>
                {frequent.map((member) => <View key={member.id} style={styles.frequentCard}><Pressable accessibilityLabel={`Profil de ${member.name}`} onPress={() => router.push(`/profile/${encodeURIComponent(member.id)}`)} style={styles.frequentIdentity}><StatusAvatar user={member} size={58} /><Text numberOfLines={1} style={styles.frequentName}>{member.name.split(" ")[0]}</Text><Text numberOfLines={1} style={styles.frequentCompany}>{member.company}</Text></Pressable><View style={styles.frequentActions}><Pressable accessibilityLabel={`Appeler ${member.name}`} onPress={() => void startCall(member.id, "audio")} style={styles.miniAction}><Ionicons name="call" size={18} color={colors.text} /></Pressable><Pressable accessibilityLabel={`Programmer avec ${member.name}`} onPress={() => scheduleWith(member.id)} style={styles.miniAction}><Ionicons name="calendar" size={18} color={colors.orange} /></Pressable></View></View>)}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Rendez-vous à venir</Text><Pressable accessibilityRole="button" onPress={() => { const firstMember = frequent[0] ?? members.find((member) => member.id !== currentUser.id); if (firstMember) scheduleWith(firstMember.id); }} style={styles.newAppointment}><Ionicons name="add" size={17} color={colors.white} /><Text style={styles.newAppointmentText}>Programmer</Text></Pressable></View>
              {upcoming.length > 0 ? <View style={styles.appointmentList}>{upcoming.map((call) => {
                const member = members.find((item) => item.id === call.memberId);
                if (!member) return null;
                const accepted = call.status === "accepted";
                return <View key={call.id} style={[styles.appointmentCard, accepted && styles.appointmentAccepted]}><View style={styles.appointmentTop}><StatusAvatar user={member} size={48} /><View style={styles.appointmentCopy}><View style={styles.statusLine}><View style={[styles.statusDot, accepted && styles.statusDotAccepted]} /><Text style={[styles.statusText, accepted && styles.statusTextAccepted]}>{accepted ? "Confirmé" : "En attente"}</Text></View><Text style={styles.appointmentName}>{member.name}</Text><Text style={styles.appointmentDate}>{new Date(call.scheduledAt).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text></View><Ionicons name={call.mode === "audio" ? "call-outline" : "videocam-outline"} size={21} color={colors.textMuted} /></View><View style={styles.subjectBox}><Text style={styles.subjectLabel}>OBJET</Text><Text style={styles.subjectText}>{call.subject}</Text></View><View style={styles.appointmentActions}>{accepted ? <Pressable onPress={() => void startCall(member.id, call.mode, call.subject)} style={styles.appointmentPrimary}><Ionicons name={call.mode === "audio" ? "call" : "videocam"} size={18} color={colors.white} /><Text style={styles.appointmentPrimaryText}>Appeler maintenant</Text></Pressable> : env.mockMode ? <Pressable disabled={busyScheduledId === call.id} onPress={() => void simulateAcceptance(call.id, member.name)} style={styles.appointmentPrimary}>{busyScheduledId === call.id ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="checkmark-circle" size={18} color={colors.white} /><Text style={styles.appointmentPrimaryText}>Simuler l’acceptation</Text></>}</Pressable> : <View style={styles.pendingInfo}><Ionicons name="time-outline" size={17} color={colors.orange} /><Text style={styles.pendingInfoText}>Invitation envoyée</Text></View>}<Pressable accessibilityLabel="Annuler ce rendez-vous" onPress={() => void cancelScheduledCall(call.id)} style={styles.cancelAppointment}><Ionicons name="close" size={19} color={colors.textMuted} /></Pressable></View></View>;
              })}</View> : <View style={styles.emptyAppointment}><Ionicons name="calendar-outline" size={27} color={colors.textMuted} /><Text style={styles.emptyTitle}>Aucun appel programmé</Text><Text style={styles.emptyText}>Choisissez une personne ci-dessus ou recherchez-la pour lui proposer un créneau.</Text></View>}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Récents</Text><Text style={styles.sectionMeta}>{callHistory.length} appels</Text></View>
              <View style={styles.list}>{callHistory.map((call) => <LinearGradient key={call.id} colors={gradients.glass} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.row}><Pressable accessibilityLabel={`Ouvrir le profil de ${call.member.name}`} onPress={() => router.push(`/profile/${encodeURIComponent(call.member.id)}`)} style={styles.identity}><StatusAvatar user={call.member} size={50} /><View style={styles.rowContent}><Text style={styles.name} numberOfLines={1}>{call.member.name}</Text><View style={styles.callMetaLine}><Ionicons name={call.direction === "incoming" ? "arrow-down-outline" : call.direction === "outgoing" ? "arrow-up-outline" : "close-outline"} size={13} color={call.direction === "missed" ? colors.danger : colors.success} /><Text style={[styles.callType, call.direction === "missed" && styles.callTypeMissed]} numberOfLines={1}>{call.type === "video" ? `Visio · ${directionLabel(call.direction)}` : directionLabel(call.direction)}</Text></View><Text style={styles.time}>{new Date(call.occurredAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}{call.durationSeconds ? ` · ${Math.floor(call.durationSeconds / 60)} min` : ""}</Text></View></Pressable><View style={styles.actions}>{openingMemberId === call.member.id ? <View style={styles.actionLoader}><ActivityIndicator size="small" color={colors.violet} /></View> : null}<Pressable accessibilityLabel={`Appeler ${call.member.name}`} disabled={Boolean(openingMemberId)} onPress={() => void startCall(call.member.id, "audio")} style={styles.actionButton}><Ionicons name="call-outline" size={19} color={colors.text} /></Pressable><Pressable accessibilityLabel={`Programmer un appel avec ${call.member.name}`} onPress={() => scheduleWith(call.member.id)} style={styles.actionButton}><Ionicons name="calendar-outline" size={19} color={colors.orange} /></Pressable></View></LinearGradient>)}</View>
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function PersonRow({ member, busy, onCall, onVideo, onSchedule }: { member: AppUser; busy: boolean; onCall: () => void; onVideo: () => void; onSchedule: () => void }) {
  return <View style={styles.personRow}><Pressable onPress={() => router.push(`/profile/${encodeURIComponent(member.id)}`)} style={styles.personIdentity}><StatusAvatar user={member} size={48} /><View style={styles.personCopy}><Text style={styles.personName}>{member.name}</Text><Text numberOfLines={1} style={styles.personMeta}>{member.company} · {member.city}</Text></View></Pressable><View style={styles.personActions}>{busy ? <ActivityIndicator color={colors.violet} /> : <><Pressable accessibilityLabel={`Appeler ${member.name}`} onPress={onCall} style={styles.personButton}><Ionicons name="call-outline" size={19} color={colors.text} /></Pressable><Pressable accessibilityLabel={`Visio avec ${member.name}`} onPress={onVideo} style={styles.personButton}><Ionicons name="videocam-outline" size={20} color={colors.text} /></Pressable><Pressable accessibilityLabel={`Programmer avec ${member.name}`} onPress={onSchedule} style={styles.personButton}><Ionicons name="calendar-outline" size={19} color={colors.orange} /></Pressable></>}</View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 10, paddingTop: 12, paddingBottom: 28 },
  searchShell: { minHeight: 54, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 9 }, searchInput: { flex: 1, minWidth: 0, minHeight: 50, color: colors.text, fontSize: 16 }, clearSearch: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  section: { marginTop: spacing.lg }, sectionHead: { minHeight: 44, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, sectionTitle: { ...typography.heading3, color: colors.text, fontWeight: "900" }, sectionMeta: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  frequentRow: { gap: 9, paddingVertical: 4, paddingRight: 10 }, frequentCard: { width: 136, minHeight: 174, padding: 11, borderRadius: 22, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, alignItems: "center" }, frequentIdentity: { width: "100%", alignItems: "center" }, frequentName: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 8 }, frequentCompany: { width: "100%", color: colors.textMuted, fontSize: 10, textAlign: "center", marginTop: 2 }, frequentActions: { marginTop: 10, flexDirection: "row", gap: 8 }, miniAction: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  newAppointment: { minHeight: 38, paddingHorizontal: 12, borderRadius: 15, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", gap: 5 }, newAppointmentText: { color: colors.white, fontSize: 11, fontWeight: "900" }, appointmentList: { gap: 9 }, appointmentCard: { padding: 13, borderRadius: 22, borderWidth: 1, borderColor: "rgba(244,177,131,0.28)", backgroundColor: colors.surface }, appointmentAccepted: { borderColor: "rgba(56,248,180,0.28)" }, appointmentTop: { flexDirection: "row", alignItems: "center", gap: 10 }, appointmentCopy: { flex: 1, minWidth: 0 }, statusLine: { flexDirection: "row", alignItems: "center", gap: 6 }, statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange }, statusDotAccepted: { backgroundColor: colors.success }, statusText: { color: colors.orange, fontSize: 10, fontWeight: "900" }, statusTextAccepted: { color: colors.success }, appointmentName: { color: colors.text, fontSize: 15, fontWeight: "900", marginTop: 2 }, appointmentDate: { color: colors.textMuted, fontSize: 11, marginTop: 2, textTransform: "capitalize" }, subjectBox: { marginTop: 11, padding: 10, borderRadius: 15, backgroundColor: colors.surfaceStrong }, subjectLabel: { color: colors.orange, fontSize: 9, fontWeight: "900" }, subjectText: { color: colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 3 }, appointmentActions: { minHeight: 52, marginTop: 9, flexDirection: "row", alignItems: "center", gap: 8 }, appointmentPrimary: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, appointmentPrimaryText: { color: colors.white, fontSize: 11, fontWeight: "900" }, cancelAppointment: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" }, pendingInfo: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, pendingInfoText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" }, emptyAppointment: { minHeight: 140, padding: spacing.md, borderRadius: 22, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 6 }, emptyTitle: { color: colors.text, fontSize: 14, fontWeight: "900" }, emptyText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, textAlign: "center", maxWidth: 360 },
  peopleList: { gap: 7 }, personRow: { minHeight: 72, padding: 9, borderRadius: 19, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 8 }, personIdentity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 }, personCopy: { flex: 1, minWidth: 0 }, personName: { color: colors.text, fontSize: 14, fontWeight: "900" }, personMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3 }, personActions: { minWidth: 48, flexDirection: "row", gap: 5 }, personButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" }, empty: { minHeight: 150, alignItems: "center", justifyContent: "center", gap: 8 },
  list: { gap: spacing.sm }, row: { width: "100%", minHeight: 80, paddingHorizontal: 11, paddingVertical: 12, borderRadius: 21, borderWidth: 1, borderColor: colors.borderSoft, flexDirection: "row", alignItems: "center", gap: 8 }, identity: { flex: 1, minWidth: 0, minHeight: 54, flexDirection: "row", alignItems: "center", gap: 11 }, rowContent: { flex: 1, minWidth: 0 }, name: { color: colors.text, fontSize: 16, lineHeight: 19, fontWeight: "900" }, callMetaLine: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 8 }, callType: { color: colors.textSecondary, fontSize: 11, lineHeight: 14, flexShrink: 1 }, callTypeMissed: { color: colors.danger }, time: { color: colors.textMuted, fontSize: 11, lineHeight: 12, marginTop: 2 }, actions: { flexDirection: "row", gap: 6, flexShrink: 0, position: "relative" }, actionButton: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.glass, alignItems: "center", justifyContent: "center" }, actionLoader: { position: "absolute", zIndex: 3, inset: 0, borderRadius: 14, backgroundColor: "rgba(5,11,28,0.82)", alignItems: "center", justifyContent: "center" }
});
