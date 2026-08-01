import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { env } from "@/config/env";
import { useSession } from "@/providers/SessionProvider";
import {
  NeptuneAccountApi,
  type NotificationPreferences
} from "@/services/api/accountApi";
import { colors, gradients, radii, spacing, typography } from "@/theme";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  messages: true,
  mentions: true,
  groups: true,
  highlights: true,
  calls: true,
  confidentialPreview: true
};

type PreferenceKey = keyof NotificationPreferences;

const ROWS: Array<{
  key: PreferenceKey;
  title: string;
  subtitle: string;
}> = [
  {
    key: "messages",
    title: "Messages privés",
    subtitle: "Nouveaux messages et réponses"
  },
  {
    key: "mentions",
    title: "Mentions",
    subtitle: "@prénom, @nom ou @entreprise"
  },
  {
    key: "groups",
    title: "Groupes",
    subtitle: "Alertes des groupes non mis en sourdine"
  },
  {
    key: "highlights",
    title: "Temps forts",
    subtitle: "Réactions, commentaires et publications suivies"
  },
  {
    key: "calls",
    title: "Appels",
    subtitle: "Appels audio, visio et appels manqués"
  },
  {
    key: "confidentialPreview",
    title: "Aperçu confidentiel",
    subtitle: "Masquer le contenu du message sur l’écran verrouillé"
  }
];

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useSession();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneAccountApi(accessToken)),
    [accessToken]
  );
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(!env.mockMode);
  const [savingKey, setSavingKey] = useState<PreferenceKey | null>(null);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    setLoading(true);
    void api
      .getNotificationPreferences()
      .then((next) => {
        if (!cancelled) setPreferences(next);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          Alert.alert(
            "Préférences indisponibles",
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
  }, [api]);

  const updatePreference = async (key: PreferenceKey, value: boolean) => {
    if (savingKey) return;
    const previous = preferences;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSavingKey(key);
    try {
      if (api) {
        const saved = await api.updateNotificationPreferences(next);
        setPreferences(saved);
      }
    } catch (error) {
      setPreferences(previous);
      Alert.alert(
        "Enregistrement impossible",
        error instanceof Error ? error.message : "La préférence n’a pas été enregistrée."
      );
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Notifications
        </Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.intro}>
          <Ionicons name="notifications-outline" size={29} color={colors.orange} />
          <Text style={styles.title}>Choisir les alertes utiles</Text>
          <Text style={styles.subtitle}>
            Les préférences sont enregistrées sur le compte Neptune et appliquées à
            tous les appareils connectés.
          </Text>
        </View>

        <View style={styles.panel}>
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.violet} />
              <Text style={styles.loaderText}>Chargement des préférences…</Text>
            </View>
          ) : (
            ROWS.map((row, index) => (
              <View
                key={row.key}
                style={[styles.row, index < ROWS.length - 1 && styles.divider]}
              >
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{row.title}</Text>
                  <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
                </View>
                {savingKey === row.key ? (
                  <View style={styles.switchLoader}>
                    <ActivityIndicator size="small" color={colors.violet} />
                  </View>
                ) : (
                  <Switch
                    accessibilityLabel={row.title}
                    disabled={Boolean(savingKey)}
                    value={preferences[row.key]}
                    onValueChange={(value) =>
                      void updatePreference(row.key, value)
                    }
                    trackColor={{
                      false: colors.surfaceMuted,
                      true: colors.primary
                    }}
                    thumbColor={colors.white}
                  />
                )}
              </View>
            ))
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir les réglages système"
          onPress={() => void Linking.openSettings()}
          style={styles.systemButton}
        >
          <Ionicons name="settings-outline" size={21} color={colors.text} />
          <View style={styles.systemContent}>
            <Text style={styles.systemTitle}>Réglages système</Text>
            <Text style={styles.systemSubtitle}>
              Autorisation globale, sons, badges et écran verrouillé.
            </Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={19} color={colors.success} />
          <Text style={styles.noteText}>
            Une préférence désactivée est aussi respectée par les notifications push
            générées côté serveur. La sourdine d’un groupe reste prioritaire sur les
            réglages généraux.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 58,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center"
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.text,
    flex: 1,
    textAlign: "center"
  },
  content: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: spacing.md
  },
  intro: { alignItems: "center", paddingVertical: spacing.lg },
  title: {
    ...typography.heading2,
    color: colors.text,
    textAlign: "center",
    marginTop: 9
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 6
  },
  panel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  loader: {
    minHeight: 116,
    alignItems: "center",
    justifyContent: "center",
    gap: 9
  },
  loaderText: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  row: {
    minHeight: 74,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  rowSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  switchLoader: {
    width: 52,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  systemButton: {
    minHeight: 76,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  systemContent: { flex: 1, minWidth: 0 },
  systemTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  systemSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3
  },
  note: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.successSoft,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  noteText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 }
});
