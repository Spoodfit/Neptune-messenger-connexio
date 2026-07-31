import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSession } from "@/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";

interface AccountAction {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  destructive?: boolean;
}

const accountActions: AccountAction[] = [
  {
    icon: "cloud-download-outline",
    title: "Télécharger mes données",
    subtitle: "Archive sécurisée et temporaire"
  },
  {
    icon: "refresh-outline",
    title: "Resynchroniser le profil",
    subtitle: "Photo, statut, entreprise et préférences"
  },
  {
    icon: "trash-outline",
    title: "Supprimer mon compte",
    subtitle: "Confirmation forte et délai de traitement",
    destructive: true
  }
];

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useSession();

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Compte et sécurité</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.xl) }
        ]}
      >
        <View style={styles.identityCard}>
          <LinearGradient colors={gradients.primaryWarm} style={styles.avatar}>
            <Text style={styles.initials}>{currentUser.initials}</Text>
          </LinearGradient>
          <View style={styles.identityContent}>
            <Text style={styles.name}>{currentUser.name}</Text>
            <Text style={styles.meta}>
              {currentUser.company} · {currentUser.roleLabel}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Appareils et sessions</Text>
        <View style={styles.panel}>
          <View style={[styles.row, styles.divider]}>
            <View style={styles.rowIcon}>
              <Ionicons
                name="phone-portrait-outline"
                size={21}
                color={colors.success}
              />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Cet appareil</Text>
              <Text style={styles.rowSubtitle}>
                Session active · clé locale protégée
              </Text>
            </View>
            <View style={styles.currentBadge}>
              <Text style={styles.currentText}>Actuel</Text>
            </View>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Sessions",
                "Le backend doit lister les appareils, leur dernière activité et permettre une révocation ciblée."
              )
            }
            style={styles.row}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="desktop-outline" size={21} color={colors.orange} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>Voir toutes les sessions</Text>
              <Text style={styles.rowSubtitle}>
                Révoquer un appareil perdu ou inconnu
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Données du compte</Text>
        <View style={styles.panel}>
          {accountActions.map((action, index) => (
            <Pressable
              key={action.title}
              onPress={() =>
                Alert.alert(
                  action.title,
                  "Le parcours front est prêt. L’action et son suivi doivent être connectés au backend Neptune."
                )
              }
              style={[styles.row, index < accountActions.length - 1 && styles.divider]}
            >
              <View style={styles.rowIcon}>
                <Ionicons
                  name={action.icon}
                  size={21}
                  color={action.destructive ? colors.danger : colors.textSecondary}
                />
              </View>
              <View style={styles.rowContent}>
                <Text
                  style={[styles.rowTitle, action.destructive && styles.danger]}
                >
                  {action.title}
                </Text>
                <Text style={styles.rowSubtitle}>{action.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <View style={styles.note}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.orange}
          />
          <Text style={styles.noteText}>
            Connexio doit rester un client du compte Neptune Business. Les identités, rôles et suppressions ne doivent jamais diverger entre les deux applications.
          </Text>
        </View>
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
    maxWidth: 640,
    alignSelf: "center",
    paddingHorizontal: spacing.md
  },
  identityCard: {
    marginTop: spacing.md,
    minHeight: 84,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  initials: { color: colors.white, fontSize: 16, fontWeight: "900" },
  identityContent: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontSize: 15, fontWeight: "900" },
  meta: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: 8
  },
  panel: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  row: {
    minHeight: 72,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 11
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  rowSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  currentBadge: {
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  currentText: { color: colors.success, fontSize: 9, fontWeight: "900" },
  danger: { color: colors.danger },
  note: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  noteText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 }
});
