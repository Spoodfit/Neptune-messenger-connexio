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
  Text,
  TextInput,
  View
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { StatusAvatar } from "@/components/StatusAvatar";
import { env } from "@/config/env";
import { useTabSwipeNavigation } from "@/hooks/useTabSwipeNavigation";
import { useCallAppointments } from "@/providers/CallAppointmentsProvider";
import { useExperience } from "@/providers/ExperienceProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import {
  pickDeviceContact,
  shareAppointmentInvite,
  shareConnexioInvite,
  type PickedDeviceContact
} from "@/services/contacts/deviceContacts";
import { colors, gradients, spacing, typography } from "@/theme";
import type { CallAppointment } from "@/types/callAppointments";
import type { AppUser } from "@/types/messaging";

function directionLabel(direction: "incoming" | "outgoing" | "missed") {
  if (direction === "missed") return "Appel manqué";
  if (direction === "incoming") return "Appel entrant";
  return "Appel sortant";
}

function formatDateInput(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatTimeInput(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function parseDateTime(dateText: string, timeText: string): Date | null {
  const dateMatch = dateText.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const timeMatch = timeText.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const [, day, month, year] = dateMatch;
  const [, hour, minute] = timeMatch;
  const value = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
  return Number.isNaN(value.getTime()) ? null : value;
}

function appointmentStatusLabel(appointment: CallAppointment): string {
  if (appointment.status === "accepted") return "Confirmé";
  if (appointment.status === "declined") return "Refusé";
  if (appointment.status === "cancelled") return "Annulé";
  if (appointment.status === "completed") return "Terminé";
  return appointment.requestedByCurrentUser ? "En attente de réponse" : "À confirmer";
}

export default function CallsScreen() {
  const tabSwipe = useTabSwipeNavigation("calls");
  const { accessToken, currentUser } = useSession();
  const { callHistory, members, localConversations, createPrivateConversation } = useExperience();
  const { visibleConversations, refreshConversations } = useMessaging();
  const {
    appointments,
    loading: loadingAppointments,
    lastError: appointmentError,
    createAppointment,
    respondAppointment,
    cancelAppointment
  } = useCallAppointments();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)),
    [accessToken]
  );
  const [openingMemberId, setOpeningMemberId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [schedulingMember, setSchedulingMember] = useState<AppUser | null>(null);
  const [scheduleMode, setScheduleMode] = useState<"audio" | "video">("audio");
  const [scheduleSubject, setScheduleSubject] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [invitedContact, setInvitedContact] = useState<PickedDeviceContact | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);
  const allPrivateConversations = useMemo(
    () => [...visibleConversations, ...localConversations].filter((conversation) => conversation.type === "direct"),
    [localConversations, visibleConversations]
  );

  const frequentMembers = useMemo(() => {
    const scores = new Map<string, number>();
    callHistory.forEach((call, index) => {
      scores.set(call.member.id, (scores.get(call.member.id) ?? 0) + Math.max(18, 80 - index * 12));
    });
    allPrivateConversations.forEach((conversation) => {
      const memberId = conversation.memberIds?.find((id) => id !== currentUser.id);
      if (!memberId) return;
      const timestamp = Date.parse(conversation.lastMessageAt ?? "");
      const ageDays = Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 86_400_000) : 30;
      scores.set(memberId, (scores.get(memberId) ?? 0) + Math.max(8, 46 - ageDays));
    });
    members.forEach((member) => {
      if (member.online) scores.set(member.id, (scores.get(member.id) ?? 0) + 8);
    });
    return members
      .filter((member) => member.id !== currentUser.id)
      .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
      .slice(0, 6);
  }, [allPrivateConversations, callHistory, currentUser.id, members]);

  const searchResults = useMemo(() => {
    const clean = query.trim().toLocaleLowerCase("fr");
    if (!clean) return [];
    return members
      .filter((member) => member.id !== currentUser.id)
      .filter((member) => `${member.name} ${member.company} ${member.city}`.toLocaleLowerCase("fr").includes(clean))
      .slice(0, 12);
  }, [currentUser.id, members, query]);

  const upcomingAppointments = useMemo(
    () => appointments.filter((appointment) =>
      appointment.status !== "cancelled" &&
      appointment.status !== "declined" &&
      appointment.status !== "completed" &&
      Date.parse(appointment.scheduledAt) > Date.now() - 60_000
    ),
    [appointments]
  );

  const resolveConversation = async (memberId: string) => {
    const existing = [...visibleConversations, ...localConversations].find(
      (conversation) => conversation.type === "direct" && conversation.memberIds?.includes(memberId)
    );
    if (existing) return existing;
    const conversation = api
      ? await api.createPrivateConversation([memberId])
      : createPrivateConversation({ memberIds: [memberId] });
    if (api) await refreshConversations();
    return conversation;
  };

  const startCall = async (memberId: string, mode: "audio" | "video", subject?: string) => {
    if (openingMemberId) return;
    setOpeningMemberId(memberId);
    try {
      const conversation = await resolveConversation(memberId);
      router.push({
        pathname: "/call/[id]",
        params: { id: conversation.id, mode, ...(subject ? { reason: subject } : {}) }
      });
    } finally {
      setOpeningMemberId(null);
    }
  };

  const openSchedule = (member: AppUser) => {
    const next = new Date(Date.now() + 30 * 60_000);
    next.setSeconds(0, 0);
    setSchedulingMember(member);
    setScheduleMode("audio");
    setScheduleSubject("");
    setScheduleDate(formatDateInput(next));
    setScheduleTime(formatTimeInput(next));
    setInvitedContact(null);
    setScheduleError(null);
  };

  const setQuickSlot = (kind: "30m" | "2h" | "tomorrow") => {
    const next = new Date();
    if (kind === "30m") next.setTime(next.getTime() + 30 * 60_000);
    if (kind === "2h") next.setTime(next.getTime() + 2 * 60 * 60_000);
    if (kind === "tomorrow") {
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
    }
    next.setSeconds(0, 0);
    setScheduleDate(formatDateInput(next));
    setScheduleTime(formatTimeInput(next));
  };

  const chooseExternalGuest = async () => {
    try {
      const contact = await pickDeviceContact();
      if (contact) setInvitedContact(contact);
    } catch {
      setScheduleError("Le sélecteur de contacts n’est pas disponible sur cet appareil.");
    }
  };

  const saveAppointment = async () => {
    if (!schedulingMember || savingSchedule) return;
    const date = parseDateTime(scheduleDate, scheduleTime);
    if (!date) {
      setScheduleError("Indiquez une date au format JJ/MM/AAAA et une heure HH:MM.");
      return;
    }
    setSavingSchedule(true);
    setScheduleError(null);
    try {
      const conversation = await resolveConversation(schedulingMember.id);
      const appointment = await createAppointment({
        memberId: schedulingMember.id,
        conversationId: conversation.id,
        mode: scheduleMode,
        subject: scheduleSubject,
        scheduledAt: date.toISOString(),
        invitedContactName: invitedContact?.name
      });
      if (invitedContact) {
        await shareAppointmentInvite({
          participantName: schedulingMember.name,
          subject: appointment.subject,
          scheduledAt: appointment.scheduledAt,
          contact: invitedContact
        });
      }
      setSchedulingMember(null);
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : "Le rendez-vous n’a pas pu être créé.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const inviteDeviceContact = async () => {
    const contact = await pickDeviceContact().catch(() => null);
    await shareConnexioInvite(contact ?? undefined);
  };

  return (
    <LinearGradient {...tabSwipe} colors={gradients.screen} style={styles.screen}>
      <BrandHeader title="Appels" subtitle="Trouvez, appelez ou programmez un échange en quelques secondes." />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              accessibilityLabel="Rechercher une personne à appeler"
              placeholder="Nom, entreprise ou ville…"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {query ? <Pressable onPress={() => setQuery("")} style={styles.smallIcon}><Ionicons name="close" size={18} color={colors.textMuted} /></Pressable> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Inviter un contact à utiliser Connexio" onPress={() => void inviteDeviceContact()} style={styles.inviteButton}>
            <Ionicons name="person-add-outline" size={20} color={colors.white} />
          </Pressable>
        </View>

        {query.trim() ? (
          <Section title="Résultats" meta={`${searchResults.length}`}>
            <View style={styles.peopleList}>
              {searchResults.length > 0 ? searchResults.map((member) => (
                <PersonActionRow key={member.id} member={member} busy={openingMemberId === member.id} onAudio={() => void startCall(member.id, "audio")} onVideo={() => void startCall(member.id, "video")} onSchedule={() => openSchedule(member)} />
              )) : <Text style={styles.emptyText}>Aucun membre ne correspond à cette recherche.</Text>}
            </View>
          </Section>
        ) : (
          <Section title="À appeler rapidement" meta="Fréquents">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frequentRow}>
              {frequentMembers.map((member) => (
                <Pressable key={member.id} accessibilityRole="button" accessibilityLabel={`Appeler ${member.name}`} onPress={() => void startCall(member.id, "audio")} onLongPress={() => openSchedule(member)} style={({ pressed }) => [styles.frequentCard, pressed && styles.pressed]}>
                  <StatusAvatar user={member} size={58} />
                  <Text numberOfLines={1} style={styles.frequentName}>{member.name.split(" ")[0]}</Text>
                  <Text numberOfLines={1} style={styles.frequentCompany}>{member.company}</Text>
                  <View style={styles.onlineLine}><View style={[styles.onlineDot, !member.online && styles.offlineDot]} /><Text style={styles.onlineText}>{member.online ? "Disponible" : "Planifier"}</Text></View>
                </Pressable>
              ))}
            </ScrollView>
          </Section>
        )}

        <Section title="Rendez-vous" meta={loadingAppointments ? "…" : `${upcomingAppointments.length} à venir`}>
          {appointmentError ? <Text style={styles.errorText}>{appointmentError}</Text> : null}
          {upcomingAppointments.length === 0 && !loadingAppointments ? (
            <View style={styles.emptyAppointment}>
              <Ionicons name="calendar-outline" size={24} color={colors.violet} />
              <View style={styles.emptyAppointmentText}><Text style={styles.emptyTitle}>Aucun appel programmé</Text><Text style={styles.emptyText}>Touchez le calendrier à côté d’un membre pour proposer un créneau.</Text></View>
            </View>
          ) : null}
          <View style={styles.appointments}>
            {upcomingAppointments.map((appointment) => {
              const member = memberById.get(appointment.memberId);
              if (!member) return null;
              const accepted = appointment.status === "accepted";
              const incomingPending = appointment.status === "pending" && !appointment.requestedByCurrentUser;
              return (
                <LinearGradient key={appointment.id} colors={gradients.glass} style={styles.appointmentCard}>
                  <StatusAvatar user={member} size={46} />
                  <View style={styles.appointmentContent}>
                    <Text numberOfLines={1} style={styles.appointmentSubject}>{appointment.subject}</Text>
                    <Text style={styles.appointmentMeta}>{member.name} · {new Date(appointment.scheduledAt).toLocaleString("fr-FR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                    <Text style={[styles.statusText, accepted && styles.statusAccepted]}>{appointmentStatusLabel(appointment)}</Text>
                    {appointment.invitedContactName ? <Text style={styles.guestText}>+ {appointment.invitedContactName}</Text> : null}
                  </View>
                  <View style={styles.appointmentActions}>
                    {incomingPending ? <>
                      <Pressable onPress={() => void respondAppointment(appointment.id, "accept", member.name)} style={[styles.miniAction, styles.acceptAction]}><Ionicons name="checkmark" size={18} color={colors.success} /></Pressable>
                      <Pressable onPress={() => void respondAppointment(appointment.id, "decline", member.name)} style={styles.miniAction}><Ionicons name="close" size={18} color={colors.danger} /></Pressable>
                    </> : null}
                    {accepted ? <Pressable onPress={() => void startCall(member.id, appointment.mode, appointment.subject)} style={[styles.miniAction, styles.callNow]}><Ionicons name={appointment.mode === "audio" ? "call" : "videocam"} size={18} color={colors.white} /></Pressable> : null}
                    <Pressable onPress={() => void shareAppointmentInvite({ participantName: member.name, subject: appointment.subject, scheduledAt: appointment.scheduledAt })} style={styles.miniAction}><Ionicons name="share-social-outline" size={18} color={colors.textSecondary} /></Pressable>
                    <Pressable onPress={() => void cancelAppointment(appointment.id)} style={styles.miniAction}><Ionicons name="trash-outline" size={17} color={colors.danger} /></Pressable>
                  </View>
                </LinearGradient>
              );
            })}
          </View>
        </Section>

        <Section title="Récents" meta={`${callHistory.length} appels`}>
          <View style={styles.list}>
            {callHistory.map((call) => (
              <LinearGradient key={call.id} colors={gradients.glass} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.row}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir le profil de ${call.member.name}`} onPress={() => router.push(`/profile/${encodeURIComponent(call.member.id)}`)} style={styles.identity}>
                  <StatusAvatar user={call.member} size={50} />
                  <View style={styles.rowContent}>
                    <Text style={styles.name} numberOfLines={1}>{call.member.name}</Text>
                    <View style={styles.callMetaLine}>
                      <Ionicons name={call.direction === "incoming" ? "arrow-down-outline" : call.direction === "outgoing" ? "arrow-up-outline" : "close-outline"} size={13} color={call.direction === "missed" ? colors.danger : colors.success} />
                      <Text style={[styles.callType, call.direction === "missed" && styles.callTypeMissed]} numberOfLines={1}>{call.type === "video" ? "Visio" : directionLabel(call.direction)}</Text>
                    </View>
                    <Text style={styles.time}>{new Date(call.occurredAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}{call.durationSeconds ? ` · ${Math.floor(call.durationSeconds / 60)} min` : ""}</Text>
                  </View>
                </Pressable>
                <View style={styles.actions}>
                  {openingMemberId === call.member.id ? <View style={styles.actionLoader}><ActivityIndicator size="small" color={colors.violet} /></View> : null}
                  <Pressable accessibilityRole="button" accessibilityLabel={`Appeler ${call.member.name}`} disabled={Boolean(openingMemberId)} onPress={() => void startCall(call.member.id, "audio")} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}><Ionicons name="call-outline" size={19} color={colors.text} /></Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Programmer un appel avec ${call.member.name}`} onPress={() => openSchedule(call.member)} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}><Ionicons name="calendar-outline" size={19} color={colors.violet} /></Pressable>
                </View>
              </LinearGradient>
            ))}
          </View>
        </Section>
      </ScrollView>

      <Modal transparent animationType="slide" visible={Boolean(schedulingMember)} onRequestClose={() => setSchedulingMember(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSchedulingMember(null)}>
          <Pressable style={styles.scheduleSheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            {schedulingMember ? <View style={styles.schedulePerson}><StatusAvatar user={schedulingMember} size={54} /><View style={styles.schedulePersonText}><Text style={styles.scheduleTitle}>Programmer avec {schedulingMember.name}</Text><Text style={styles.scheduleSubtitle}>L’objet sera visible dans la demande et les rappels.</Text></View></View> : null}
            <Text style={styles.fieldLabel}>Objet de l’appel</Text>
            <TextInput accessibilityLabel="Objet du rendez-vous d’appel" value={scheduleSubject} onChangeText={setScheduleSubject} maxLength={160} placeholder="Ex. Valider le partenariat pour septembre" placeholderTextColor={colors.textMuted} style={styles.subjectInput} />
            <View style={styles.modeRow}>
              {(["audio", "video"] as const).map((mode) => <Pressable key={mode} onPress={() => setScheduleMode(mode)} style={[styles.modeButton, scheduleMode === mode && styles.modeButtonActive]}><Ionicons name={mode === "audio" ? "call-outline" : "videocam-outline"} size={18} color={scheduleMode === mode ? colors.white : colors.textMuted} /><Text style={[styles.modeText, scheduleMode === mode && styles.modeTextActive]}>{mode === "audio" ? "Audio" : "Visio"}</Text></Pressable>)}
            </View>
            <Text style={styles.fieldLabel}>Créneau rapide</Text>
            <View style={styles.quickSlots}>
              <Pressable onPress={() => setQuickSlot("30m")} style={styles.slot}><Text style={styles.slotText}>Dans 30 min</Text></Pressable>
              <Pressable onPress={() => setQuickSlot("2h")} style={styles.slot}><Text style={styles.slotText}>Dans 2 h</Text></Pressable>
              <Pressable onPress={() => setQuickSlot("tomorrow")} style={styles.slot}><Text style={styles.slotText}>Demain 9 h</Text></Pressable>
            </View>
            <View style={styles.dateRow}>
              <View style={styles.dateField}><Text style={styles.fieldLabel}>Date</Text><TextInput accessibilityLabel="Date du rendez-vous" value={scheduleDate} onChangeText={setScheduleDate} keyboardType="numbers-and-punctuation" placeholder="JJ/MM/AAAA" placeholderTextColor={colors.textMuted} style={styles.dateInput} /></View>
              <View style={styles.timeField}><Text style={styles.fieldLabel}>Heure</Text><TextInput accessibilityLabel="Heure du rendez-vous" value={scheduleTime} onChangeText={setScheduleTime} keyboardType="numbers-and-punctuation" placeholder="HH:MM" placeholderTextColor={colors.textMuted} style={styles.dateInput} /></View>
            </View>
            <Pressable onPress={() => void chooseExternalGuest()} style={styles.contactPicker}><Ionicons name="person-add-outline" size={19} color={colors.violet} /><View style={styles.contactPickerText}><Text style={styles.contactPickerTitle}>{invitedContact ? invitedContact.name : "Inviter aussi un contact de mon téléphone"}</Text><Text style={styles.contactPickerHint}>{invitedContact ? "Le rendez-vous sera partagé après création." : "Le contact reste choisi localement par vous."}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></Pressable>
            {scheduleError ? <Text style={styles.errorText}>{scheduleError}</Text> : null}
            <Pressable disabled={savingSchedule || scheduleSubject.trim().length < 3} onPress={() => void saveAppointment()} style={[styles.primaryButton, (savingSchedule || scheduleSubject.trim().length < 3) && styles.disabled]}>{savingSchedule ? <ActivityIndicator color={colors.white} /> : <Ionicons name="calendar" size={20} color={colors.white} />}<Text style={styles.primaryText}>{savingSchedule ? "Envoi…" : "Envoyer la demande"}</Text></Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient>
  );
}

function Section({ title, meta, children }: { title: string; meta: string; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHead}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionMeta}>{meta}</Text></View>{children}</View>;
}

