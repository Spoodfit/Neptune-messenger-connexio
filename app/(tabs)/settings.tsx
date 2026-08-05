import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { StatusAvatar } from "@/components/StatusAvatar";
import { useSession } from "@/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";

const MAX_CONTENT_WIDTH = 720;

function getEnvironmentLabel(): string {
  const buildProfile = Constants.expoConfig?.extra?.buildProfile;
  if (buildProfile === "production") return "Production";
  if (buildProfile === "preview") return "Préproduction";
  return "Développement";
}

const entries = [
  {
    icon: "person-circle-outline" as const,
    title: "Compte et sécurité",
    subtitle: "Appareils, sessions, export et suppression",
    route: "/account" as const
  },
  {
    icon: "notifications-outline" as const,
    title: "Notifications",
    subtitle: "Messages, mentions, groupes, appels et Temps forts",
    route: "/notification-settings" as const
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Confidentialité",
    subtitle: "Localisation, visibilité, blocage et données",
    route: "/privacy" as const
  },
  {
    icon: "person-remove-outline" as const,
    title: "Membres bloqués",
    subtitle: "Gérer les blocages et leurs effets",
    route: "/blocked-users" as const
  },
  {
    icon: "help-circle-outline" as const,
    title: "Aide et accès",
    subtitle: "Code de connexion et sécurité du compte",
    route: "/access-help" as const
  }
];

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
        "La déconnexion a été bloquée car les données locales n’ont pas pu être supprimées en sécurité. Fermez puis relancez l’application avant de réessayer."
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${currentUser.name}. ${currentUser.company}. ${currentUser.roleLabel}. Ouvrir mon compte.`}
            onPress={() => router.push("/account")}
          >
            <LinearGradient
              colors={gradients.glass}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.profile}
            >
              <StatusAvatar user={currentUser} size={62} showBadge accessible={false} />
              <View style={styles.profileContent}>
                <Text style={styles.name}>{currentUser.name}</Text>
                <Text style={styles.role} numberOfLines={2}>
                  {currentUser.company || "Neptune Business"} · {currentUser.roleLabel}
                </Text>
                <View style={styles.profileMeta}>
                  <View style={styles.roleChip}>
                    <View style={styles.roleDot} />
                    <Text style={styles.roleChipText}>{currentUser.roleLabel}</Text>
                  </View>
                  {currentUser.city ? (
                    <View style={styles.cityChip}>
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color={colors.textMuted}
                      />
                      <Text style={styles.cityText}>{currentUser.city}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </LinearGradient>
          </Pressable>

          <View style={styles.list}>
            {entries.map((item) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.title}
                key={item.title}
                onPress={() => router.push(item.route)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.iconShell}>
                  <Ionicons name={item.icon} size={21} color={colors.text} />
                </View>
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={colors.textMuted} />
              </Pressable>
            ))}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Contacter le support Connexio"
              onPress={() =>
                void Linking.openURL(
                  "mailto:contact@neptunebusiness.com?subject=Support%20Connexio"
                )
              }
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <View style={styles.iconShell}>
                <Ionicons name="chatbubbles-outline" size={21} color={colors.text} />
              </View>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>SAV application</Text>
                <Text style={styles.rowSubtitle}>
                  Signaler un problème ou demander de l’aide
                </Text>
              </View>
              <Ionicons name="mail-outline" size={19} color={colors.textMuted} />
            </Pressable>

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

          <Pressable
            onPress={() => void Linking.openSettings()}
            style={styles.systemSettings}
          >
            <Ionicons name="settings-outline" size={17} color={colors.textMuted} />
            <Text style={styles.systemSettingsText}>
              Réglages système de l’application
            </Text>
          </Pressable>

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
  scrollContent: { width: "100%", paddingBottom: 28 },
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
    shadowOffset: { width: 0, height: 12 }
  },
  avatarShell: {
    width: 62,
    height: 62,
    padding: 3,
    borderRadius: 22,
    flexShrink: 0
  },
  avatar: {
    flex: 1,
    borderRadius: 19,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: { width: "100%", height: "100%" },
  initials: { color: colors.white, fontSize: 18, fontWeight: "900" },
  profileContent: { flex: 1, minWidth: 0 },
  name: { ...typography.heading2, color: colors.text, flexShrink: 1 },
  role: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 3,
    flexShrink: 1
  },
  profileMeta: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: {
    minHeight: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: "rgba(107,79,234,0.20)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  roleChipText: { color: colors.textSecondary, fontSize: 11, fontWeight: "900" },
  cityChip: {
    minHeight: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  cityText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  list: { marginHorizontal: spacing.md, gap: spacing.sm },
  row: {
    width: "100%",
    minHeight: 72,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  rowPressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  iconShell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { ...typography.heading3, color: colors.text, flexShrink: 1 },
  rowSubtitle: {
    ...typography.caption,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginTop: 3,
    flexShrink: 1
  },
  signOutError: {
    ...typography.bodySmall,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.md,
    padding: spacing.sm
  },
  signOutButton: {
    height: 54,
    minHeight: 54,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 0,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    overflow: "hidden"
  },
  signOutText: {
    color: colors.danger,
    fontWeight: "900",
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: Platform.OS === "android" ? false : undefined
  },
  disabled: { opacity: 0.5 },
  systemSettings: {
    minHeight: 48,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  systemSettingsText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  version: {
    ...typography.caption,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.md
  }
});
