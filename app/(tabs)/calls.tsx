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
import { useAppTheme } from "@/providers/ThemeProvider";
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
  const theme = useAppTheme();
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
    const existing = [...visibleConversations, ...localConversations]
      .find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(memberId));
    if (existing) return existing;
    const conversation = api
      ? await api.createPrivateConversation([memberId])
      : createPrivateConversation({ memberIds: [memberId] });
    if (api) await refreshConversations();
    return conversation;
  };

  const startCall = async (memberId: string, mode: "audio" | "video", reason?: string, scheduled = false) => {
    if (openingMemberId) return;
    setOpeningMemberId(memberId);
    try {
      const conversation = await ensureConversation(memberId);
      router.push({
        pathname: "/call/[id]",
        params: {
          id: conversation.id,
          mode,
          ...(reason ? { reason } : {}),
          ...(scheduled ? { scheduled: "1" } : {})
        }
      });
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
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <BrandHeader title="Appels" subtitle="Trouver, appeler ou programmer une mise en relation." />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.searchShell, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
          <Ionicons name="search" size={21} color={theme.pageTextMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nom, entreprise, ville…"
            placeholderTextColor={theme.pageTextMuted}
            accessibilityLabel="Rechercher une personne à appeler"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.pageText }]}
          />
          {query ? <Pressable accessibilityLabel="Effacer la recherche" onPress={() => setQuery("")} style={styles.clearSearch}><Ionicons name="close-circle" size={20} color={theme.pageTextMuted} /></Pressable> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/contact-actions", params: { intent: "invite" } })}
          style={[styles.utilityButton, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}
        >
          <Ionicons name="person-add-outline" size={19} color={theme.violet} />
          <View style={styles.utilityCopy}><Text style={[styles.utilityTitle, { color: theme.pageText }]}>Inviter un contact</Text><Text style={[styles.utilityText, { color: theme.pageTextMuted }]}>Depuis le sélecteur du téléphone</Text></View>
          <Ionicons name="chevron-forward" size={17} color={theme.pageTextMuted} />
        </Pressable>

        {normalizedQuery ? (
          <Section title="Résultats" meta={String(searchResults.length)}>
            <View style={styles.peopleList}>
              {searchResults.map((member) => <PersonRow key={member.id} member={member} busy={openingMemberId === member.id} onCall={() => void startCall(member.id, "audio")} onVideo={() => void startCall(member.id, "video")} onSchedule={() => scheduleWith(member.id)} />)}
              {searchResults.length === 0 ? <View style={styles.empty}><Ionicons name="search-outline" size={28} color={theme.pageTextMuted} /><Text style={[styles.emptyText, { color: theme.pageTextMuted }]}>Aucun membre ne correspond à cette recherche.</Text></View> : null}
            </View>
          </Section>
        ) : (
          <>
            <Section title="À joindre rapidement" meta="Selon vos appels récents">
              <View style={styles.frequentRow}>
                {frequent.map((member) => (
                  <View key={member.id} style={[styles.frequentCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
                    <Pressable accessibilityLabel={`Profil de ${member.name}`} onPress={() => router.push(`/profile/${encodeURIComponent(member.id)}`)} style={styles.frequentIdentity}>
                      <StatusAvatar user={member} size={58} />
                      <Text numberOfLines={1} style={[styles.frequentName, { color: theme.pageText }]}>{member.name.split(" ")[0]}</Text>
                      <Text numberOfLines={1} style={[styles.frequentCompany, { color: theme.pageTextMuted }]}>{member.company}</Text>
                    </Pressable>
                    <View style={styles.frequentActions}>
                      <Pressable accessibilityLabel={`Appeler ${member.name}`} onPress={() => void startCall(member.id, "audio")} style={[styles.miniAction, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}><Ionicons name="call" size={18} color={theme.pageText} /></Pressable>
                      <Pressable accessibilityLabel={`Programmer avec ${member.name}`} onPress={() => scheduleWith(member.id)} style={[styles.miniAction, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}><Ionicons name="calendar" size={18} color={theme.orange} /></Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </Section>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: theme.pageText }]}>Rendez-vous à venir</Text>
                <Pressable accessibilityRole="button" onPress={() => { const firstMember = frequent[0] ?? members.find((member) => member.id !== currentUser.id); if (firstMember) scheduleWith(firstMember.id); }} style={styles.newAppointment}>
                  <Ionicons name="add" size={17} color={colors.white} /><Text style={styles.newAppointmentText}>Programmer</Text>
                </Pressable>
              </View>
              {upcoming.length > 0 ? <View style={styles.appointmentList}>{upcoming.map((call) => {
                const member = members.find((item) => item.id === call.memberId);
                if (!member) return null;
                const accepted = call.status === "accepted";
                return (
                  <View key={call.id} style={[styles.appointmentCard, { backgroundColor: theme.surface, borderColor: accepted ? theme.success : theme.orange }]}>
                    <View style={styles.appointmentTop}>
                      <StatusAvatar user={member} size={48} />
                      <View style={styles.appointmentCopy}>
                        <View style={styles.statusLine}><View style={[styles.statusDot, { backgroundColor: accepted ? theme.success : theme.orange }]} /><Text style={[styles.statusText, { color: accepted ? theme.success : theme.orange }]}>{accepted ? "Confirmé" : "En attente"}</Text></View>
                        <Text style={[styles.appointmentName, { color: theme.pageText }]}>{member.name}</Text>
                        <Text style={[styles.appointmentDate, { color: theme.pageTextMuted }]}>{new Date(call.scheduledAt).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                      </View>
                      <Ionicons name={call.mode === "audio" ? "call-outline" : "videocam-outline"} size={21} color={theme.pageTextMuted} />
                    </View>
                    <View style={[styles.subjectBox, { backgroundColor: theme.surfaceStrong }]}><Text style={[styles.subjectLabel, { color: theme.orange }]}>OBJET</Text><Text style={[styles.subjectText, { color: theme.pageTextSecondary }]}>{call.subject}</Text>{call.guestContacts?.length ? <Text style={[styles.guestLine, { color: theme.violet }]}>+ {call.guestContacts.map((guest) => guest.displayName).join(", ")}</Text> : null}</View>
                    <View style={styles.appointmentActions}>
                      {accepted ? <Pressable onPress={() => void startCall(member.id, call.mode, call.subject, true)} style={styles.appointmentPrimary}><Ionicons name={call.mode === "audio" ? "call" : "videocam"} size={18} color={colors.white} /><Text style={styles.appointmentPrimaryText}>Rejoindre le rendez-vous</Text></Pressable> : env.mockMode ? <Pressable disabled={busyScheduledId === call.id} onPress={() => void simulateAcceptance(call.id, member.name)} style={styles.appointmentPrimary}>{busyScheduledId === call.id ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="checkmark-circle" size={18} color={colors.white} /><Text style={styles.appointmentPrimaryText}>Simuler l’acceptation</Text></>}</Pressable> : <View style={styles.pendingInfo}><Ionicons name="time-outline" size={17} color={theme.orange} /><Text style={[styles.pendingInfoText, { color: theme.pageTextMuted }]}>Invitation envoyée</Text></View>}
                      <Pressable accessibilityLabel="Annuler ce rendez-vous" onPress={() => void cancelScheduledCall(call.id)} style={[styles.cancelAppointment, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="close" size={19} color={theme.pageTextMuted} /></Pressable>
                    </View>
                  </View>
                );
              })}</View> : <View style={[styles.emptyAppointment, { borderColor: theme.border }]}><Ionicons name="calendar-outline" size={27} color={theme.pageTextMuted} /><Text style={[styles.emptyTitle, { color: theme.pageText }]}>Aucun appel programmé</Text><Text style={[styles.emptyText, { color: theme.pageTextMuted }]}>Choisissez une personne ci-dessus ou recherchez-la pour lui proposer un créneau.</Text></View>}
            </View>

            <Section title="Récents" meta={`${callHistory.length} appels`}>
              <View style={styles.list}>{callHistory.map((call) => (
                <LinearGradient key={call.id} colors={theme.isLight ? [theme.surface, theme.surfaceStrong] : gradients.glass} style={[styles.row, { borderColor: theme.borderSoft }]}>
                  <Pressable accessibilityLabel={`Ouvrir le profil de ${call.member.name}`} onPress={() => router.push(`/profile/${encodeURIComponent(call.member.id)}`)} style={styles.identity}>
                    <StatusAvatar user={call.member} size={50} />
                    <View style={styles.rowContent}><Text style={[styles.name, { color: theme.pageText }]} numberOfLines={1}>{call.member.name}</Text><View style={styles.callMetaLine}><Ionicons name={call.direction === "incoming" ? "arrow-down-outline" : call.direction === "outgoing" ? "arrow-up-outline" : "close-outline"} size={13} color={call.direction === "missed" ? theme.danger : theme.success} /><Text style={[styles.callType, { color: call.direction === "missed" ? theme.danger : theme.pageTextSecondary }]} numberOfLines={1}>{call.type === "video" ? `Visio · ${directionLabel(call.direction)}` : directionLabel(call.direction)}</Text></View><Text style={[styles.time, { color: theme.pageTextMuted }]}>{new Date(call.occurredAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}{call.durationSeconds ? ` · ${Math.floor(call.durationSeconds / 60)} min` : ""}</Text></View>
                  </Pressable>
                  <View style={styles.actions}>{openingMemberId === call.member.id ? <View style={[styles.actionLoader, { backgroundColor: theme.surface }]}><ActivityIndicator size="small" color={theme.violet} /></View> : null}<Pressable accessibilityLabel={`Appeler ${call.member.name}`} disabled={Boolean(openingMemberId)} onPress={() => void startCall(call.member.id, "audio")} style={[styles.actionButton, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}><Ionicons name="call-outline" size={19} color={theme.pageText} /></Pressable><Pressable accessibilityLabel={`Programmer un appel avec ${call.member.name}`} onPress={() => scheduleWith(call.member.id)} style={[styles.actionButton, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}><Ionicons name="calendar-outline" size={19} color={theme.orange} /></Pressable></View>
                </LinearGradient>
              ))}</View>
            </Section>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function Section({ title, meta, children }: { title: string; meta?: string; children: React.ReactNode }) {
  const theme = useAppTheme();
  return <View style={styles.section}><View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>{title}</Text>{meta ? <Text style={[styles.sectionMeta, { color: theme.pageTextMuted }]}>{meta}</Text> : null}</View>{children}</View>;
}

function PersonRow({ member, busy, onCall, onVideo, onSchedule }: { member: AppUser; busy: boolean; onCall: () => void; onVideo: () => void; onSchedule: () => void }) {
  const theme = useAppTheme();
  return <View style={[styles.personRow, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Pressable onPress={() => router.push(`/profile/${encodeURIComponent(member.id)}`)} style={styles.personIdentity}><StatusAvatar user={member} size={48} /><View style={styles.personCopy}><Text style={[styles.personName, { color: theme.pageText }]}>{member.name}</Text><Text numberOfLines={1} style={[styles.personMeta, { color: theme.pageTextMuted }]}>{member.company} · {member.city}</Text></View></Pressable><View style={styles.personActions}>{busy ? <ActivityIndicator color={theme.violet} /> : <><Pressable accessibilityLabel={`Appeler ${member.name}`} onPress={onCall} style={[styles.personButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="call-outline" size={19} color={theme.pageText} /></Pressable><Pressable accessibilityLabel={`Visio avec ${member.name}`} onPress={onVideo} style={[styles.personButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="videocam-outline" size={20} color={theme.pageText} /></Pressable><Pressable accessibilityLabel={`Programmer avec ${member.name}`} onPress={onSchedule} style={[styles.personButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="calendar-outline" size={19} color={theme.orange} /></Pressable></>}</View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 12, paddingTop: 12, paddingBottom: 28 },
  searchShell: { minHeight: 54, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 50, fontSize: 16 },
  clearSearch: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  utilityButton: { minHeight: 66, marginTop: 10, paddingHorizontal: 12, borderRadius: 19, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  utilityCopy: { flex: 1 }, utilityTitle: { fontSize: 13, fontWeight: "900" }, utilityText: { fontSize: 11, marginTop: 2 },
  section: { marginTop: spacing.lg },
  sectionHead: { minHeight: 48, paddingHorizontal: 4, paddingBottom: 6, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 8, rowGap: 10 },
  sectionTitle: { ...typography.heading3, flexShrink: 1, fontWeight: "900" }, sectionMeta: { fontSize: 11, fontWeight: "800" },
  frequentRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingVertical: 4 },
  frequentCard: { flexBasis: 122, flexGrow: 1, maxWidth: 160, minHeight: 174, padding: 11, borderRadius: 22, borderWidth: 1, alignItems: "center" },
  frequentIdentity: { width: "100%", alignItems: "center" }, frequentName: { fontSize: 14, fontWeight: "900", marginTop: 8 }, frequentCompany: { width: "100%", fontSize: 11, textAlign: "center", marginTop: 2 },
  frequentActions: { marginTop: 10, flexDirection: "row", gap: 8 }, miniAction: { width: 48, height: 48, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  newAppointment: { minHeight: 48, paddingHorizontal: 12, marginLeft: "auto", borderRadius: 15, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", gap: 5 }, newAppointmentText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  appointmentList: { gap: 10 }, appointmentCard: { padding: 13, borderRadius: 22, borderWidth: 1 }, appointmentTop: { flexDirection: "row", alignItems: "center", gap: 10 }, appointmentCopy: { flex: 1, minWidth: 0 }, statusLine: { flexDirection: "row", alignItems: "center", gap: 6 }, statusDot: { width: 7, height: 7, borderRadius: 4 }, statusText: { fontSize: 11, fontWeight: "900" }, appointmentName: { fontSize: 15, fontWeight: "900", marginTop: 2 }, appointmentDate: { fontSize: 11, marginTop: 2, textTransform: "capitalize" }, subjectBox: { marginTop: 11, padding: 10, borderRadius: 15 }, subjectLabel: { fontSize: 11, fontWeight: "900" }, subjectText: { fontSize: 13, lineHeight: 18, marginTop: 3 }, guestLine: { fontSize: 11, fontWeight: "800", marginTop: 5 },
  appointmentActions: { minHeight: 52, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }, appointmentPrimary: { flex: 1, minHeight: 48, paddingHorizontal: 10, borderRadius: 16, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, appointmentPrimaryText: { color: colors.white, fontSize: 11, fontWeight: "900", textAlign: "center" }, cancelAppointment: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, pendingInfo: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, pendingInfoText: { fontSize: 11, fontWeight: "800" },
  emptyAppointment: { minHeight: 140, padding: spacing.md, borderRadius: 22, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6 }, emptyTitle: { fontSize: 14, fontWeight: "900" }, emptyText: { fontSize: 12, lineHeight: 17, textAlign: "center", maxWidth: 360 },
  peopleList: { gap: 8 }, personRow: { minHeight: 72, padding: 9, borderRadius: 19, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 }, personIdentity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 }, personCopy: { flex: 1, minWidth: 0 }, personName: { fontSize: 14, fontWeight: "900" }, personMeta: { fontSize: 11, marginTop: 3 }, personActions: { minWidth: 48, flexDirection: "row", gap: 5 }, personButton: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" }, empty: { minHeight: 150, alignItems: "center", justifyContent: "center", gap: 8 },
  list: { gap: spacing.sm }, row: { width: "100%", minHeight: 80, paddingHorizontal: 11, paddingVertical: 12, borderRadius: 21, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 }, identity: { flex: 1, minWidth: 0, minHeight: 54, flexDirection: "row", alignItems: "center", gap: 11 }, rowContent: { flex: 1, minWidth: 0 }, name: { fontSize: 16, lineHeight: 19, fontWeight: "900" }, callMetaLine: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 8 }, callType: { fontSize: 11, lineHeight: 14, flexShrink: 1 }, time: { fontSize: 11, lineHeight: 12, marginTop: 2 }, actions: { flexDirection: "row", gap: 6, flexShrink: 0, position: "relative" }, actionButton: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" }, actionLoader: { position: "absolute", zIndex: 3, inset: 0, borderRadius: 14, alignItems: "center", justifyContent: "center" }
});
