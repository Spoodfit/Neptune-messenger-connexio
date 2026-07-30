import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { useSession } from "@/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";

const MAX_CONTENT_WIDTH = 720;

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
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <BrandHeader title="Profil" subtitle="Compte et préférences Connexio." />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentColumn}>
          <LinearGradient
            colors={gradients.glass}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            accessible
            accessibilityLabel={`${currentUser.name}. ${currentUser.company}. ${currentUser.roleLabel}`}
            style={styles.profile}
          >
            <LinearGradient
              colors={gradients.primaryWarm}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarShell}
              accessibilityElementsHidden
            >
              <View style={styles.avatar}>
                <Text style={styles.initials} numberOfLines={1}>
                  {currentUser.initials}
                </Text>
              </View>
            </LinearGradient>
            <View style={styles.profileContent}>
              <Text style={styles.name}>{currentUser.name}</Text>
              <Text style={styles.role}>
                {currentUser.company || "Neptune Business"} · {currentUser.roleLabel}
              </Text>
              <View style={styles.roleChip}>
                <View style={styles.roleDot} />
                <Text style={styles.roleChipText}>{currentUser.roleLabel}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.list}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ouvrir les réglages de notifications du téléphone"
              accessibilityHint="Ouvre les réglages système de Connexio"
              onPress={() => void Linking.openSettings()}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.iconShell}>
                <Ionicons
                  name="notifications-outline"
                  size={21}
                  color={colors.text}
                />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Notifications</Text>
                <Text style={styles.rowSubtitle}>
                  Autorisations système et alertes
                </Text>
              </View>
              <Ionicons
                accessibilityElementsHidden
                name="open-outline"
                size={18}
                color={colors.textMuted}
                style={styles.trailingIcon}
              />
            </Pressable>

            {pendingSettings.map((item) => (
              <View
                accessible
                accessibilityLabel={`${item.title}. Non disponible dans ce build.`}
                key={item.title}
                style={styles.row}
              >
                <View style={[styles.iconShell, styles.iconShellMuted]}>
                  <Ionicons name={item.icon} size={21} color={colors.textMuted} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingLabel}>À finaliser</Text>
                  </View>
                </View>
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
            Connexio {Constants.expoConfig?.version ?? "0.2.0"} ·{" "}
            {getEnvironmentLabel()}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    width: "100%",
    paddingBottom: 28
  },
  contentColumn: {
    width: "100%",
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: "center"
  },
  profile: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 7
  },
  avatarShell: {
    width: 64,
    height: 64,
    padding: 3,
    borderRadius: 22,
    flexShrink: 0,
    shadowColor: colors.violet,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 }
  },
  avatar: {
    flex: 1,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong
  },
  initials: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900"
  },
  profileContent: { flex: 1, minWidth: 0 },
  name: {
    ...typography.heading2,
    color: colors.text,
    flexShrink: 1
  },
  role: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 3,
    flexShrink: 1
  },
  roleChip: {
    alignSelf: "flex-start",
    marginTop: 9,
    minHeight: 26,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(107,79,234,0.34)",
    backgroundColor: "rgba(107,79,234,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  roleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.orange
  },
  roleChipText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.6
  },
  list: {
    marginHorizontal: spacing.md,
    gap: spacing.sm
  },
  row: {
    width: "100%",
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  rowPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  iconShell: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,72,186,0.20)",
    borderWidth: 1,
    borderColor: "rgba(0,72,186,0.30)",
    flexShrink: 0
  },
  iconShellMuted: {
    backgroundColor: colors.glass,
    borderColor: colors.borderSoft
  },
  trailingIcon: { marginTop: 10, flexShrink: 0 },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: {
    ...typography.heading3,
    color: colors.text,
    flexShrink: 1
  },
  rowSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
    flexShrink: 1
  },
  pendingBadge: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderSoft
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
    borderWidth: 1,
    borderColor: "rgba(255,123,134,0.22)",
    padding: spacing.sm
  },
  signOutButton: {
    minHeight: 52,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(255,123,134,0.36)",
    backgroundColor: colors.dangerSoft,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  signOutText: {
    color: colors.danger,
    fontWeight: "900",
    fontSize: 15,
    textAlign: "center"
  },
  disabled: { opacity: 0.5 },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md
  }
});
