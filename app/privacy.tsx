import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { env } from "@/config/env";
import { colors, gradients, radii, spacing, typography } from "@/theme";

const sections = [
  {
    icon: "location-outline" as const,
    title: "Localisation et Map",
    body: "La localisation n’est utilisée que lorsque vous déclenchez une fonction qui en a besoin. Vous pouvez utiliser le Ghost Mode et modifier vos autorisations depuis les réglages du téléphone."
  },
  {
    icon: "people-outline" as const,
    title: "Visibilité du profil",
    body: "La visibilité de votre photo, téléphone, présence, localisation approximative et contenus dépend de vos réglages et des règles de votre espace Neptune."
  },
  {
    icon: "lock-closed-outline" as const,
    title: "Conversations",
    body: "Les messages, pièces jointes, appels et notifications sont réservés aux membres autorisés de la conversation et protégés par les contrôles d’accès Neptune."
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Blocage et signalement",
    body: "Vous pouvez bloquer un membre et signaler un profil ou un contenu. Les signalements sont transmis à la modération Neptune."
  }
];

async function openExternalUrl(label: string, url: string): Promise<void> {
  if (!url) {
    Alert.alert(label, "Ce lien est temporairement indisponible.");
    return;
  }
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    Alert.alert(label, "Ce lien ne peut pas être ouvert sur cet appareil.");
    return;
  }
  await Linking.openURL(url);
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Confidentialité
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Ionicons name="shield-checkmark" size={34} color={colors.success} />
          <Text style={styles.title}>Vos données restent sous votre contrôle</Text>
          <Text style={styles.intro}>
            Gérez ici les informations essentielles liées à la confidentialité, à la modération et à vos droits sur votre compte Connexio.
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

        <Text style={styles.sectionTitle}>Documents et droits</Text>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Lire la politique de confidentialité"
          onPress={() => void openExternalUrl("Politique de confidentialité", env.privacyPolicyUrl)}
          style={styles.actionRow}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="document-text-outline" size={20} color={colors.text} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Politique de confidentialité</Text>
            <Text style={styles.actionSubtitle}>
              Données collectées, finalités, destinataires, conservation et exercice de vos droits.
            </Text>
          </View>
          <Ionicons name="open-outline" size={19} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Lire les conditions d’utilisation"
          onPress={() => void openExternalUrl("Conditions d’utilisation", env.termsUrl)}
          style={styles.actionRow}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="reader-outline" size={20} color={colors.text} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Conditions d’utilisation</Text>
            <Text style={styles.actionSubtitle}>
              Conditions applicables à l’utilisation des services Neptune et de Connexio.
            </Text>
          </View>
          <Ionicons name="open-outline" size={19} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir les règles communautaires"
          onPress={() => router.push("/community-guidelines")}
          style={styles.actionRow}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="people-circle-outline" size={20} color={colors.text} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Règles communautaires</Text>
            <Text style={styles.actionSubtitle}>
              Contenus interdits, signalement, blocage et règles de modération.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Gérer l’export et la suppression du compte"
          onPress={() => router.push("/account")}
          style={styles.actionRow}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="person-circle-outline" size={20} color={colors.text} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Mes données et mon compte</Text>
            <Text style={styles.actionSubtitle}>
              Télécharger vos données, consulter vos sessions ou demander la suppression de votre compte.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Accéder à la page de suppression du compte"
          onPress={() => void openExternalUrl("Suppression du compte", env.accountDeletionUrl)}
          style={styles.actionRow}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Suppression du compte sur le web</Text>
            <Text style={styles.actionSubtitle}>
              Accéder à la procédure de suppression même si vous ne pouvez plus utiliser l’application.
            </Text>
          </View>
          <Ionicons name="open-outline" size={19} color={colors.textMuted} />
        </Pressable>

        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Contacter le support Neptune"
          onPress={() => void openExternalUrl("Support Neptune", env.supportUrl)}
          style={styles.supportButton}
        >
          <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
          <Text style={styles.supportText}>Contacter le support Neptune</Text>
        </Pressable>
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
    minHeight: 82,
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
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  actionContent: { flex: 1, minWidth: 0 },
  actionTitle: { color: colors.text, fontSize: 14, fontWeight: "900" },
  actionSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3
  },
  supportButton: {
    minHeight: 48,
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  supportText: { color: colors.textSecondary, fontSize: 14, fontWeight: "800" }
});
