import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, gradients, radii, spacing, typography } from "@/theme";

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [groups, setGroups] = useState(true);
  const [highlights, setHighlights] = useState(true);
  const [calls, setCalls] = useState(true);
  const rows = [
    ["Messages privés", "Nouveaux messages et réponses", messages, setMessages],
    ["Mentions", "@prénom, @nom ou @entreprise", mentions, setMentions],
    ["Groupes", "Alertes des groupes non mis en sourdine", groups, setGroups],
    ["Temps forts", "Réactions, commentaires et publications suivies", highlights, setHighlights],
    ["Appels", "Appels audio, visio et appels manqués", calls, setCalls]
  ] as const;

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
      >
        <View style={styles.intro}>
          <Ionicons name="notifications-outline" size={29} color={colors.orange} />
          <Text style={styles.title}>Choisir les alertes utiles</Text>
          <Text style={styles.subtitle}>
            Les choix locaux devront être synchronisés par appareil et par conversation avec le backend Neptune.
          </Text>
        </View>

        <View style={styles.panel}>
          {rows.map(([title, subtitle, value, setter], index) => (
            <View
              key={title}
              style={[styles.row, index < rows.length - 1 && styles.divider]}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>{title}</Text>
                <Text style={styles.rowSubtitle}>{subtitle}</Text>
              </View>
              <Switch
                value={value}
                onValueChange={setter}
                trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          ))}
        </View>

        <Pressable
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
          <Ionicons name="eye-off-outline" size={19} color={colors.success} />
          <Text style={styles.noteText}>
            Le contenu d’un message ne doit pas apparaître sur l’écran verrouillé lorsque l’utilisateur choisit un aperçu confidentiel.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 58, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: colors.text, flex: 1, textAlign: "center" },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", paddingHorizontal: spacing.md },
  intro: { alignItems: "center", paddingVertical: spacing.lg },
  title: { ...typography.heading2, color: colors.text, textAlign: "center", marginTop: 9 },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: 6 },
  panel: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, overflow: "hidden" },
  row: { minHeight: 74, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  rowSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  systemButton: { minHeight: 76, marginTop: spacing.md, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 11 },
  systemContent: { flex: 1, minWidth: 0 },
  systemTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  systemSubtitle: { color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: 3 },
  note: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.successSoft, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noteText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 }
});
