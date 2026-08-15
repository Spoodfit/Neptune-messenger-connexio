import { Text } from "@/components/LocalizedText";
import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, gradients, radii, spacing, typography } from "@/theme";

import { useAppTheme } from "@/providers/ThemeProvider";
export default function MembershipRequiredScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color={theme.pageText} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Accès membre
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.iconShell}>
            <Ionicons name="lock-closed" size={30} color={theme.orange} />
          </View>
          <Text style={styles.title}>Fonction réservée à votre niveau d’adhésion</Text>
          <Text style={styles.body}>
            Connexio reconnaît automatiquement le statut associé à votre compte Neptune Business. Certaines fonctions sont disponibles uniquement pour les niveaux d’adhésion concernés.
          </Text>
        </View>

        <View style={styles.card}>
          <Ionicons name="information-circle-outline" size={22} color={theme.pageTextSecondary} />
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Aucun achat dans Connexio</Text>
            <Text style={styles.cardText}>
              Cette application ne propose pas d’achat, d’abonnement ni de paiement externe. Si votre statut Neptune Business a changé récemment, reconnectez-vous ou resynchronisez votre profil.
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir mon compte"
          onPress={() => router.push("/account")}
          style={styles.primaryButton}
        >
          <Ionicons name="person-circle-outline" size={21} color={colors.white} />
          <Text style={styles.primaryText}>Vérifier mon compte</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour aux messages"
          onPress={() => router.replace("/(tabs)/messages")}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>Retour aux messages</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
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
    color: theme.pageText,
    flex: 1,
    textAlign: "center"
  },
  content: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    paddingHorizontal: spacing.md
  },
  hero: { alignItems: "center", paddingVertical: spacing.xl },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    ...typography.heading2,
    color: theme.pageText,
    textAlign: "center",
    marginTop: spacing.md
  },
  body: {
    ...typography.body,
    color: theme.pageTextSecondary,
    textAlign: "center",
    marginTop: spacing.sm
  },
  card: {
    minHeight: 118,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: theme.borderSoft,
    backgroundColor: theme.surface,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: { color: theme.pageText, fontSize: 14, fontWeight: "900" },
  cardText: {
    ...typography.bodySmall,
    color: theme.pageTextMuted,
    marginTop: 4
  },
  primaryButton: {
    minHeight: 54,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  primaryText: { color: colors.white, fontSize: 16, fontWeight: "900" },
  secondaryButton: {
    minHeight: 48,
    marginTop: spacing.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryText: { color: theme.pageTextSecondary, fontSize: 14, fontWeight: "800" }
});
