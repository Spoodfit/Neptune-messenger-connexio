import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { StatusAvatar } from "@/components/StatusAvatar";
import { capabilitiesForBackendContract } from "@/config/backendCapabilities";
import { env } from "@/config/env";
import { useExperience } from "@/providers/ExperienceProvider";
import { useSession } from "@/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "@/theme";

const MAX_CONTENT_WIDTH = 720;
const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);
type BusinessItem = { id?: string; kind?: "service" | "product" | "activity"; title?: string; description?: string; url?: string };

function getEnvironmentLabel(): string {
  const buildProfile = Constants.expoConfig?.extra?.buildProfile;
  if (buildProfile === "production") return "Production";
  if (buildProfile === "preview" || buildProfile === "standalone") return "Préproduction";
  return "Développement";
}

const settingsEntries = [
  { icon: "notifications-outline" as const, title: "Notifications", subtitle: "Messages, mentions, groupes, appels et Temps forts", route: "/notification-settings" as const },
  { icon: "shield-checkmark-outline" as const, title: "Confidentialité", subtitle: "Visibilité, localisation, blocage et données", route: "/privacy" as const },
  { icon: "person-circle-outline" as const, title: "Compte et sécurité", subtitle: "Sessions, appareils, export et gestion du compte", route: "/account" as const },
  { icon: "person-remove-outline" as const, title: "Membres bloqués", subtitle: "Gérer les blocages", route: "/blocked-users" as const },
  { icon: "help-circle-outline" as const, title: "Aide et accès", subtitle: "Connexion, sécurité et assistance", route: "/access-help" as const }
].filter((item) => item.route !== "/notification-settings" || BACKEND_CAPABILITIES.notificationPreferences).filter((item) => item.route !== "/blocked-users" || BACKEND_CAPABILITIES.blockedMembers);

