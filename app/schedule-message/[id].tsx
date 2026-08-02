import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { env } from "@/config/env";
import {
  canScheduleMessages,
  createScheduledMessage
} from "@/domain/scheduledMessages";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneGovernanceApi } from "@/services/api/governanceApi";
import { colors, gradients, spacing, typography } from "@/theme";
import type { ScheduledMessage } from "@/types/messaging";

interface SchedulePreset {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  resolve: (now: Date) => Date;
}

const PRESETS: SchedulePreset[] = [
  {
    id: "ten-minutes",
    label: "Dans 10 min",
    icon: "timer-outline",
    resolve: (now) => new Date(now.getTime() + 10 * 60 * 1000)
  },
  {
    id: "one-hour",
    label: "Dans 1 heure",
    icon: "time-outline",
    resolve: (now) => new Date(now.getTime() + 60 * 60 * 1000)
  },
  {
    id: "tomorrow-nine",
    label: "Demain à 9 h",
    icon: "sunny-outline",
    resolve: (now) => {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      return next;
    }
  },
  {
    id: "next-monday",
    label: "Lundi à 9 h",
    icon: "calendar-outline",
    resolve: (now) => {
      const next = new Date(now);
      const days = ((8 - next.getDay()) % 7) || 7;
      next.setDate(next.getDate() + days);
      next.setHours(9, 0, 0, 0);
      return next;
    }
  }
];

function first(value?: string | string[]): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function formatDateInput(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatTimeInput(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })
    .format(date)
    .replace(" h ", ":");
}

function parseLocalSchedule(dateValue: string, timeValue: string): Date {
  const dateMatch = dateValue.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/u);
  const timeMatch = timeValue.trim().match(/^(\d{1,2}):(\d{2})$/u);
  if (!dateMatch || !timeMatch) {
    throw new Error("Utilisez les formats JJ/MM/AAAA et HH:MM.");
  }
  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) {
    throw new Error("La date ou l’heure saisie est invalide.");
  }
  return date;
}

function formatScheduledDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default function ScheduleMessageScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const conversationId = first(params.id);
  const { currentUser, accessToken } = useSession();
  const { getConversation: getServerConversation } = useMessaging();
  const { getConversation: getLocalConversation } = useExperience();
  const { getCreatedGroup } = useGroupAdmin();
  const conversation =
    getServerConversation(conversationId) ??
    getLocalConversation(conversationId) ??
    getCreatedGroup(conversationId);
  const responsible = Boolean(
    conversation?.canManage ||
      conversation?.ownerId === currentUser.id ||
      conversation?.adminIds?.includes(currentUser.id)
  );
  const authorized = Boolean(
    conversation &&
      conversation.type !== "direct" &&
      canScheduleMessages(currentUser.role, responsible)
  );
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneGovernanceApi(accessToken)),
    [accessToken]
  );

  const initialDate = useMemo(() => PRESETS.find((preset) => preset.id === "tomorrow-nine")?.resolve(new Date()) ?? new Date(Date.now() + 86_400_000), []);
  const [body, setBody] = useState("");
  const [dateValue, setDateValue] = useState(formatDateInput(initialDate));
  const [timeValue, setTimeValue] = useState(formatTimeInput(initialDate));
  const [selectedPreset, setSelectedPreset] = useState("tomorrow-nine");
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authorized || !api || !conversationId) return;
    let cancelled = false;
    setLoading(true);
    void api
      .listScheduledMessages(conversationId)
      .then((items) => {
        if (!cancelled) {
          setScheduledMessages(
            items
              .filter((item) => item.status === "scheduled")
              .sort(
                (firstItem, secondItem) =>
                  Date.parse(firstItem.scheduledFor) -
                  Date.parse(secondItem.scheduledFor)
              )
          );
        }
      })
      .catch(() => {
        if (!cancelled) setScheduledMessages([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, authorized, conversationId]);

  const applyPreset = (preset: SchedulePreset) => {
    const date = preset.resolve(new Date());
    setSelectedPreset(preset.id);
    setDateValue(formatDateInput(date));
    setTimeValue(formatTimeInput(date));
  };

  const schedule = async () => {
    if (!authorized || saving) return;
    const cleanBody = body.trim();
    if (!cleanBody) {
      Alert.alert("Message requis", "Écrivez le message à envoyer automatiquement.");
      return;
    }

    setSaving(true);
    try {
      const scheduledFor = parseLocalSchedule(dateValue, timeValue).toISOString();
      const validated = createScheduledMessage({
        id: `scheduled-${Crypto.randomUUID()}`,
        conversationId,
        body: cleanBody,
        scheduledFor,
        createdByUserId: currentUser.id,
        role: currentUser.role,
        canManageConversation: responsible
      });
      const scheduled = api
        ? await api.scheduleMessage({
            conversationId,
            body: cleanBody,
            scheduledFor
          })
        : validated;
      setScheduledMessages((previous) =>
        [...previous, scheduled].sort(
          (firstItem, secondItem) =>
            Date.parse(firstItem.scheduledFor) -
            Date.parse(secondItem.scheduledFor)
        )
      );
      setBody("");
      Alert.alert(
        "Message programmé",
        `Il sera envoyé automatiquement ${formatScheduledDate(scheduled.scheduledFor)}.`
      );
    } catch (error) {
      Alert.alert(
        "Programmation impossible",
        error instanceof Error
          ? error.message
          : "Le message n’a pas pu être programmé."
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelScheduled = async (item: ScheduledMessage) => {
    if (cancellingId) return;
    setCancellingId(item.id);
    try {
      if (api) {
        await api.cancelScheduledMessage(conversationId, item.id);
      }
      setScheduledMessages((previous) =>
        previous.filter((scheduled) => scheduled.id !== item.id)
      );
    } catch (error) {
      Alert.alert(
        "Annulation impossible",
        error instanceof Error
          ? error.message
          : "Le message programmé n’a pas pu être annulé."
      );
    } finally {
      setCancellingId(null);
    }
  };

  if (!conversation) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.center}>
        <Ionicons name="calendar-outline" size={38} color={colors.textMuted} />
        <Text style={styles.title}>Groupe introuvable</Text>
        <Text style={styles.description}>
          Ce groupe n’existe plus ou n’est plus accessible avec votre statut.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Retour</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  if (!authorized) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.center}>
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed-outline" size={31} color={colors.orange} />
        </View>
        <Text style={styles.title}>Programmation non autorisée</Text>
        <Text style={styles.description}>
          Seuls les Capitaines, Amiraux et Visionnaires responsables de ce groupe
          peuvent programmer des messages.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Retour au groupe</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, spacing.sm),
            paddingLeft: spacing.sm + insets.left,
            paddingRight: spacing.sm + insets.right
          }
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>
            Programmer un message
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {conversation.name}
          </Text>
        </View>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.success} />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingLeft: spacing.md + insets.left,
            paddingRight: spacing.md + insets.right,
            paddingBottom: Math.max(insets.bottom, spacing.xl)
          }
        ]}
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={21} color={colors.orange} />
          <Text style={styles.infoText}>
            Le message sera envoyé par Neptune à l’heure choisie, même si votre
            téléphone ou votre ordinateur est éteint.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Message</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Ex. Rappel : notre atelier commence demain à 9 h."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={4_000}
          textAlignVertical="top"
          style={styles.editor}
        />
        <Text style={styles.counter}>{body.length}/4 000</Text>

        <Text style={styles.sectionTitle}>Quand l’envoyer ?</Text>
        <View style={styles.presetGrid}>
          {PRESETS.map((preset) => {
            const active = selectedPreset === preset.id;
            return (
              <Pressable
                key={preset.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => applyPreset(preset)}
                style={[styles.preset, active && styles.presetActive]}
              >
                <Ionicons
                  name={preset.icon}
                  size={19}
                  color={active ? colors.orange : colors.textMuted}
                />
                <Text style={[styles.presetText, active && styles.presetTextActive]}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              value={dateValue}
              onChangeText={(value) => {
                setDateValue(value);
                setSelectedPreset("");
              }}
              placeholder="JJ/MM/AAAA"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              style={styles.dateInput}
            />
          </View>
          <View style={styles.timeField}>
            <Text style={styles.fieldLabel}>Heure</Text>
            <TextInput
              value={timeValue}
              onChangeText={(value) => {
                setTimeValue(value);
                setSelectedPreset("");
              }}
              placeholder="HH:MM"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={styles.dateInput}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Programmer l’envoi automatique"
          accessibilityState={{ busy: saving, disabled: saving }}
          disabled={saving}
          onPress={() => void schedule()}
          style={[styles.primaryButton, saving && styles.disabled]}
        >
          {saving ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Ionicons name="calendar" size={20} color={colors.white} />
          )}
          <Text style={styles.primaryText}>
            {saving ? "Programmation…" : "Programmer l’envoi"}
          </Text>
        </Pressable>

        <View style={styles.scheduledHeader}>
          <Text style={styles.sectionTitle}>Envois à venir</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{scheduledMessages.length}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingList}>
            <ActivityIndicator color={colors.violet} />
          </View>
        ) : scheduledMessages.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-clear-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Aucun message programmé</Text>
            <Text style={styles.emptyText}>
              Les prochains envois automatiques apparaîtront ici.
            </Text>
          </View>
        ) : (
          <View style={styles.scheduledList}>
            {scheduledMessages.map((item) => (
              <View key={item.id} style={styles.scheduledCard}>
                <View style={styles.scheduledIcon}>
                  <Ionicons name="time-outline" size={20} color={colors.orange} />
                </View>
                <View style={styles.scheduledContent}>
                  <Text style={styles.scheduledDate}>
                    {formatScheduledDate(item.scheduledFor)}
                  </Text>
                  <Text style={styles.scheduledBody} numberOfLines={3}>
                    {item.body}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Annuler ce message programmé"
                  accessibilityState={{ busy: cancellingId === item.id }}
                  disabled={Boolean(cancellingId)}
                  onPress={() => void cancelScheduled(item)}
                  style={styles.cancelButton}
                >
                  {cancellingId === item.id ? (
                    <ActivityIndicator size="small" color={colors.danger} />
                  ) : (
                    <Ionicons name="trash-outline" size={19} color={colors.danger} />
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex: 1,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md
  },
  lockIcon: {
    width: 68,
    height: 68,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,177,131,0.12)"
  },
  title: { ...typography.heading2, color: colors.text, textAlign: "center" },
  description: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 480
  },
  header: {
    minHeight: 68,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center"
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { ...typography.heading3, color: colors.text },
  headerSubtitle: { color: colors.textMuted, fontSize: 9.5, marginTop: 2 },
  roleBadge: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.successSoft
  },
  content: { width: "100%", maxWidth: 680, alignSelf: "center" },
  infoCard: {
    marginTop: spacing.md,
    padding: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(244,177,131,0.24)",
    backgroundColor: "rgba(244,177,131,0.10)",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9
  },
  infoText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: 8
  },
  editor: {
    minHeight: 142,
    padding: spacing.md,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    color: colors.text,
    ...typography.body
  },
  counter: { color: colors.textMuted, fontSize: 9, textAlign: "right", marginTop: 4 },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preset: {
    minWidth: "47%",
    flexGrow: 1,
    minHeight: 48,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  presetActive: {
    borderColor: colors.violet,
    backgroundColor: "rgba(107,79,234,0.22)"
  },
  presetText: { color: colors.textMuted, fontSize: 10.5, fontWeight: "800" },
  presetTextActive: { color: colors.text },
  dateRow: { marginTop: 10, flexDirection: "row", gap: 9 },
  dateField: { flex: 1.45, minWidth: 0 },
  timeField: { flex: 0.8, minWidth: 0 },
  fieldLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "900", marginBottom: 5 },
  dateInput: {
    minHeight: 50,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 13,
    fontWeight: "800"
  },
  primaryButton: {
    minHeight: 54,
    marginTop: spacing.md,
    borderRadius: 19,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  primaryText: { color: colors.white, fontSize: 13, fontWeight: "900" },
  secondaryButton: {
    minHeight: 48,
    minWidth: 140,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryText: { color: colors.text, fontSize: 12, fontWeight: "900" },
  scheduledHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  countBadge: {
    minWidth: 26,
    height: 26,
    marginTop: spacing.lg,
    marginBottom: 8,
    paddingHorizontal: 7,
    borderRadius: 13,
    backgroundColor: "rgba(107,79,234,0.20)",
    alignItems: "center",
    justifyContent: "center"
  },
  countText: { color: colors.text, fontSize: 10, fontWeight: "900" },
  loadingList: { minHeight: 96, alignItems: "center", justifyContent: "center" },
  emptyCard: {
    minHeight: 144,
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 7
  },
  emptyTitle: { color: colors.text, fontSize: 12, fontWeight: "900" },
  emptyText: { color: colors.textMuted, fontSize: 10, textAlign: "center" },
  scheduledList: { gap: 8 },
  scheduledCard: {
    minHeight: 84,
    padding: 11,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  scheduledIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "rgba(244,177,131,0.12)",
    alignItems: "center",
    justifyContent: "center"
  },
  scheduledContent: { flex: 1, minWidth: 0 },
  scheduledDate: { color: colors.orange, fontSize: 9.5, fontWeight: "900" },
  scheduledBody: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 4 },
  cancelButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.55 }
});
