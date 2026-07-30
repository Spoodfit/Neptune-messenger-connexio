import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { useSession } from "@/providers/SessionProvider";
import { colors, radii, spacing, typography } from "@/theme";

const pendingSettings = [
  {
    icon: "shield-checkmark-outline" as const,
    title: "Confidentialité",
    subtitle: "Blocage et signalement à connecter au backend Neptune"
  },
  {
    icon: "help-circle-outline" as const,
    title: "SAV application",
    subtitle: "Canal de support à connecter avant le pilote"
  }
];

function getEnvironmentLabel(): string {
  const buildProfile = Constants.expoConfig?.extra?.buildProfile;
  if (buildProfile === "production") return "Production";
  if (buildProfile === "preview") return "Préproduction";
  return "Développement";
}

export default function SettingsScreen() {
  const { currentUser, signOut } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      router.replace("/sign-in");
    } catch {
      setSignOutError(
        "La déconnexion a été bloquée car les messages locaux n’ont pas pu être supprimés en sécurité. Fermez puis relancez l’application avant de réessayer."
      );
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BrandHeader title="Réglages" subtitle="Compte et préférences Connexio." />

      <View
        accessible
        accessibilityLabel={`${currentUser.name}. ${currentUser.company}. ${currentUser.roleLabel}`}
        style={styles.profile}
      >
        <View style={styles.avatar} accessibilityElementsHidden>
          <Text style={styles.initials}>{currentUser.initials}</Text>
        </View>
        <View style={styles.profileContent}>
          <Text style={styles.name}>{currentUser.name}</Text>
          <Text style={styles.role}>
            {currentUser.company || "Neptune Business"} · {currentUser.roleLabel}
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir les réglages de notifications du téléphone"
          accessibilityHint="Ouvre les réglages système de Connexio"
          onPress={() => void Linking.openSettings()}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>Notifications</Text>
            <Text style={styles.rowSubtitle}>Autorisations système et alertes</Text>
          </View>
          <Ionicons name="open-outline" size={19} color={colors.textMuted} />
        </Pressable>

        {pendingSettings.map((item) => (
          <View
            accessible
            accessibilityLabel={`${item.title}. Non disponible dans ce build.`}
            key={item.title}
            style={[styles.row, styles.pendingRow]}
          >
            <Ionicons name={item.icon} size={22} color={colors.textMuted} />
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.pendingLabel}>À finaliser</Text>
          </View>
        ))}

        {signOutError ? (
          <Text
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={styles.signOutError}
          >
            {signOutError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter de Connexio"
          accessibilityState={{ disabled: signingOut, busy: signingOut }}
          disabled={signingOut}
          onPress={() => void handleSignOut()}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed && styles.rowPressed,
            signingOut && styles.disabled
          ]}
        >
          {signingOut ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              <Text style={styles.signOutText}>Se déconnecter</Text>
            </>
          )}
        </Pressable>
      </View>

      <Text style={styles.version}>
        Connexio {Constants.expoConfig?.version ?? "0.2.0"} · {getEnvironmentLabel()}
      </Text>
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
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  rowPressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  pendingRow: { opacity: 0.72 },
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
  pendingLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800"
  },
  signOutError: {
    ...typography.bodySmall,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.sm
  },
  signOutButton: {
    minHeight: 52,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  signOutText: { color: colors.danger, fontWeight: "900", fontSize: 15 },
  disabled: { opacity: 0.5 },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl
  }
});
