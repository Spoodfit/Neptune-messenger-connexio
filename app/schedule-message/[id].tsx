import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import {
  Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { LinearGradient } from "expo-linear-gradient";
import { router,
  useLocalSearchParams } from "expo-router";
import { useEffect,
  useMemo,
  useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppAlert } from "@/services/ui/AppAlert";

import { ThemeModeButton } from "@/components/ThemeModeButton";
import { env } from "@/config/env";
import {
  canManageAllGroupAutomations,
  canScheduleMessages
} from "@/domain/accessPolicy";
import { createScheduledMessage } from "@/domain/scheduledMessages";
import { useExperience } from "@/providers/ExperienceProvider";
import { useGroupAdmin } from "@/providers/GroupAdminProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { type ConnexioTheme, useAppTheme } from "@/providers/ThemeProvider";
import { NeptuneGovernanceApi } from "@/services/api/governanceApi";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import type {
  ScheduleFrequency,
  ScheduledMessage
} from "@/types/messaging";

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

const FREQUENCIES: Array<{
  value: ScheduleFrequency;
  label: string;
  description: string;
}> = [
  { value: "once", label: "Une fois", description: "Un envoi unique" },
  { value: "daily", label: "Chaque jour", description: "À la même heure" },
  { value: "weekly", label: "Chaque semaine", description: "Le même jour" },
  { value: "monthly", label: "Chaque mois", description: "À la même date" }
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

function frequencyLabel(frequency: ScheduleFrequency): string {
  return FREQUENCIES.find((item) => item.value === frequency)?.label ?? "Une fois";
}

export default function GroupAutomationsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const conversationId = first(params.id);
  const { currentUser, accessToken } = useSession();
  const { getConversation: getServerConversation } = useMessaging();
  const { getConversation: getLocalConversation } = useExperience();
  const { getCreatedGroup } = useGroupAdmin();
  const conversation =
    getServerConversation(conversationId) ??
    getLocalConversation(conversationId) ??
    getCreatedGroup(conversationId);
  const authorized = Boolean(
    conversation &&
      conversation.type !== "direct" &&
      conversation.type !== "small_group" &&
      canScheduleMessages(currentUser, conversation)
  );
  const canManageAll = canManageAllGroupAutomations(currentUser.role);
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneGovernanceApi(accessToken)),
    [accessToken]
  );

  const initialDate = useMemo(
    () =>
      PRESETS.find((preset) => preset.id === "tomorrow-nine")?.resolve(new Date()) ??
      new Date(Date.now() + 86_400_000),
    []
  );
  const [automationName, setAutomationName] = useState("");
  const [body, setBody] = useState("");
  const [dateValue, setDateValue] = useState(formatDateInput(initialDate));
  const [timeValue, setTimeValue] = useState(formatTimeInput(initialDate));
  const [frequency, setFrequency] = useState<ScheduleFrequency>("once");
  const [selectedPreset, setSelectedPreset] = useState("tomorrow-nine");
  const [enabled, setEnabled] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [automations, setAutomations] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!authorized || !api || !conversationId) return;
    let cancelled = false;
    setLoading(true);
    void api
      .listScheduledMessages(conversationId)
      .then((items) => {
        if (!cancelled) {
          setAutomations(
            [...items].sort(
              (firstItem, secondItem) =>
                Date.parse(firstItem.scheduledFor) - Date.parse(secondItem.scheduledFor)
            )
          );
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          AppAlert.alert(
            "Automatisations indisponibles",
            error instanceof Error ? error.message : "Réessayez ultérieurement."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api, authorized, conversationId]);

  const resetForm = () => {
    const next = PRESETS.find((preset) => preset.id === "tomorrow-nine")?.resolve(new Date()) ?? new Date(Date.now() + 86_400_000);
    setAutomationName("");
    setBody("");
    setDateValue(formatDateInput(next));
    setTimeValue(formatTimeInput(next));
    setFrequency("once");
    setSelectedPreset("tomorrow-nine");
    setEnabled(true);
    setEditingId(null);
  };

  const applyPreset = (preset: SchedulePreset) => {
    const date = preset.resolve(new Date());
    setSelectedPreset(preset.id);
    setDateValue(formatDateInput(date));
    setTimeValue(formatTimeInput(date));
  };

  const canManageItem = (item: ScheduledMessage): boolean =>
    canManageAll || item.createdByUserId === currentUser.id;

  const saveAutomation = async () => {
    if (!authorized || saving) return;
    setSaving(true);
    try {
      const scheduledFor = parseLocalSchedule(dateValue, timeValue).toISOString();
      const existing = editingId
        ? automations.find((item) => item.id === editingId)
        : undefined;
      if (existing && !canManageItem(existing)) {
        throw new Error("Seuls les Visionnaires peuvent modifier l’automatisation d’un autre responsable.");
      }
      const validated = createScheduledMessage({
        id: editingId ?? `scheduled-${Crypto.randomUUID()}`,
        conversationId,
        name: automationName,
        body,
        scheduledFor,
        frequency,
        enabled,
        createdByUserId: existing?.createdByUserId ?? currentUser.id,
        createdByName: existing?.createdByName ?? currentUser.name,
        role: currentUser.role,
        canManageConversation: true
      });
      const input = {
        conversationId,
        name: validated.name,
        body: validated.body,
        scheduledFor: validated.scheduledFor,
        frequency: validated.frequency,
        enabled: validated.enabled
      };
      const saved = api
        ? editingId
          ? await api.updateScheduledMessage(editingId, input)
          : await api.scheduleMessage(input)
        : validated;
      setAutomations((previous) =>
        [saved, ...previous.filter((item) => item.id !== saved.id)].sort(
          (firstItem, secondItem) =>
            Date.parse(firstItem.scheduledFor) - Date.parse(secondItem.scheduledFor)
        )
      );
      AppAlert.alert(
        editingId ? "Automatisation modifiée" : "Automatisation créée",
        `${saved.name} démarrera ${formatScheduledDate(saved.scheduledFor)}.`
      );
      resetForm();
    } catch (error) {
      AppAlert.alert(
        "Enregistrement impossible",
        error instanceof Error ? error.message : "L’automatisation n’a pas été enregistrée."
      );
    } finally {
      setSaving(false);
    }
  };

  const editAutomation = (item: ScheduledMessage) => {
    if (!canManageItem(item)) {
      AppAlert.alert(
        "Modification réservée",
        "Seuls les Visionnaires peuvent modifier une automatisation créée par un autre responsable."
      );
      return;
    }
    const date = new Date(item.scheduledFor);
    setEditingId(item.id);
    setAutomationName(item.name);
    setBody(item.body);
    setDateValue(formatDateInput(date));
    setTimeValue(formatTimeInput(date));
    setFrequency(item.frequency);
    setEnabled(item.enabled);
    setSelectedPreset("");
  };

  const toggleEnabled = async (item: ScheduledMessage) => {
    if (!canManageItem(item) || busyId) return;
    const nextEnabled = !item.enabled;
    setBusyId(item.id);
    setAutomations((previous) =>
      previous.map((candidate) =>
        candidate.id === item.id
          ? {
              ...candidate,
              enabled: nextEnabled,
              status: nextEnabled ? "scheduled" : "paused"
            }
          : candidate
      )
    );
    try {
      if (api) {
        await api.setScheduledMessageEnabled(conversationId, item.id, nextEnabled);
      }
    } catch (error) {
      setAutomations((previous) =>
        previous.map((candidate) => (candidate.id === item.id ? item : candidate))
      );
      AppAlert.alert(
        "Modification impossible",
        error instanceof Error ? error.message : "L’état n’a pas été modifié."
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteAutomation = (item: ScheduledMessage) => {
    if (!canManageItem(item) || busyId) return;
    AppAlert.alert(`Supprimer « ${item.name} » ?`, "Cette action est définitive.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          setBusyId(item.id);
          void (async () => {
            try {
              if (api) await api.cancelScheduledMessage(conversationId, item.id);
              setAutomations((previous) => previous.filter((candidate) => candidate.id !== item.id));
              if (editingId === item.id) resetForm();
            } catch (error) {
              AppAlert.alert(
                "Suppression impossible",
                error instanceof Error ? error.message : "L’automatisation n’a pas été supprimée."
              );
            } finally {
              setBusyId(null);
            }
          })();
        }
      }
    ]);
  };

  if (!conversation) {
    return (
      <LinearGradient colors={theme.pageGradient} style={styles.center}>
        <Ionicons name="repeat-outline" size={40} color={theme.pageTextMuted} />
        <Text style={styles.title}>Groupe introuvable</Text>
        <Text style={styles.description}>Ce groupe n’existe plus ou n’est plus accessible.</Text>
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Retour</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  if (!authorized) {
    return (
      <LinearGradient colors={theme.pageGradient} style={styles.center}>
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed-outline" size={31} color={theme.orange} />
        </View>
        <Text style={styles.title}>Automatisations non autorisées</Text>
        <Text style={styles.description}>
          Seuls les Visionnaires et les responsables Amiraux ou Capitaines de ce groupe peuvent accéder à cet espace.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Retour au groupe</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
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
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={theme.pageText} />
        </Pressable>
        <View style={styles.headerText}>
          <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>Automatisations du groupe</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{conversation.name}</Text>
        </View>
        <View style={styles.headerActions}><View style={styles.roleBadge}><Ionicons name="shield-checkmark-outline" size={17} color={theme.success} /></View><ThemeModeButton /></View>
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
          <Ionicons name="people-outline" size={21} color={theme.orange} />
          <Text style={styles.infoText}>
            Toutes les personnes autorisées voient les mêmes automatisations. Les Visionnaires peuvent gérer celles de tous les responsables.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>{editingId ? "Modifier l’automatisation" : "Nouvelle automatisation"}</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>Nom de l’automatisation</Text>
          <TextInput value={automationName} onChangeText={setAutomationName} placeholder="Ex. Rappel atelier chaque lundi" placeholderTextColor={theme.pageTextMuted} maxLength={80} style={styles.input} />

          <Text style={styles.label}>Message</Text>
          <TextInput value={body} onChangeText={setBody} placeholder="Écrivez le message qui sera envoyé…" placeholderTextColor={theme.pageTextMuted} multiline maxLength={4000} style={[styles.input, styles.messageInput]} />
          <Text style={styles.counter}>{body.length}/4000</Text>

          <Text style={styles.label}>Récurrence</Text>
          <View style={styles.frequencyGrid}>
            {FREQUENCIES.map((item) => {
              const selected = frequency === item.value;
              return (
                <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setFrequency(item.value)} style={[styles.frequencyButton, selected && styles.frequencySelected]}>
                  <Text style={[styles.frequencyLabel, selected && styles.frequencyLabelSelected]}>{item.label}</Text>
                  <Text style={styles.frequencyDescription}>{item.description}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Démarrage rapide</Text>
          <View style={styles.presetGrid}>
            {PRESETS.map((preset) => {
              const selected = selectedPreset === preset.id;
              return (
                <Pressable key={preset.id} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => applyPreset(preset)} style={[styles.presetButton, selected && styles.presetSelected]}>
                  <Ionicons name={preset.icon} size={18} color={selected ? theme.orange : theme.pageTextMuted} />
                  <Text style={[styles.presetText, selected && styles.presetTextSelected]}>{preset.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.label}>Date</Text>
              <TextInput value={dateValue} onChangeText={(value) => { setDateValue(value); setSelectedPreset(""); }} keyboardType="numbers-and-punctuation" placeholder="JJ/MM/AAAA" placeholderTextColor={theme.pageTextMuted} style={styles.input} />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.label}>Heure</Text>
              <TextInput value={timeValue} onChangeText={(value) => { setTimeValue(value); setSelectedPreset(""); }} keyboardType="numbers-and-punctuation" placeholder="HH:MM" placeholderTextColor={theme.pageTextMuted} style={styles.input} />
            </View>
          </View>

          <View style={styles.enabledRow}>
            <View style={styles.enabledContent}>
              <Text style={styles.enabledTitle}>Activer dès l’enregistrement</Text>
              <Text style={styles.enabledSubtitle}>Vous pourrez la mettre en pause à tout moment.</Text>
            </View>
            <Switch accessibilityLabel="Activer l’automatisation" value={enabled} onValueChange={setEnabled} trackColor={{ false: theme.surfaceMuted, true: colors.primary }} thumbColor={colors.white} />
          </View>

          <View style={styles.formActions}>
            {editingId ? (
              <Pressable accessibilityRole="button" onPress={resetForm} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" accessibilityState={{ busy: saving, disabled: saving }} disabled={saving} onPress={() => void saveAutomation()} style={styles.saveAutomationButton}>
              {saving ? <ActivityIndicator color={colors.white} /> : <><Ionicons name={editingId ? "save-outline" : "add-circle-outline"} size={20} color={colors.white} /><Text style={styles.saveAutomationText}>{editingId ? "Enregistrer" : "Créer"}</Text></>}
            </Pressable>
          </View>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>Automatisations partagées</Text>
          <View style={styles.countBadge}><Text style={styles.countText}>{automations.length}</Text></View>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={theme.violet} /></View>
        ) : automations.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="repeat-outline" size={30} color={theme.pageTextMuted} />
            <Text style={styles.emptyTitle}>Aucune automatisation</Text>
            <Text style={styles.emptyText}>Créez le premier envoi automatique de ce groupe.</Text>
          </View>
        ) : (
          <View style={styles.automationList}>
            {automations.map((item) => {
              const manageable = canManageItem(item);
              return (
                <View key={item.id} style={[styles.automationCard, !item.enabled && styles.pausedCard]}>
                  <View style={styles.automationTop}>
                    <View style={styles.automationIcon}><Ionicons name={item.frequency === "once" ? "send-outline" : "repeat"} size={20} color={item.enabled ? theme.orange : theme.pageTextMuted} /></View>
                    <View style={styles.automationContent}>
                      <Text style={styles.automationName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.automationMeta}>{frequencyLabel(item.frequency)} · {formatScheduledDate(item.scheduledFor)}</Text>
                      <Text style={styles.creator} numberOfLines={1}>Créée par {item.createdByName ?? (item.createdByUserId === currentUser.id ? currentUser.name : "un responsable")}</Text>
                    </View>
                    <Switch accessibilityLabel={`${item.enabled ? "Mettre en pause" : "Activer"} ${item.name}`} disabled={!manageable || busyId === item.id} value={item.enabled} onValueChange={() => void toggleEnabled(item)} trackColor={{ false: theme.surfaceMuted, true: colors.primary }} thumbColor={colors.white} />
                  </View>
                  <Text style={styles.automationBody} numberOfLines={3}>{item.body}</Text>
                  <View style={styles.cardActions}>
                    <Pressable accessibilityRole="button" disabled={!manageable} onPress={() => editAutomation(item)} style={[styles.cardAction, !manageable && styles.actionDisabled]}>
                      <Ionicons name="create-outline" size={18} color={theme.pageTextSecondary} />
                      <Text style={styles.cardActionText}>Modifier</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" disabled={!manageable || busyId === item.id} onPress={() => deleteAutomation(item)} style={[styles.cardAction, styles.deleteAction, !manageable && styles.actionDisabled]}>
                      {busyId === item.id ? <ActivityIndicator size="small" color={theme.danger} /> : <Ionicons name="trash-outline" size={18} color={theme.danger} />}
                      <Text style={styles.deleteText}>Supprimer</Text>
                    </Pressable>
                  </View>
                  {!manageable ? <Text style={styles.readOnlyText}>Lecture seule · gestion réservée au créateur ou aux Visionnaires</Text> : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const createStyles = (theme: ConnexioTheme) => StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 64, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, minWidth: 0, alignItems: "center" },
  headerTitle: { ...typography.heading3, color: theme.pageText, maxWidth: "100%" },
  headerSubtitle: { color: theme.pageTextMuted, fontSize: 11, marginTop: 2 },
  roleBadge: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center" },
  infoCard: { minHeight: 60, padding: 12, borderRadius: 18, backgroundColor: "rgba(244,177,131,0.09)", borderWidth: 1, borderColor: "rgba(244,177,131,0.20)", flexDirection: "row", alignItems: "center", gap: 9 },
  infoText: { flex: 1, color: theme.pageTextSecondary, fontSize: 11, lineHeight: 14 },
  sectionTitle: { ...typography.heading3, color: theme.pageText, marginTop: spacing.lg, marginBottom: 9 },
  formCard: { padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface },
  label: { color: theme.pageTextSecondary, fontSize: 11, fontWeight: "900", marginBottom: 6, marginTop: 10 },
  input: { minHeight: 48, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 16, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong, color: theme.pageText, fontSize: 14 },
  messageInput: { minHeight: 110, textAlignVertical: "top" },
  counter: { color: theme.pageTextMuted, fontSize: 11, textAlign: "right", marginTop: 4 },
  frequencyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  frequencyButton: { flexGrow: 1, flexBasis: 135, minHeight: 58, padding: 10, borderRadius: 16, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong },
  frequencySelected: { borderColor: theme.violet, backgroundColor: "rgba(107,79,234,0.18)" },
  frequencyLabel: { color: theme.pageTextMuted, fontSize: 11, fontWeight: "900" },
  frequencyLabelSelected: { color: theme.pageText },
  frequencyDescription: { color: theme.pageTextMuted, fontSize: 11, marginTop: 3 },
  presetGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  presetButton: { flexGrow: 1, flexBasis: 130, minHeight: 48, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  presetSelected: { borderColor: theme.orange, backgroundColor: "rgba(244,177,131,0.11)" },
  presetText: { color: theme.pageTextMuted, fontSize: 11, fontWeight: "800" },
  presetTextSelected: { color: theme.orange },
  dateRow: { flexDirection: "row", gap: 8 },
  dateField: { flex: 1.3, minWidth: 0 },
  timeField: { flex: 0.7, minWidth: 0 },
  enabledRow: { minHeight: 68, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  enabledContent: { flex: 1, minWidth: 0 },
  enabledTitle: { color: theme.pageText, fontSize: 11, fontWeight: "900" },
  enabledSubtitle: { color: theme.pageTextMuted, fontSize: 11, marginTop: 3 },
  formActions: { marginTop: spacing.md, flexDirection: "row", gap: 8 },
  cancelButton: { minHeight: 50, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: theme.borderSoft, alignItems: "center", justifyContent: "center" },
  cancelText: { color: theme.pageTextSecondary, fontSize: 11, fontWeight: "900" },
  saveAutomationButton: { flex: 1, minHeight: 50, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveAutomationText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  listHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  countBadge: { minWidth: 26, height: 26, paddingHorizontal: 7, borderRadius: 13, backgroundColor: theme.surfaceStrong, alignItems: "center", justifyContent: "center", marginTop: spacing.lg, marginBottom: 9 },
  countText: { color: theme.pageTextSecondary, fontSize: 11, fontWeight: "900" },
  loading: { minHeight: 100, alignItems: "center", justifyContent: "center" },
  emptyCard: { minHeight: 150, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: theme.pageText, fontSize: 14, fontWeight: "900", marginTop: 9 },
  emptyText: { color: theme.pageTextMuted, fontSize: 11, marginTop: 4, textAlign: "center" },
  automationList: { gap: 9 },
  automationCard: { padding: 13, borderRadius: radii.xl, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface },
  pausedCard: { opacity: 0.7 },
  automationTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  automationIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: theme.surfaceStrong, alignItems: "center", justifyContent: "center" },
  automationContent: { flex: 1, minWidth: 0 },
  automationName: { color: theme.pageText, fontSize: 14, lineHeight: 16, fontWeight: "900" },
  automationMeta: { color: theme.pageTextMuted, fontSize: 11, marginTop: 3 },
  creator: { color: theme.orange, fontSize: 11, marginTop: 3, fontWeight: "800" },
  automationBody: { color: theme.pageTextSecondary, fontSize: 11, lineHeight: 15, marginTop: 10 },
  cardActions: { marginTop: 10, flexDirection: "row", gap: 8 },
  cardAction: { flex: 1, minHeight: 48, borderRadius: 14, backgroundColor: theme.surfaceStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  deleteAction: { backgroundColor: theme.dangerSoft },
  cardActionText: { color: theme.pageTextSecondary, fontSize: 11, fontWeight: "900" },
  deleteText: { color: theme.danger, fontSize: 11, fontWeight: "900" },
  actionDisabled: { opacity: 0.35 },
  readOnlyText: { color: theme.pageTextMuted, fontSize: 11, textAlign: "center", marginTop: 7 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  lockIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: "rgba(244,177,131,0.12)", alignItems: "center", justifyContent: "center" },
  title: { ...typography.heading2, color: theme.pageText, textAlign: "center" },
  description: { ...typography.body, color: theme.pageTextMuted, textAlign: "center", maxWidth: 460 },
  secondaryButton: { minHeight: 48, paddingHorizontal: spacing.lg, borderRadius: 16, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: theme.pageTextSecondary, fontWeight: "900" }
});
