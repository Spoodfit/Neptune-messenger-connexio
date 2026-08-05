import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, gradients, radii, spacing, typography } from "@/theme";

const sections = [
  {
    icon: "location-outline" as const,
    title: "Localisation et Map",
    body: "Position approximative uniquement, rayon minimal, durée de conservation courte et Ghost Mode appliqué côté serveur."
  },
  {
    icon: "people-outline" as const,
    title: "Visibilité du profil",
    body: "Photo, téléphone, présence et publications doivent respecter les préférences synchronisées depuis Neptune Business."
  },
  {
    icon: "lock-closed-outline" as const,
    title: "Conversations",
    body: "Les messages, pièces jointes et notifications ne sont accessibles qu’aux membres autorisés de la conversation."
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Blocage et signalement",
    body: "Le blocage doit interrompre les messages, appels, mentions et visibilité selon les règles de modération Neptune."
  }
];

const accountRights: Array<{ title: string; subtitle: string }> = [
  {
    title: "Télécharger mes données",
    subtitle: "Le backend doit générer une archive sécurisée et temporaire."
  },
  {
    title: "Supprimer mon compte",
    subtitle:
      "La suppression doit révoquer les sessions, traiter les contenus et respecter les obligations légales."
  },
  {
    title: "Historique des appareils",
    subtitle:
      "Les sessions actives doivent être visibles et révocables individuellement."
  }
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Confidentialité</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
      >
        <View style={styles.hero}>
          <Ionicons name="shield-checkmark" size={34} color={colors.success} />
          <Text style={styles.title}>Vos données restent sous votre contrôle</Text>
          <Text style={styles.intro}>
            Cet écran définit les parcours front. Les choix doivent être persistés, appliqués et audités par le backend Neptune.
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.card}>
            <View style={styles.iconWrap}>
              <Ionicons name={section.icon} size={21} color={colors.orange} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{section.title}</Text>
              <Text style={styles.cardBody}>{section.body}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Droits du compte</Text>
        {accountRights.map((right) => (
          <Pressable
            key={right.title}
            onPress={() =>
              Alert.alert(
                right.title,
                `${right.subtitle}\n\nLe front est prêt ; l’action serveur doit être connectée avant le pilote.`
              )
            }
            style={styles.actionRow}
          >
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{right.title}</Text>
              <Text style={styles.actionSubtitle}>{right.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
          </Pressable>
        ))}
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
    maxWidth: 660,
    alignSelf: "center",
    paddingHorizontal: spacing.md
  },
  hero: { alignItems: "center", paddingVertical: spacing.lg },
  title: {
    ...typography.heading2,
    color: colors.text,
    textAlign: "center",
    marginTop: 10
  },
  intro: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 7
  },
  card: {
    minHeight: 96,
    marginBottom: 9,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  cardBody: { ...typography.bodySmall, color: colors.textMuted, marginTop: 4 },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: 8
  },
  actionRow: {
    minHeight: 76,
    marginBottom: 8,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  actionContent: { flex: 1, minWidth: 0 },
  actionTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  actionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 3
  }
});
