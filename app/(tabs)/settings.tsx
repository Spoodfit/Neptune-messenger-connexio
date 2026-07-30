import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { useSession } from "@/providers/SessionProvider";
import { colors, radii, spacing, typography } from "@/theme";

const settings = [
  {
    icon: "notifications-outline" as const,
    title: "Notifications",
    subtitle: "Nouveaux messages et mentions"
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Confidentialité",
    subtitle: "Visibilité, blocage et signalement"
  },
  {
    icon: "help-circle-outline" as const,
    title: "SAV application",
    subtitle: "Signaler une difficulté"
  }
];

export default function SettingsScreen() {
  const { currentUser } = useSession();

  return (
    <View style={styles.screen}>
      <BrandHeader title="Réglages" subtitle="Compte et préférences Connexio." />

      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{currentUser.initials}</Text>
        </View>
        <View style={styles.profileContent}>
          <Text style={styles.name}>{currentUser.name}</Text>
          <Text style={styles.role}>
            {currentUser.company} · {currentUser.roleLabel}
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {settings.map((item) => (
          <View key={item.title} style={styles.row}>
            <Ionicons name={item.icon} size={22} color={colors.primary} />
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={19}
              color={colors.textMuted}
            />
          </View>
        ))}
      </View>

      <Text style={styles.version}>Connexio 0.1.0 · MVP technique</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  profile: {
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  initials: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900"
  },
  profileContent: {
    flex: 1
  },
  name: {
    ...typography.heading2,
    color: colors.text
  },
  role: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 4
  },
  list: {
    marginHorizontal: spacing.md,
    gap: spacing.sm
  },
  row: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  rowContent: {
    flex: 1
  },
  rowTitle: {
    ...typography.heading3,
    color: colors.text
  },
  rowSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3
  },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl
  }
});
