import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppAlert } from "@/services/ui/AppAlert";

import { ThemeModeButton } from "@/components/ThemeModeButton";
import { env } from "@/config/env";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { NeptuneAccountApi, type NotificationPreferences } from "@/services/api/accountApi";
import { colors, radii, spacing, typography } from "@/theme";

const DEFAULT_PREFERENCES: NotificationPreferences = { messages: true, mentions: true, groups: true, highlights: true, calls: true, confidentialPreview: true };
type PreferenceKey = keyof NotificationPreferences;
const ROWS: Array<{ key: PreferenceKey; title: string; subtitle: string }> = [
  { key: "messages", title: "Messages privés", subtitle: "Nouveaux messages et réponses" },
  { key: "mentions", title: "Mentions", subtitle: "@prénom, @nom ou @entreprise" },
  { key: "groups", title: "Groupes", subtitle: "Alertes des groupes non mis en sourdine" },
  { key: "highlights", title: "Temps forts", subtitle: "Réactions, commentaires et publications suivies" },
  { key: "calls", title: "Appels", subtitle: "Appels audio, visio et appels manqués" },
  { key: "confidentialPreview", title: "Aperçu confidentiel", subtitle: "Masquer le contenu du message sur l’écran verrouillé" }
];

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { accessToken } = useSession();
  const api = useMemo(() => env.mockMode ? null : new NeptuneAccountApi(accessToken), [accessToken]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(!env.mockMode);
  const [savingKey, setSavingKey] = useState<PreferenceKey | null>(null);

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    setLoading(true);
    void api.getNotificationPreferences().then((next) => { if (!cancelled) setPreferences(next); }).catch((error: unknown) => { if (!cancelled) AppAlert.alert("Préférences indisponibles", error instanceof Error ? error.message : "Réessayez ultérieurement."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api]);

  const updatePreference = async (key: PreferenceKey, value: boolean) => {
    if (savingKey) return;
    const previous = preferences;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSavingKey(key);
    try { if (api) setPreferences(await api.updateNotificationPreferences(next)); }
    catch (error) { setPreferences(previous); AppAlert.alert("Enregistrement impossible", error instanceof Error ? error.message : "La préférence n’a pas été enregistrée."); }
    finally { setSavingKey(null); }
  };

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), backgroundColor: theme.shellBackground, borderBottomColor: theme.shellBorder }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.pageText }]}>Notifications</Text>
        <ThemeModeButton />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}><Ionicons name="notifications-outline" size={29} color={theme.orange} /><Text style={[styles.title, { color: theme.pageText }]}>Choisir les alertes utiles</Text><Text style={[styles.subtitle, { color: theme.pageTextSecondary }]}>Les préférences sont enregistrées sur le compte Neptune et appliquées à tous les appareils connectés.</Text></View>
        <View style={[styles.panel, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}>
          {loading ? <View style={styles.loader}><ActivityIndicator color={theme.violet} /><Text style={[styles.loaderText, { color: theme.pageTextMuted }]}>Chargement des préférences…</Text></View> : ROWS.map((row, index) => (
            <View key={row.key} style={[styles.row, index < ROWS.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.borderSoft }]}>
              <View style={styles.rowContent}><Text style={[styles.rowTitle, { color: theme.pageText }]}>{row.title}</Text><Text style={[styles.rowSubtitle, { color: theme.pageTextMuted }]}>{row.subtitle}</Text></View>
              {savingKey === row.key ? <View style={styles.switchLoader}><ActivityIndicator size="small" color={theme.violet} /></View> : <Pressable accessibilityRole="switch" accessibilityLabel={row.title} accessibilityState={{ checked: preferences[row.key], disabled: Boolean(savingKey) }} disabled={Boolean(savingKey)} onPress={() => void updatePreference(row.key, !preferences[row.key])} style={styles.switchTarget}><Switch pointerEvents="none" value={preferences[row.key]} trackColor={{ false: theme.surfaceMuted, true: colors.primary }} thumbColor={colors.white} /></Pressable>}
            </View>
          ))}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir les réglages système" onPress={() => void Linking.openSettings()} style={[styles.systemButton, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><Ionicons name="settings-outline" size={21} color={theme.pageText} /><View style={styles.systemContent}><Text style={[styles.systemTitle, { color: theme.pageText }]}>Réglages système</Text><Text style={[styles.systemSubtitle, { color: theme.pageTextMuted }]}>Autorisation globale, sons, badges et écran verrouillé.</Text></View><Ionicons name="open-outline" size={18} color={theme.pageTextMuted} /></Pressable>
        <View style={[styles.note, { backgroundColor: theme.successSoft }]}><Ionicons name="shield-checkmark-outline" size={19} color={theme.success} /><Text style={[styles.noteText, { color: theme.pageTextSecondary }]}>Une préférence désactivée est aussi respectée par les notifications push générées côté serveur. La sourdine d’un groupe reste prioritaire sur les réglages généraux.</Text></View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, headerTitle: { ...typography.heading3, flex: 1, textAlign: "center" }, content: { width: "100%", maxWidth: 640, alignSelf: "center", paddingHorizontal: spacing.md }, intro: { alignItems: "center", paddingVertical: spacing.lg }, title: { ...typography.heading2, textAlign: "center", marginTop: 9 }, subtitle: { ...typography.body, textAlign: "center", marginTop: 6 },
  panel: { borderRadius: radii.xl, borderWidth: 1, overflow: "hidden" }, loader: { minHeight: 116, alignItems: "center", justifyContent: "center", gap: 9 }, loaderText: { fontSize: 11, fontWeight: "800" }, row: { minHeight: 74, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }, rowContent: { flex: 1, minWidth: 0 }, rowTitle: { fontSize: 14, fontWeight: "900" }, rowSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 3 }, switchTarget: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, switchLoader: { width: 52, height: 48, alignItems: "center", justifyContent: "center" },
  systemButton: { minHeight: 76, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 11 }, systemContent: { flex: 1, minWidth: 0 }, systemTitle: { fontSize: 14, fontWeight: "900" }, systemSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 3 }, note: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, flexDirection: "row", alignItems: "flex-start", gap: 10 }, noteText: { ...typography.bodySmall, flex: 1 }
});
