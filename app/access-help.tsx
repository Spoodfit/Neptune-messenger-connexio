import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, gradients, radii, spacing, typography } from "@/theme";

export default function AccessHelpScreen() {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Aide à la connexion</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
      >
        <View style={styles.heroIcon}>
          <Ionicons name="key-outline" size={31} color={colors.orange} />
        </View>
        <Text style={styles.title}>Obtenir un code Connexio</Text>
        <Text style={styles.intro}>
          Le code doit être généré depuis une session Neptune Business déjà authentifiée. Il expire rapidement et ne peut être utilisé qu’une fois.
        </Text>

        {[
          ["1", "Ouvrez Neptune Business", "Connectez-vous à votre compte web ou mobile officiel."],
          ["2", "Accédez à Connexio", "Dans le profil ou les réglages de sécurité, choisissez « Connecter Connexio »."],
          ["3", "Utilisez immédiatement le code", "Copiez le code ou ouvrez le lien profond sur le téléphone qui utilisera Connexio."]
        ].map(([number, title, body]) => (
          <View key={number} style={styles.step}>
            <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{title}</Text>
              <Text style={styles.stepBody}>{body}</Text>
            </View>
          </View>
        ))}

        <View style={styles.warning}>
          <Ionicons name="warning-outline" size={20} color={colors.warning} />
          <Text style={styles.warningText}>
            Ne communiquez jamais un code reçu à une autre personne. Neptune ne vous demandera pas ce code par téléphone ou message.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => void Linking.openURL("https://neptunebusiness.com")}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryText}>Ouvrir Neptune Business</Text>
          <Ionicons name="open-outline" size={18} color={colors.white} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/sign-in")}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>Retour à la connexion</Text>
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
  content: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: spacing.md, alignItems: "center" },
  heroIcon: { width: 66, height: 66, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  title: { ...typography.heading2, color: colors.text, textAlign: "center", marginTop: spacing.md },
  intro: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginTop: 8, marginBottom: spacing.lg },
  step: { width: "100%", minHeight: 84, marginBottom: 9, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNumber: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: colors.orange, fontSize: 13, fontWeight: "900" },
  stepContent: { flex: 1, minWidth: 0 },
  stepTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  stepBody: { ...typography.bodySmall, color: colors.textMuted, marginTop: 4 },
  warning: { width: "100%", marginTop: 5, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.warningSoft, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  warningText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  primaryButton: { width: "100%", minHeight: 52, marginTop: spacing.lg, borderRadius: 18, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: colors.white, fontSize: 14, fontWeight: "900" },
  secondaryButton: { minHeight: 48, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: colors.orange, fontSize: 12, fontWeight: "800" }
});
