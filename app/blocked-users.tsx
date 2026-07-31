import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, gradients, radii, spacing, typography } from "@/theme";

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Membres bloqués</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
      >
        <View style={styles.emptyCard}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-remove-outline" size={31} color={colors.textMuted} />
          </View>
          <Text style={styles.title}>Aucun membre bloqué</Text>
          <Text style={styles.subtitle}>
            Un blocage devra couper les messages privés, appels, invitations, mentions et interactions ciblées, sans révéler le blocage à l’autre membre.
          </Text>
        </View>
        <View style={styles.ruleCard}>
          <Text style={styles.ruleTitle}>Règles obligatoires</Text>
          {[
            "Le serveur est la source de vérité du blocage.",
            "Les groupes officiels restent visibles selon la politique de modération.",
            "Un signalement peut être envoyé indépendamment d’un blocage.",
            "Le déblocage ne restaure pas automatiquement les anciennes invitations."
          ].map((rule) => (
            <View key={rule} style={styles.ruleRow}>
              <Ionicons name="checkmark-circle" size={17} color={colors.success} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
        <Pressable
          onPress={() =>
            Alert.alert(
              "Backend à connecter",
              "La liste, le blocage, le déblocage et les règles de visibilité sont prêts côté front."
            )
          }
          style={styles.testButton}
        >
          <Text style={styles.testText}>Tester l’état de blocage</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 58, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: colors.text, flex: 1, textAlign: "center" },
  content: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: spacing.md },
  emptyCard: { marginTop: spacing.lg, minHeight: 240, padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 68, height: 68, borderRadius: 24, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  title: { ...typography.heading2, color: colors.text, textAlign: "center", marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: 7 },
  ruleCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  ruleTitle: { color: colors.text, fontSize: 13, fontWeight: "900", marginBottom: 10 },
  ruleRow: { minHeight: 38, flexDirection: "row", alignItems: "flex-start", gap: 8 },
  ruleText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  testButton: { minHeight: 50, marginTop: spacing.md, borderRadius: 17, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" },
  testText: { color: colors.orange, fontSize: 12, fontWeight: "900" }
});