export default function SettingsScreen() {
  const { currentUser, signOut } = useSession();
  const { posts } = useExperience();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const businessItems = useMemo(() => {
    const synced = ((currentUser as typeof currentUser & { businessItems?: BusinessItem[] }).businessItems ?? []).filter((item) => item.title?.trim());
    if (synced.length > 0) return synced.slice(0, 6);
    return [{ id: "company", kind: "activity" as const, title: currentUser.company || "Mon activité", description: currentUser.city ? `Activité professionnelle · ${currentUser.city}` : "Activité professionnelle synchronisée avec Neptune Business." }];
  }, [currentUser]);
  const recentPosts = posts.filter((post) => post.author.id === currentUser.id).slice(0, 3);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true); setSignOutError(null);
    try { await signOut(); router.replace("/sign-in"); }
    catch { setSignOutError("La déconnexion a été bloquée car les données locales n’ont pas pu être supprimées en sécurité."); }
    finally { setSigningOut(false); }
  };
  const openBusinessProfile = () => {
    const url = currentUser.webProfileUrl ?? `${env.businessWebBaseUrl.replace(/\/$/, "")}/profile/${encodeURIComponent(currentUser.id)}`;
    void Linking.openURL(url);
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <BrandHeader title="Profil" subtitle="Votre vitrine professionnelle dans Connexio." />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentColumn}>
          <LinearGradient colors={gradients.glass} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.hero}>
            <StatusAvatar user={currentUser} size={84} showBadge accessible={false} />
            <Text style={styles.name}>{currentUser.name}</Text>
            <Text style={styles.company}>{currentUser.company || "Neptune Business"}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaChip}><Ionicons name="ribbon-outline" size={13} color={colors.orange} /><Text style={styles.metaText}>{currentUser.roleLabel}</Text></View>
              {currentUser.city ? <View style={styles.metaChip}><Ionicons name="location-outline" size={13} color={colors.textMuted} /><Text style={styles.metaText}>{currentUser.city}</Text></View> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir mon profil Neptune Business" onPress={openBusinessProfile} style={styles.businessLink}><Ionicons name="open-outline" size={17} color={colors.text} /><Text style={styles.businessLinkText}>Voir / mettre à jour sur Neptune Business</Text></Pressable>
          </LinearGradient>

          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Mon activité</Text><Text style={styles.sectionSubtitle}>Services, produits et activités synchronisés avec votre profil Neptune.</Text></View>
          <View style={styles.businessGrid}>
            {businessItems.map((item, index) => <Pressable key={item.id ?? `${item.title}-${index}`} onPress={item.url ? () => void Linking.openURL(item.url!) : openBusinessProfile} style={({ pressed }) => [styles.businessCard, pressed && styles.pressed]}><View style={styles.businessIcon}><Ionicons name={item.kind === "product" ? "cube-outline" : item.kind === "service" ? "briefcase-outline" : "business-outline"} size={21} color={colors.orange} /></View><Text style={styles.businessTitle}>{item.title}</Text>{item.description ? <Text style={styles.businessDescription} numberOfLines={3}>{item.description}</Text> : null}<View style={styles.businessFooter}><Text style={styles.businessKind}>{item.kind === "product" ? "PRODUIT" : item.kind === "service" ? "SERVICE" : "ACTIVITÉ"}</Text><Ionicons name="chevron-forward" size={15} color={colors.textMuted} /></View></Pressable>)}
          </View>

          {recentPosts.length > 0 ? <><View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Mes derniers Temps forts</Text></View><View style={styles.recentPosts}>{recentPosts.map((post) => <Pressable key={post.id} onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)} style={({ pressed }) => [styles.postCard, pressed && styles.pressed]}><Text style={styles.postKind}>{post.kind.toLocaleUpperCase("fr")}</Text><Text numberOfLines={2} style={styles.postText}>{post.body}</Text><Ionicons name="chevron-forward" size={17} color={colors.textMuted} /></Pressable>)}</View></> : null}

          <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>Réglages</Text><Text style={styles.sectionSubtitle}>Les fonctions sont classées par usage pour retrouver rapidement ce que vous cherchez.</Text></View>
          <View style={styles.settingsList}>
            {settingsEntries.map((item) => <Pressable key={item.title} accessibilityRole="button" onPress={() => router.push(item.route)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}><Ionicons name={item.icon} size={21} color={colors.text} /></View><View style={styles.rowContent}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.rowSubtitle}>{item.subtitle}</Text></View><Ionicons name="chevron-forward" size={19} color={colors.textMuted} /></Pressable>)}
            <Pressable onPress={() => void Linking.openURL("mailto:contact@neptunebusiness.com?subject=Support%20Connexio")} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}><Ionicons name="chatbubbles-outline" size={21} color={colors.text} /></View><View style={styles.rowContent}><Text style={styles.rowTitle}>SAV application</Text><Text style={styles.rowSubtitle}>Signaler un problème ou demander de l’aide</Text></View><Ionicons name="mail-outline" size={19} color={colors.textMuted} /></Pressable>
          </View>

          {signOutError ? <Text accessibilityRole="alert" style={styles.signOutError}>{signOutError}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Se déconnecter de Connexio" disabled={signingOut} onPress={() => void handleSignOut()} style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed, signingOut && styles.disabled]}>{signingOut ? <ActivityIndicator color={colors.danger} /> : <><Ionicons name="log-out-outline" size={22} color={colors.danger} /><View style={styles.signOutContent}><Text style={styles.signOutText}>Se déconnecter</Text><Text style={styles.signOutHint}>Action rapide — aucune suppression de compte</Text></View></>}</Pressable>

          <Pressable onPress={() => void Linking.openSettings()} style={styles.systemSettings}><Ionicons name="settings-outline" size={17} color={colors.textMuted} /><Text style={styles.systemSettingsText}>Réglages système de l’application</Text></Pressable>
          <Text style={styles.version}>Connexio {Constants.expoConfig?.version ?? "1.0.0"} · {getEnvironmentLabel()}</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, scrollContent: { width: "100%", paddingBottom: 32 }, contentColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  hero: { margin: spacing.md, padding: spacing.lg, borderRadius: 28, borderWidth: 1, borderColor: colors.borderSoft, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.22, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } }, name: { ...typography.heading2, color: colors.text, marginTop: 12, textAlign: "center" }, company: { ...typography.body, color: colors.textSecondary, marginTop: 3, textAlign: "center" }, metaRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }, metaChip: { minHeight: 28, paddingHorizontal: 9, borderRadius: 14, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 6 }, metaText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" }, businessLink: { minHeight: 48, marginTop: 14, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: "rgba(107,79,234,0.14)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, businessLinkText: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: "900", textAlign: "center" },
  sectionHeading: { marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: 10 }, sectionTitle: { ...typography.heading2, color: colors.text }, sectionSubtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 4 },
  businessGrid: { marginHorizontal: spacing.md, flexDirection: "row", flexWrap: "wrap", gap: 10 }, businessCard: { flexGrow: 1, flexBasis: 210, minHeight: 158, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface }, businessIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "rgba(244,177,131,0.12)", alignItems: "center", justifyContent: "center" }, businessTitle: { ...typography.heading3, color: colors.text, marginTop: 10 }, businessDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 5, flex: 1 }, businessFooter: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, businessKind: { color: colors.orange, fontSize: 11, fontWeight: "900" },
  recentPosts: { marginHorizontal: spacing.md, gap: 8 }, postCard: { minHeight: 70, padding: 12, borderRadius: 17, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 10 }, postKind: { color: colors.orange, fontSize: 11, fontWeight: "900" }, postText: { flex: 1, color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  settingsList: { marginHorizontal: spacing.md, gap: 8 }, row: { minHeight: 72, padding: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 12 }, rowIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceStrong, alignItems: "center", justifyContent: "center" }, rowContent: { flex: 1, minWidth: 0 }, rowTitle: { ...typography.heading3, color: colors.text }, rowSubtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 3 }, pressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  signOutError: { margin: spacing.md, color: colors.danger, backgroundColor: colors.dangerSoft, borderRadius: 14, padding: 12 }, signOutButton: { minHeight: 68, marginHorizontal: spacing.md, marginTop: spacing.lg, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.danger, backgroundColor: colors.dangerSoft, flexDirection: "row", alignItems: "center", gap: 12 }, signOutContent: { flex: 1 }, signOutText: { color: colors.danger, fontSize: 14, fontWeight: "900" }, signOutHint: { color: colors.textMuted, fontSize: 14, lineHeight: 19, marginTop: 2 }, disabled: { opacity: 0.5 },
  systemSettings: { minHeight: 48, marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, systemSettingsText: { color: colors.textMuted, fontSize: 14, fontWeight: "800" }, version: { color: colors.textMuted, fontSize: 11, textAlign: "center", marginBottom: 8 }
});
