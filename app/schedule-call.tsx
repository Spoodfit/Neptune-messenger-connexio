import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { StatusAvatar } from "@/components/StatusAvatar";
import { VoicePromptInput } from "@/components/VoicePromptInput";
import { env } from "@/config/env";
import { useExperience } from "@/providers/ExperienceProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useScheduledCalls } from "@/providers/ScheduledCallsProvider";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import { colors, gradients, spacing, typography } from "@/theme";

const DAY_COUNT = 7;
const TIMES = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeDate(dayKey: string, time: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year!, month! - 1, day!, hour!, minute!, 0, 0);
}

export default function ScheduleCallScreen() {
  const params = useLocalSearchParams<{ memberId?: string | string[]; mode?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const memberId = first(params.memberId);
  const initialMode = first(params.mode) === "audio" ? "audio" : "video";
  const { accessToken, currentUser } = useSession();
  const { members, localConversations, createPrivateConversation } = useExperience();
  const { visibleConversations, refreshConversations } = useMessaging();
  const { createScheduledCall } = useScheduledCalls();
  const member = members.find((item) => item.id === memberId);
  const api = useMemo(() => env.mockMode ? null : new NeptuneExperienceApi(accessToken), [accessToken]);
  const days = useMemo(() => Array.from({ length: DAY_COUNT }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + index);
    return date;
  }), []);
  const [day, setDay] = useState(dateKey(days[0]!));
  const [time, setTime] = useState("14:00");
  const [mode, setMode] = useState<"audio" | "video">(initialMode);
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!member || member.id === currentUser.id) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.centered}>
        <Ionicons name="calendar-outline" size={34} color={colors.textMuted} />
        <Text style={styles.title}>Membre introuvable</Text>
        <Pressable onPress={() => router.back()} style={styles.simpleButton}><Text style={styles.simpleText}>Retour</Text></Pressable>
      </LinearGradient>
    );
  }

  const ensureConversation = async () => {
    const existing = [...visibleConversations, ...localConversations].find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(member.id));
    if (existing) return existing;
    if (api) {
      const created = await api.createPrivateConversation([member.id]);
      await refreshConversations();
      return created;
    }
    return createPrivateConversation({ memberIds: [member.id] });
  };

  const scheduledAt = makeDate(day, time);
  const validDate = scheduledAt.getTime() > Date.now() + 60_000;
  const canSubmit = validDate && subject.trim().length >= 3 && !saving;

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
        scheduledAt: scheduledAt.toISOString()
      }, member.name);
      router.replace("/(tabs)/calls");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le rendez-vous n’a pas pu être programmé.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={colors.text} /></Pressable>
        <View style={styles.headerCopy}><Text style={styles.headerTitle}>Programmer un appel</Text><Text style={styles.headerSubtitle}>Rapide, clair, avec un objet précis</Text></View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 18) + 96 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.memberCard}>
          <StatusAvatar user={member} size={62} showBadge />
          <View style={styles.memberCopy}><Text style={styles.memberName}>{member.name}</Text><Text style={styles.memberMeta}>{member.company || member.city}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Type d’appel</Text>
        <View style={styles.modeRow}>
          {(["audio", "video"] as const).map((value) => {
            const active = mode === value;
            return <Pressable key={value} onPress={() => setMode(value)} style={[styles.modeButton, active && styles.modeButtonActive]}><Ionicons name={value === "audio" ? "call" : "videocam"} size={20} color={active ? colors.white : colors.textMuted} /><Text style={[styles.modeText, active && styles.modeTextActive]}>{value === "audio" ? "Audio" : "Visio"}</Text></Pressable>;
          })}
        </View>

        <Text style={styles.sectionTitle}>Quel jour ?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
          {days.map((date, index) => {
            const key = dateKey(date);
            const active = key === day;
            return <Pressable key={key} onPress={() => setDay(key)} style={[styles.dayCard, active && styles.dayCardActive]}><Text style={[styles.dayName, active && styles.dayNameActive]}>{index === 0 ? "Aujourd’hui" : index === 1 ? "Demain" : date.toLocaleDateString("fr-FR", { weekday: "short" })}</Text><Text style={[styles.dayNumber, active && styles.dayNumberActive]}>{date.getDate()}</Text><Text style={[styles.dayMonth, active && styles.dayNameActive]}>{date.toLocaleDateString("fr-FR", { month: "short" })}</Text></Pressable>;
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>À quelle heure ?</Text>
        <View style={styles.timeGrid}>
          {TIMES.map((value) => {
            const active = value === time;
            const disabled = makeDate(day, value).getTime() <= Date.now() + 60_000;
            return <Pressable key={value} disabled={disabled} onPress={() => setTime(value)} style={[styles.timeChip, active && styles.timeChipActive, disabled && styles.disabled]}><Text style={[styles.timeText, active && styles.timeTextActive]}>{value}</Text></Pressable>;
          })}
        </View>

        <Text style={styles.sectionTitle}>Objet du rendez-vous</Text>
        <View style={styles.subjectCard}>
          <VoicePromptInput value={subject} onChangeText={setSubject} placeholder="Ex. Valider le partenariat avant la conférence" maxLength={160} onSubmit={() => void submit()} />
          <Text style={styles.helper}>Cet objet sera affiché dans le rendez-vous, les rappels et au moment de l’appel.</Text>
        </View>

        <View style={styles.reminderCard}>
          <Ionicons name="notifications-outline" size={22} color={colors.orange} />
          <View style={styles.reminderCopy}><Text style={styles.reminderTitle}>Rappels intelligents</Text><Text style={styles.reminderText}>Selon le délai restant : J-1, H-1 et 10 minutes avant. Les rappels inutiles sont automatiquement ignorés.</Text></View>
        </View>

        {env.mockMode ? <View style={styles.mockInfo}><Ionicons name="flask-outline" size={18} color={colors.violet} /><Text style={styles.mockText}>Standalone : la demande est enregistrée localement. Vous pourrez simuler son acceptation depuis l’écran Appels. Le backend remplacera cette simulation par une vraie invitation.</Text></View> : null}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.summary}><Text style={styles.summaryLabel}>Rendez-vous</Text><Text style={styles.summaryValue}>{scheduledAt.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short" })} · {time}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Envoyer la demande d’appel" disabled={!canSubmit} onPress={() => void submit()} style={[styles.submit, !canSubmit && styles.disabled]}>{saving ? <ActivityIndicator color={colors.white} /> : <><Ionicons name="paper-plane" size={19} color={colors.white} /><Text style={styles.submitText}>Envoyer</Text></>}</Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: spacing.xl },
  header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.borderSoft }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, alignItems: "center" }, headerTitle: { ...typography.heading3, color: colors.text }, headerSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: spacing.md },
  memberCard: { minHeight: 82, padding: 12, borderRadius: 22, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 13 }, memberCopy: { flex: 1 }, memberName: { ...typography.heading2, color: colors.text }, memberMeta: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  sectionTitle: { ...typography.heading3, color: colors.text, marginTop: spacing.lg, marginBottom: 9 },
  modeRow: { flexDirection: "row", gap: 9 }, modeButton: { flex: 1, minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, modeButtonActive: { backgroundColor: colors.primary, borderColor: colors.violet }, modeText: { color: colors.textMuted, fontSize: 14, fontWeight: "900" }, modeTextActive: { color: colors.white },
  dayRow: { gap: 8, paddingRight: 12 }, dayCard: { width: 82, minHeight: 94, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, dayCardActive: { borderColor: colors.violet, backgroundColor: "rgba(107,79,234,0.24)" }, dayName: { color: colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "capitalize" }, dayNameActive: { color: colors.textSecondary }, dayNumber: { color: colors.text, fontSize: 25, lineHeight: 30, fontWeight: "900", marginVertical: 2 }, dayNumberActive: { color: colors.white }, dayMonth: { color: colors.textMuted, fontSize: 11, textTransform: "capitalize" },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, timeChip: { minWidth: 72, minHeight: 46, paddingHorizontal: 13, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }, timeChipActive: { backgroundColor: colors.primary, borderColor: colors.violet }, timeText: { color: colors.textSecondary, fontSize: 13, fontWeight: "900" }, timeTextActive: { color: colors.white },
  subjectCard: { padding: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface }, helper: { color: colors.textMuted, fontSize: 11, lineHeight: 16, marginTop: 8 },
  reminderCard: { marginTop: spacing.lg, minHeight: 82, padding: 13, borderRadius: 20, borderWidth: 1, borderColor: "rgba(244,177,131,0.22)", backgroundColor: "rgba(244,177,131,0.07)", flexDirection: "row", alignItems: "center", gap: 11 }, reminderCopy: { flex: 1 }, reminderTitle: { color: colors.text, fontSize: 14, fontWeight: "900" }, reminderText: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  mockInfo: { marginTop: 10, padding: 12, borderRadius: 18, backgroundColor: "rgba(107,79,234,0.09)", flexDirection: "row", gap: 9 }, mockText: { flex: 1, color: colors.textMuted, fontSize: 11, lineHeight: 16 }, error: { marginTop: 10, padding: 11, borderRadius: 16, backgroundColor: colors.dangerSoft, color: colors.danger, textAlign: "center" },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 82, paddingHorizontal: spacing.md, paddingTop: 10, backgroundColor: "rgba(2,7,19,0.97)", borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", gap: 12 }, summary: { flex: 1 }, summaryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800" }, summaryValue: { color: colors.text, fontSize: 14, fontWeight: "900", marginTop: 2 }, submit: { minWidth: 116, minHeight: 52, paddingHorizontal: 18, borderRadius: 18, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, submitText: { color: colors.white, fontSize: 14, fontWeight: "900" }, disabled: { opacity: 0.4 },
  title: { ...typography.heading2, color: colors.text }, simpleButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }, simpleText: { color: colors.white, fontWeight: "900" }
});
