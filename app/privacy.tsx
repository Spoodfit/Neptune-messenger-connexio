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
import { AppAlert } from "@/services/ui/AppAlert";

import { ThemeModeButton } from "@/components/ThemeModeButton";
import { env } from "@/config/env";
import { useAppTheme } from "@/providers/ThemeProvider";
import { radii, spacing, typography } from "@/theme";

const sections = [
  { icon: "location-outline" as const, title: "Localisation et Map", body: "La localisation n’est utilisée que lorsque vous déclenchez une fonction qui en a besoin. Vous pouvez utiliser le Ghost Mode et modifier vos autorisations depuis les réglages du téléphone." },
  { icon: "people-outline" as const, title: "Visibilité du profil", body: "La visibilité de votre photo, téléphone, présence, localisation approximative et contenus dépend de vos réglages et des règles de votre espace Neptune." },
  { icon: "lock-closed-outline" as const, title: "Conversations", body: "Les messages, pièces jointes, appels et notifications sont réservés aux membres autorisés de la conversation et protégés par les contrôles d’accès Neptune." },
  { icon: "shield-checkmark-outline" as const, title: "Blocage et signalement", body: "Vous pouvez bloquer un membre et signaler un profil ou un contenu. Les signalements sont transmis à la modération Neptune." }
];

async function openExternalUrl(label: string, url: string): Promise<void> {
  if (!url) { AppAlert.alert(label, "Ce lien est temporairement indisponible."); return; }
  const supported = await Linking.canOpenURL(url);
  if (!supported) { AppAlert.alert(label, "Ce lien ne peut pas être ouvert sur cet appareil."); return; }
  await Linking.openURL(url);
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), backgroundColor: theme.shellBackground, borderBottomColor: theme.shellBorder }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.pageText }]}>Confidentialité</Text>
        <ThemeModeButton />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}><Ionicons name="shield-checkmark" size={34} color={theme.success} /><Text style={[styles.title, { color: theme.pageText }]}>Vos données restent sous votre contrôle</Text><Text style={[styles.intro, { color: theme.pageTextSecondary }]}>Gérez ici les informations essentielles liées à la confidentialité, à la modération et à vos droits sur votre compte Connexio.</Text></View>

        {sections.map((section) => <View key={section.title} style={[styles.card, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><View style={[styles.iconWrap, { backgroundColor: theme.surfaceStrong }]}><Ionicons name={section.icon} size={21} color={theme.orange} /></View><View style={styles.cardContent}><Text style={[styles.cardTitle, { color: theme.pageText }]}>{section.title}</Text><Text style={[styles.cardBody, { color: theme.pageTextMuted }]}>{section.body}</Text></View></View>)}

        <Text style={[styles.sectionTitle, { color: theme.pageText }]}>Documents et droits</Text>
        <ActionRow icon="document-text-outline" title="Politique de confidentialité" subtitle="Données collectées, finalités, destinataires, conservation et exercice de vos droits." onPress={() => void openExternalUrl("Politique de confidentialité", env.privacyPolicyUrl)} external />
        <ActionRow icon="reader-outline" title="Conditions d’utilisation" subtitle="Conditions applicables à l’utilisation des services Neptune et de Connexio." onPress={() => void openExternalUrl("Conditions d’utilisation", env.termsUrl)} external />
        <ActionRow icon="people-circle-outline" title="Règles communautaires" subtitle="Contenus interdits, signalement, blocage et règles de modération." onPress={() => router.push("/community-guidelines")} />
        <ActionRow icon="person-circle-outline" title="Mes données et mon compte" subtitle="Télécharger vos données, consulter vos sessions ou demander la suppression de votre compte." onPress={() => router.push("/account")} />
        <ActionRow icon="trash-outline" danger title="Suppression du compte sur le web" subtitle="Accéder à la procédure de suppression même si vous ne pouvez plus utiliser l’application." onPress={() => void openExternalUrl("Suppression du compte", env.accountDeletionUrl)} external />

        <Pressable accessibilityRole="link" accessibilityLabel="Contacter le support Neptune" onPress={() => void openExternalUrl("Support Neptune", env.supportUrl)} style={styles.supportButton}><Ionicons name="help-circle-outline" size={20} color={theme.pageTextSecondary} /><Text style={[styles.supportText, { color: theme.pageTextSecondary }]}>Contacter le support Neptune</Text></Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

function ActionRow({ icon, title, subtitle, onPress, external = false, danger = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void; external?: boolean; danger?: boolean }) {
  const theme = useAppTheme();
  return <Pressable accessibilityRole={external ? "link" : "button"} accessibilityLabel={title} onPress={onPress} style={[styles.actionRow, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]}><View style={[styles.actionIcon, { backgroundColor: danger ? theme.dangerSoft : theme.surfaceStrong }]}><Ionicons name={icon} size={20} color={danger ? theme.danger : theme.pageText} /></View><View style={styles.actionContent}><Text style={[styles.actionTitle, { color: theme.pageText }]}>{title}</Text><Text style={[styles.actionSubtitle, { color: theme.pageTextMuted }]}>{subtitle}</Text></View><Ionicons name={external ? "open-outline" : "chevron-forward"} size={19} color={theme.pageTextMuted} /></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { minHeight: 66, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 }, headerButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, headerTitle: { ...typography.heading3, flex: 1, textAlign: "center" },
  content: { width: "100%", maxWidth: 660, alignSelf: "center", paddingHorizontal: spacing.md }, hero: { alignItems: "center", paddingVertical: spacing.lg }, title: { ...typography.heading2, textAlign: "center", marginTop: 10 }, intro: { ...typography.body, textAlign: "center", marginTop: 7 },
  card: { minHeight: 96, marginBottom: 9, padding: spacing.md, borderRadius: radii.xl, borderWidth: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 }, iconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, cardContent: { flex: 1, minWidth: 0 }, cardTitle: { fontSize: 14, fontWeight: "900" }, cardBody: { ...typography.bodySmall, marginTop: 4 },
  sectionTitle: { ...typography.heading3, marginTop: spacing.lg, marginBottom: 8 }, actionRow: { minHeight: 82, marginBottom: 8, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, actionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, actionContent: { flex: 1, minWidth: 0 }, actionTitle: { fontSize: 14, fontWeight: "900" }, actionSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 3 }, supportButton: { minHeight: 48, marginTop: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, supportText: { fontSize: 14, fontWeight: "800" }
});
