import { Text } from "@/components/LocalizedText";
import {
  Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router,
  useLocalSearchParams } from "expo-router";
import { useMemo,
  useState } from "react";
import { ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionConfirmationOverlay } from "@/components/ActionConfirmationOverlay";
import { StatusAvatar } from "@/components/StatusAvatar";
import { ThemeModeButton } from "@/components/ThemeModeButton";
import { VoicePromptInput } from "@/components/VoicePromptInput";
import { env } from "@/config/env";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useExperience } from "@/providers/ExperienceProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useScheduledCalls } from "@/providers/ScheduledCallsProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import { DeviceContactPermissionError, pickDeviceContact } from "@/services/contacts/deviceContactPicker";
import { colors, spacing, typography } from "@/theme";
import type { SelectedDeviceContact } from "@/types/deviceContacts";

const DAY_COUNT = 7;
const TIMES = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];

function first(value?: string | string[]) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function makeDate(dayKey: string, time: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year!, month! - 1, day!, hour!, minute!, 0, 0);
}

export default function ScheduleCallScreen() {
  const params = useLocalSearchParams<{ memberId?: string | string[]; mode?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const memberId = first(params.memberId);
  const initialMode = first(params.mode) === "audio" ? "audio" : "video";
  const { accessToken, currentUser } = useSession();
  const { members, localConversations, createPrivateConversation } = useExperience();
  const { visibleConversations, refreshConversations } = useMessaging();
  const { createScheduledCall } = useScheduledCalls();
  const member = members.find((item) => item.id === memberId);
  const api = useMemo(() => env.mockMode ? null : new NeptuneExperienceApi(accessToken), [accessToken]);
  const days = useMemo(() => Array.from({ length: DAY_COUNT }, (_, index) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + index); return date; }), []);
  const [day, setDay] = useState(dateKey(days[0]!));
  const [time, setTime] = useState("14:00");
  const [mode, setMode] = useState<"audio" | "video">(initialMode);
  const [subject, setSubject] = useState("");
  const [guest, setGuest] = useState<SelectedDeviceContact | null>(null);
  const [pickingGuest, setPickingGuest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactsSettingsRequired, setContactsSettingsRequired] = useState(false);

  if (!member || member.id === currentUser.id) {
    return <LinearGradient colors={theme.pageGradient} style={styles.centered}><Ionicons name="calendar-outline" size={34} color={theme.pageTextMuted} /><Text style={[styles.title, { color: theme.pageText }]}>Membre introuvable</Text><Pressable onPress={() => router.back()} style={styles.simpleButton}><Text style={styles.simpleText}>Retour</Text></Pressable></LinearGradient>;
  }

  const ensureConversation = async () => {
    const existing = [...visibleConversations, ...localConversations].find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(member.id));
    if (existing) return existing;
    if (api) { const created = await api.createPrivateConversation([member.id]); await refreshConversations(); return created; }
    return createPrivateConversation({ memberIds: [member.id] });
  };

  const scheduledAt = makeDate(day, time);
  const validDate = scheduledAt.getTime() > Date.now() + 60_000;
  const canSubmit = validDate && subject.trim().length >= 3 && !saving && !confirmed;

  const pickGuest = async () => {
    if (pickingGuest) return;
    setPickingGuest(true);
    setError(null);
    setContactsSettingsRequired(false);
    try {
      const selected = await pickDeviceContact();
      if (selected) setGuest(selected);
      else setError("Aucun contact sélectionné. Sur le web, cette fonction est disponible uniquement dans l’application mobile.");
    } catch (cause) {
      if (cause instanceof DeviceContactPermissionError) {
        setContactsSettingsRequired(!cause.canAskAgain);
        setError(cause.canAskAgain ? "L’accès aux contacts a été refusé. Vous pouvez réessayer si vous souhaitez ajouter un invité." : "L’accès aux contacts est bloqué. Réactivez l’autorisation Contacts dans les réglages de Connexio.");
      } else setError("Impossible d’ouvrir les contacts du téléphone. Réessayez après avoir vérifié l’autorisation Contacts.");
    } finally { setPickingGuest(false); }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const conversation = await ensureConversation();
      await createScheduledCall({
        memberId: member.id,
        conversationId: conversation.id,
        mode,
        subject: subject.trim(),
        scheduledAt: scheduledAt.toISOString(),
        guestContacts: guest ? [{ id: guest.id, displayName: guest.displayName, phone: guest.phone, email: guest.email }] : undefined
      }, member.name);
      setConfirmed(true);
      await new Promise<void>((resolve) => setTimeout(resolve, reducedMotion ? 260 : 900));
      router.replace("/(tabs)/calls");
    } catch (cause) {
      setConfirmed(false);
      setError(cause instanceof Error ? cause.message : "Le rendez-vous n’a pas pu être programmé.");
    } finally { setSaving(false); }
  };

  const heading = { color: theme.pageText };
  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), backgroundColor: theme.shellBackground, borderBottomColor: theme.shellBorder }]}>
        <Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <View style={styles.headerCopy}><Text style={[styles.headerTitle, heading]}>Programmer un appel</Text><Text style={[styles.headerSubtitle, { color: theme.pageTextMuted }]}>Rapide, clair, avec un objet précis</Text></View><ThemeModeButton />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 106 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.memberCard, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><StatusAvatar user={member} size={62} /><View style={styles.memberCopy}><Text style={[styles.memberName, { color: theme.pageText }]}>{member.name}</Text><Text style={[styles.memberMeta, { color: theme.pageTextMuted }]}>{member.company || member.city}</Text></View></View>
        <Text style={[styles.sectionTitle, heading]}>Type d’appel</Text>
        <View style={styles.modeRow}>{(["audio", "video"] as const).map((value) => { const active = mode === value; return <Pressable key={value} onPress={() => setMode(value)} style={[styles.modeButton, { borderColor: active ? theme.violet : theme.borderSoft, backgroundColor: active ? colors.primary : theme.surface }]}><Ionicons name={value === "audio" ? "call" : "videocam"} size={20} color={active ? colors.white : theme.pageTextMuted} /><Text style={[styles.modeText, { color: active ? colors.white : theme.pageTextMuted }]}>{value === "audio" ? "Audio" : "Visio"}</Text></Pressable>; })}</View>
        <Text style={[styles.sectionTitle, heading]}>Quel jour ?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>{days.map((date, index) => { const key = dateKey(date); const active = key === day; return <Pressable key={key} onPress={() => setDay(key)} style={[styles.dayCard, { borderColor: active ? theme.violet : theme.borderSoft, backgroundColor: active ? theme.violetSoft : theme.surface }]}><Text style={[styles.dayName, { color: active ? theme.violet : theme.pageTextMuted }]}>{index === 0 ? "Aujourd’hui" : index === 1 ? "Demain" : date.toLocaleDateString("fr-FR", { weekday: "short" })}</Text><Text style={[styles.dayNumber, { color: active ? theme.violet : theme.pageText }]}>{date.getDate()}</Text><Text style={[styles.dayMonth, { color: active ? theme.violet : theme.pageTextMuted }]}>{date.toLocaleDateString("fr-FR", { month: "short" })}</Text></Pressable>; })}</ScrollView>
        <Text style={[styles.sectionTitle, heading]}>À quelle heure ?</Text>
        <View style={styles.timeGrid}>{TIMES.map((value) => { const active = value === time; const disabled = makeDate(day, value).getTime() <= Date.now() + 60_000; return <Pressable key={value} disabled={disabled} onPress={() => setTime(value)} style={[styles.timeChip, { borderColor: active ? theme.violet : theme.borderSoft, backgroundColor: active ? colors.primary : theme.surface }, disabled && styles.disabled]}><Text style={[styles.timeText, { color: active ? colors.white : theme.pageTextSecondary }]}>{value}</Text></Pressable>; })}</View>
        <Text style={[styles.sectionTitle, heading]}>Objet du rendez-vous</Text>
        <View style={[styles.subjectCard, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><VoicePromptInput value={subject} onChangeText={setSubject} placeholder="Ex. Valider le partenariat" maxLength={160} onSubmit={() => void submit()} /><Text style={[styles.helper, { color: theme.pageTextMuted }]}>Cet objet sera affiché dans le rendez-vous, les rappels et au moment de l’appel.</Text></View>
        <Text style={[styles.sectionTitle, heading]}>Invité externe <Text style={[styles.optional, { color: theme.pageTextMuted }]}>(facultatif)</Text></Text>
        {guest ? <View style={[styles.guestCard, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><View style={[styles.guestAvatar, { backgroundColor: theme.accentSoft }]}><Text style={[styles.guestInitial, { color: theme.accent }]}>{guest.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={styles.guestCopy}><Text style={[styles.guestName, { color: theme.pageText }]}>{guest.displayName}</Text><Text numberOfLines={1} style={[styles.guestMeta, { color: theme.pageTextMuted }]}>{[guest.phone, guest.email].filter(Boolean).join(" · ") || "Contact du téléphone"}</Text></View><Pressable accessibilityLabel="Retirer l’invité" onPress={() => setGuest(null)} style={styles.removeGuest}><Ionicons name="close-circle" size={23} color={theme.pageTextMuted} /></Pressable></View> : <Pressable accessibilityRole="button" onPress={() => void pickGuest()} disabled={pickingGuest} style={[styles.addGuest, { borderColor: theme.violet, backgroundColor: theme.violetSoft }]}>{pickingGuest ? <ActivityIndicator color={theme.violet} /> : <><Ionicons name="person-add-outline" size={20} color={theme.violet} /><View style={styles.addGuestCopy}><Text style={[styles.addGuestTitle, { color: theme.pageText }]}>Choisir dans mes contacts</Text><Text style={[styles.addGuestText, { color: theme.pageTextMuted }]}>Seule la personne choisie sera utilisée pour cette invitation.</Text></View><Ionicons name="chevron-forward" size={18} color={theme.pageTextMuted} /></>}</Pressable>}
        <View style={[styles.reminderCard, { borderColor: theme.orange, backgroundColor: theme.orangeSoft }]}><Ionicons name="notifications-outline" size={22} color={theme.orange} /><View style={styles.reminderCopy}><Text style={[styles.reminderTitle, { color: theme.pageText }]}>Rappels intelligents</Text><Text style={[styles.reminderText, { color: theme.pageTextMuted }]}>Selon le délai restant : J-1, H-1 et 10 minutes avant. Les rappels inutiles sont automatiquement ignorés.</Text></View></View>
        {error ? <Text accessibilityRole="alert" style={[styles.error, { backgroundColor: theme.dangerSoft, color: theme.danger }]}>{error}</Text> : null}
        {contactsSettingsRequired ? <Pressable onPress={() => void Linking.openSettings()} style={[styles.settingsButton, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}><Ionicons name="settings-outline" size={18} color={theme.pageText} /><Text style={[styles.settingsText, { color: theme.pageText }]}>Ouvrir les réglages de Connexio</Text></Pressable> : null}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: theme.shellBackground, borderTopColor: theme.shellBorder }]}><View style={styles.summary}><Text style={[styles.summaryLabel, { color: theme.pageTextMuted }]}>Rendez-vous</Text><Text style={[styles.summaryValue, { color: theme.pageText }]}>{scheduledAt.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })} · {time}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Envoyer la demande d’appel" disabled={!canSubmit} onPress={() => void submit()} style={[styles.submit, !canSubmit && styles.disabled]}>{saving ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="paper-plane" size={19} color={colors.white} /><Text style={styles.submitText}>Programmer</Text></>}</Pressable></View>
      <ActionConfirmationOverlay visible={confirmed} icon="calendar" title="Rendez-vous programmé" message={`Invitation envoyée à ${member.name}.`} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl }, header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, gap: 4 }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "center", minWidth: 0 }, headerTitle: { ...typography.heading3 }, headerSubtitle: { fontSize: 11, marginTop: 2 }, content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: spacing.md }, memberCard: { minHeight: 82, padding: 12, borderRadius: 22, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 13 }, memberCopy: { flex: 1 }, memberName: { ...typography.heading2 }, memberMeta: { fontSize: 13, marginTop: 3 }, sectionTitle: { ...typography.heading3, marginTop: spacing.lg, marginBottom: 9 }, optional: { fontSize: 11, fontWeight: "700" }, modeRow: { flexDirection: "row", gap: 9 }, modeButton: { flex: 1, minHeight: 52, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, modeText: { fontSize: 14, fontWeight: "900" }, dayRow: { gap: 8, paddingRight: 12 }, dayCard: { width: 82, minHeight: 94, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" }, dayName: { fontSize: 11, fontWeight: "800", textTransform: "capitalize" }, dayNumber: { fontSize: 25, lineHeight: 30, fontWeight: "900", marginVertical: 2 }, dayMonth: { fontSize: 11, textTransform: "capitalize" }, timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, timeChip: { minWidth: 72, minHeight: 48, paddingHorizontal: 13, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" }, timeText: { fontSize: 13, fontWeight: "900" }, subjectCard: { padding: 12, borderRadius: 20, borderWidth: 1 }, helper: { fontSize: 11, lineHeight: 16, marginTop: 8 }, addGuest: { minHeight: 72, padding: 12, borderRadius: 20, borderWidth: 1, borderStyle: "dashed", flexDirection: "row", alignItems: "center", gap: 10 }, addGuestCopy: { flex: 1 }, addGuestTitle: { fontSize: 13, fontWeight: "900" }, addGuestText: { fontSize: 11, lineHeight: 15, marginTop: 2 }, guestCard: { minHeight: 72, padding: 10, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, guestAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" }, guestInitial: { fontSize: 18, fontWeight: "900" }, guestCopy: { flex: 1, minWidth: 0 }, guestName: { fontSize: 14, fontWeight: "900" }, guestMeta: { fontSize: 11, marginTop: 2 }, removeGuest: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, reminderCard: { marginTop: spacing.lg, minHeight: 82, padding: 13, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 11 }, reminderCopy: { flex: 1 }, reminderTitle: { fontSize: 14, fontWeight: "900" }, reminderText: { fontSize: 12, lineHeight: 17, marginTop: 3 }, error: { marginTop: 10, padding: 11, borderRadius: 16, textAlign: "center" }, settingsButton: { minHeight: 48, marginTop: 8, borderWidth: 1, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 12 }, settingsText: { fontSize: 12, fontWeight: "900" }, footer: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 82, paddingHorizontal: spacing.md, paddingTop: 10, borderTopWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 }, summary: { flex: 1, minWidth: 0 }, summaryLabel: { fontSize: 10, fontWeight: "800" }, summaryValue: { fontSize: 14, fontWeight: "900", marginTop: 2 }, submit: { minWidth: 124, minHeight: 52, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, submitText: { color: colors.white, fontSize: 14, fontWeight: "900" }, disabled: { opacity: 0.4 }, title: { ...typography.heading2 }, simpleButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }, simpleText: { color: colors.white, fontWeight: "900" }
});
