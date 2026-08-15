import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemeModeButton } from "@/components/ThemeModeButton";
import { useAppTheme } from "@/providers/ThemeProvider";
import { radii, spacing, typography } from "@/theme";

const rules = [
  { title: "Respect et sécurité", body: "Sont interdits les menaces, le harcèlement, l’intimidation, les contenus haineux ou discriminatoires, l’exploitation sexuelle, les contenus violents illicites et tout comportement visant à nuire à une personne." },
  { title: "Contenus licites", body: "Ne publiez aucun contenu illégal, frauduleux, diffamatoire, trompeur, contrefaisant, portant atteinte à la vie privée ou aux droits de propriété intellectuelle d’un tiers." },
  { title: "Pas de spam ni d’abus", body: "Le spam, les sollicitations répétitives non désirées, l’usurpation d’identité, les arnaques, le phishing, les logiciels malveillants et l’automatisation abusive sont interdits." },
  { title: "Données personnelles", body: "Ne partagez pas de données personnelles sensibles concernant un tiers sans base légitime et sans son accord lorsque celui-ci est requis." },
  { title: "Modération", body: "Neptune peut masquer ou retirer un contenu, limiter une fonctionnalité, suspendre un compte ou exclure un membre lorsque ces règles, les conditions applicables ou la loi ne sont pas respectées." },
  { title: "Signalement et blocage", body: "Chaque membre peut signaler un contenu ou un profil et bloquer un utilisateur. Les signalements sont transmis à la modération Neptune pour examen et traitement." }
];

export default function CommunityGuidelinesScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), paddingLeft: spacing.sm + insets.left, paddingRight: spacing.sm + insets.right, backgroundColor: theme.shellBackground, borderBottomColor: theme.shellBorder }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.pageText }]}>Règles communautaires</Text>
        <ThemeModeButton />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}><Ionicons name="shield-checkmark" size={36} color={theme.success} /><Text style={[styles.title, { color: theme.pageText }]}>Une communauté professionnelle, pas une zone de non-droit</Text><Text style={[styles.intro, { color: theme.pageTextSecondary }]}>L’utilisation de Connexio implique le respect de ces règles pour tous les messages, profils, groupes, commentaires, médias, appels et Temps forts.</Text></View>
        {rules.map((rule) => <View key={rule.title} style={[styles.card, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><View style={[styles.bullet, { backgroundColor: theme.orange }]} /><View style={styles.cardContent}><Text style={[styles.cardTitle, { color: theme.pageText }]}>{rule.title}</Text><Text style={[styles.cardBody, { color: theme.pageTextMuted }]}>{rule.body}</Text></View></View>)}
        <View style={[styles.footerCard, { backgroundColor: theme.surfaceStrong }]}><Text style={[styles.footerTitle, { color: theme.pageText }]}>Besoin d’aide ?</Text><Text style={[styles.footerText, { color: theme.pageTextSecondary }]}>Utilisez les actions « Signaler » et « Bloquer » disponibles dans Connexio. Pour une question de sécurité ou de modération, contactez également le support Neptune depuis les réglages.</Text></View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 66, paddingBottom: spacing.sm, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, headerTitle: { ...typography.heading3, flex: 1, textAlign: "center" },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: spacing.md }, hero: { alignItems: "center", paddingVertical: spacing.lg }, title: { ...typography.heading2, textAlign: "center", marginTop: spacing.sm }, intro: { ...typography.body, textAlign: "center", marginTop: spacing.sm },
  card: { minHeight: 92, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }, bullet: { width: 10, height: 10, borderRadius: 5, marginTop: 6 }, cardContent: { flex: 1, minWidth: 0 }, cardTitle: { fontSize: 14, fontWeight: "900" }, cardBody: { ...typography.bodySmall, marginTop: 4 },
  footerCard: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radii.lg }, footerTitle: { fontSize: 14, fontWeight: "900" }, footerText: { ...typography.bodySmall, marginTop: 4 }
});
