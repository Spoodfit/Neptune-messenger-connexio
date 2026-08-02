import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NeptuneMark } from "@/components/NeptuneMark";
import { colors, gradients, radii, spacing, typography } from "@/theme";

export default function NotFoundScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={gradients.screen}
      style={[
        styles.screen,
        {
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingLeft: insets.left + spacing.lg,
          paddingRight: insets.right + spacing.lg
        }
      ]}
    >
      <NeptuneMark size={76} />
      <View style={styles.iconWrap}>
        <Ionicons name="compass-outline" size={31} color={colors.orange} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Cette destination n’existe pas
      </Text>
      <Text style={styles.description}>
        Le lien est invalide, a expiré ou pointe vers un contenu auquel votre statut ne donne plus accès.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/(tabs)/messages")}
        style={styles.primaryButton}
      >
        <Text style={styles.primaryText}>Revenir aux messages</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.canGoBack() && router.back()}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryText}>Retour</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconWrap: { width: 66, height: 66, marginTop: spacing.lg, borderRadius: 23, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  title: { ...typography.heading2, color: colors.text, textAlign: "center", marginTop: spacing.md },
  description: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 430, marginTop: 7 },
  primaryButton: { minHeight: 52, minWidth: 210, marginTop: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  primaryText: { color: colors.white, fontWeight: "900" },
  secondaryButton: { minHeight: 48, minWidth: 100, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.orange, fontSize: 12, fontWeight: "800" }
});
