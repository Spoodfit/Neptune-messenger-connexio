import { Text } from "@/components/LocalizedText";
import {
  Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeModeButton } from "@/components/ThemeModeButton";
import { useAppTheme } from "@/providers/ThemeProvider";
import { colors, radii, spacing, typography } from "@/theme";

export default function AccessHelpScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), backgroundColor: theme.shellBackground, borderBottomColor: theme.shellBorder }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.pageText }]}>Aide à la connexion</Text>
        <ThemeModeButton />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroIcon, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Ionicons name="key-outline" size={31} color={theme.orange} /></View>
        <Text style={[styles.title, { color: theme.pageText }]}>Obtenir un code Connexio</Text>
        <Text style={[styles.intro, { color: theme.pageTextSecondary }]}>Le code doit être généré depuis une session Neptune Business déjà authentifiée. Il expire rapidement et ne peut être utilisé qu’une fois.</Text>

        {[
          ["1", "Ouvrez Neptune Business", "Connectez-vous à votre compte web ou mobile officiel."],
          ["2", "Accédez à Connexio", "Dans le profil ou les réglages de sécurité, choisissez « Connecter Connexio »."],
          ["3", "Utilisez immédiatement le code", "Copiez le code ou ouvrez le lien profond sur le téléphone qui utilisera Connexio."]
        ].map(([number, title, body]) => <View key={number} style={[styles.step, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><View style={[styles.stepNumber, { backgroundColor: theme.accentSoft }]}><Text style={[styles.stepNumberText, { color: theme.orange }]}>{number}</Text></View><View style={styles.stepContent}><Text style={[styles.stepTitle, { color: theme.pageText }]}>{title}</Text><Text style={[styles.stepBody, { color: theme.pageTextMuted }]}>{body}</Text></View></View>)}

        <View style={[styles.warning, { backgroundColor: theme.warningSoft }]}><Ionicons name="warning-outline" size={20} color={theme.warning} /><Text style={[styles.warningText, { color: theme.pageTextSecondary }]}>Ne communiquez jamais un code reçu à une autre personne. Neptune ne vous demandera pas ce code par téléphone ou message.</Text></View>
        <Pressable accessibilityRole="button" onPress={() => void Linking.openURL("https://neptunebusiness.com")} style={styles.primaryButton}><Text style={styles.primaryText}>Ouvrir Neptune Business</Text><Ionicons name="open-outline" size={18} color={colors.white} /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/sign-in")} style={styles.secondaryButton}><Text style={[styles.secondaryText, { color: theme.orange }]}>Retour à la connexion</Text></Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, headerTitle: { ...typography.heading3, flex: 1, textAlign: "center" },
  content: { width: "100%", maxWidth: 620, alignSelf: "center", paddingHorizontal: spacing.md, alignItems: "center" }, heroIcon: { width: 66, height: 66, borderRadius: 23, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: spacing.lg }, title: { ...typography.heading2, textAlign: "center", marginTop: spacing.md }, intro: { ...typography.body, textAlign: "center", marginTop: 8, marginBottom: spacing.lg },
  step: { width: "100%", minHeight: 84, marginBottom: 9, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 }, stepNumber: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" }, stepNumberText: { fontSize: 14, fontWeight: "900" }, stepContent: { flex: 1, minWidth: 0 }, stepTitle: { fontSize: 14, fontWeight: "900" }, stepBody: { ...typography.bodySmall, marginTop: 4 },
  warning: { width: "100%", marginTop: 5, padding: spacing.md, borderRadius: radii.lg, flexDirection: "row", alignItems: "flex-start", gap: 10 }, warningText: { ...typography.bodySmall, flex: 1 }, primaryButton: { width: "100%", minHeight: 52, marginTop: spacing.lg, borderRadius: 18, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, primaryText: { color: colors.white, fontSize: 14, fontWeight: "900" }, secondaryButton: { minHeight: 48, paddingHorizontal: spacing.md, alignItems: "center", justifyContent: "center" }, secondaryText: { fontSize: 14, fontWeight: "800" }
});