function PersonActionRow({ member, busy, onAudio, onVideo, onSchedule }: { member: AppUser; busy: boolean; onAudio: () => void; onVideo: () => void; onSchedule: () => void }) {
  return <View style={styles.personRow}><StatusAvatar user={member} size={48} /><View style={styles.personInfo}><Text numberOfLines={1} style={styles.name}>{member.name}</Text><Text numberOfLines={1} style={styles.personMeta}>{member.company} · {member.city}</Text></View>{busy ? <ActivityIndicator color={colors.violet} /> : <><Pressable onPress={onAudio} style={styles.personAction}><Ionicons name="call-outline" size={19} color={colors.text} /></Pressable><Pressable onPress={onVideo} style={styles.personAction}><Ionicons name="videocam-outline" size={19} color={colors.text} /></Pressable><Pressable onPress={onSchedule} style={styles.personAction}><Ionicons name="calendar-outline" size={19} color={colors.violet} /></Pressable></>}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 10, paddingTop: 12, paddingBottom: 28, gap: 18 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  searchBox: { flex: 1, minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 4 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 50, paddingHorizontal: 10, color: colors.text, fontSize: 15, fontWeight: "700" },
  smallIcon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  inviteButton: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.primary, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  section: { gap: 10 },
  sectionHead: { paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  sectionTitle: { ...typography.heading3, color: colors.text, fontWeight: "900" },
  sectionMeta: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  frequentRow: { gap: 9, paddingHorizontal: 1, paddingVertical: 2 },
  frequentCard: { width: 108, minHeight: 134, borderRadius: 22, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, padding: 10, alignItems: "center", justifyContent: "center" },
  frequentName: { marginTop: 8, width: "100%", color: colors.text, fontSize: 13, fontWeight: "900", textAlign: "center" },
  frequentCompany: { width: "100%", color: colors.textMuted, fontSize: 9, textAlign: "center", marginTop: 2 },
  onlineLine: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  offlineDot: { backgroundColor: colors.textMuted },
  onlineText: { color: colors.textSecondary, fontSize: 9, fontWeight: "700" },
  peopleList: { gap: 8 },
  personRow: { minHeight: 66, borderRadius: 19, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 9 },
  personInfo: { flex: 1, minWidth: 0 },
  personMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  personAction: { width: 44, height: 48, borderRadius: 15, backgroundColor: colors.glass, borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", justifyContent: "center" },
  appointments: { gap: 8 },
  appointmentCard: { minHeight: 82, borderRadius: 21, borderWidth: 1, borderColor: colors.borderSoft, padding: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  appointmentContent: { flex: 1, minWidth: 0 },
  appointmentSubject: { color: colors.text, fontSize: 14, fontWeight: "900" },
  appointmentMeta: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  statusText: { color: colors.orange, fontSize: 10, fontWeight: "900", marginTop: 4 },
  statusAccepted: { color: colors.success },
  guestText: { color: colors.violet, fontSize: 9, marginTop: 2 },
  appointmentActions: { alignItems: "center", justifyContent: "center", gap: 5 },
  miniAction: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.glass, alignItems: "center", justifyContent: "center" },
  acceptAction: { backgroundColor: "rgba(56,248,180,0.10)", borderColor: "rgba(56,248,180,0.28)" },
  callNow: { backgroundColor: colors.primary, borderColor: "rgba(255,255,255,0.2)" },
  emptyAppointment: { minHeight: 74, borderRadius: 20, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  emptyAppointmentText: { flex: 1 },
  emptyTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 16 },
  errorText: { color: colors.danger, fontSize: 11, lineHeight: 16 },
  list: { gap: spacing.sm },
  row: { width: "100%", minHeight: 80, paddingHorizontal: 11, paddingVertical: 12, borderRadius: 21, borderWidth: 1, borderColor: colors.borderSoft, flexDirection: "row", alignItems: "center", gap: 8 },
  identity: { flex: 1, minWidth: 0, minHeight: 54, flexDirection: "row", alignItems: "center", gap: 11 },
  rowContent: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: "900" },
  callMetaLine: { marginTop: 4, flexDirection: "row", alignItems: "center", gap: 8 },
  callType: { color: colors.textSecondary, fontSize: 11, lineHeight: 14, flexShrink: 1 },
  callTypeMissed: { color: colors.danger },
  time: { color: colors.textMuted, fontSize: 11, lineHeight: 12, marginTop: 2 },
  actions: { flexDirection: "row", gap: 7, flexShrink: 0, position: "relative" },
  actionButton: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.glass, alignItems: "center", justifyContent: "center" },
  actionLoader: { position: "absolute", zIndex: 3, inset: 0, borderRadius: 14, backgroundColor: "rgba(5,11,28,0.82)", alignItems: "center", justifyContent: "center" },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.82 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  scheduleSheet: { width: "100%", maxWidth: 680, alignSelf: "center", borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", backgroundColor: colors.border, marginBottom: 14 },
  schedulePerson: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  schedulePersonText: { flex: 1, minWidth: 0 },
  scheduleTitle: { ...typography.heading3, color: colors.text },
  scheduleSubtitle: { color: colors.textMuted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  fieldLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "900", marginBottom: 6 },
  subjectInput: { minHeight: 52, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 13, color: colors.text, fontSize: 14 },
  modeRow: { flexDirection: "row", gap: 8, marginVertical: 12 },
  modeButton: { flex: 1, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  modeButtonActive: { backgroundColor: colors.primary, borderColor: "rgba(255,255,255,0.22)" },
  modeText: { color: colors.textMuted, fontSize: 12, fontWeight: "900" },
  modeTextActive: { color: colors.white },
  quickSlots: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 12 },
  slot: { minHeight: 42, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: "rgba(107,79,234,0.36)", backgroundColor: "rgba(107,79,234,0.12)", alignItems: "center", justifyContent: "center" },
  slotText: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  dateRow: { flexDirection: "row", gap: 9 },
  dateField: { flex: 1 },
  timeField: { width: 110 },
  dateInput: { minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, color: colors.text, fontSize: 13 },
  contactPicker: { minHeight: 62, marginTop: 13, borderRadius: 17, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  contactPickerText: { flex: 1, minWidth: 0 },
  contactPickerTitle: { color: colors.text, fontSize: 12, fontWeight: "900" },
  contactPickerHint: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  primaryButton: { minHeight: 52, marginTop: 14, borderRadius: 17, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryText: { color: colors.white, fontWeight: "900" },
  disabled: { opacity: 0.45 }
});
