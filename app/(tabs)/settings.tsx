import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BrandHeader } from "@/components/BrandHeader";
import { LanguagePickerModal } from "@/components/LanguagePickerModal";
import { StatusAvatar } from "@/components/StatusAvatar";
import { capabilitiesForBackendContract } from "@/config/backendCapabilities";
import { env } from "@/config/env";
import { useExperience } from "@/providers/ExperienceProvider";
import { useAppLanguage } from "@/providers/LanguageProvider";
import { useSession } from "@/providers/SessionProvider";
import { type ConnexioAppearanceMode, useAppTheme } from "@/providers/ThemeProvider";
import { colors, gradients, spacing, typography } from "@/theme";
import { SUPPORTED_LANGUAGES } from "@/i18n/languages";

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
].filter((item) => item.route !== "/notification-settings" || BACKEND_CAPABILITIES.notificationPreferences)
  .filter((item) => item.route !== "/blocked-users" || BACKEND_CAPABILITIES.blockedMembers);

const APPEARANCE_OPTIONS: Array<{ mode: ConnexioAppearanceMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { mode: "system", label: "Système", icon: "phone-portrait-outline" },
  { mode: "dark", label: "Sombre", icon: "moon-outline" },
  { mode: "light", label: "Clair", icon: "sunny-outline" }
];

export default function SettingsScreen() {
  const { currentUser, signOut } = useSession();
  const { posts } = useExperience();
  const theme = useAppTheme();
  const { mode: languageMode, language } = useAppLanguage();
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
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
    setSigningOut(true);
    setSignOutError(null);
    try { await signOut(); router.replace("/sign-in"); }
    catch { setSignOutError("La déconnexion a été bloquée car les données locales n’ont pas pu être supprimées en sécurité."); }
    finally { setSigningOut(false); }
  };

  const openBusinessProfile = () => {
    const url = currentUser.webProfileUrl ?? `${env.businessWebBaseUrl.replace(/\/$/, "")}/profile/${encodeURIComponent(currentUser.id)}`;
    void Linking.openURL(url);
  };

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <BrandHeader title="Profil" subtitle="Votre vitrine professionnelle dans Connexio." />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.contentColumn}>
          <LinearGradient
            colors={theme.isLight ? [theme.surface, theme.surfaceStrong] : gradients.glass}
            start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={[styles.hero, { borderColor: theme.borderSoft, shadowColor: theme.shadow }]}
          >
            <StatusAvatar user={currentUser} size={84} showBadge accessible={false} />
            <Text style={[styles.name, { color: theme.pageText }]}>{currentUser.name}</Text>
            <Text style={[styles.company, { color: theme.pageTextSecondary }]}>{currentUser.company || "Neptune Business"}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.metaChip, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="ribbon-outline" size={13} color={theme.orange} /><Text style={[styles.metaText, { color: theme.pageTextMuted }]}>{currentUser.roleLabel}</Text></View>
              {currentUser.city ? <View style={[styles.metaChip, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="location-outline" size={13} color={theme.pageTextMuted} /><Text style={[styles.metaText, { color: theme.pageTextMuted }]}>{currentUser.city}</Text></View> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir mon profil Neptune Business" onPress={openBusinessProfile} style={[styles.businessLink, { borderColor: theme.violet, backgroundColor: theme.violetSoft }]}><Ionicons name="open-outline" size={17} color={theme.pageText} /><Text style={[styles.businessLinkText, { color: theme.pageText }]}>Voir / mettre à jour sur Neptune Business</Text></Pressable>
          </LinearGradient>

          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>Mon activité</Text><Text style={[styles.sectionSubtitle, { color: theme.pageTextMuted }]}>Services, produits et activités synchronisés avec votre profil Neptune.</Text></View>
          <View style={styles.businessGrid}>{businessItems.map((item, index) => (
            <Pressable key={item.id ?? `${item.title}-${index}`} onPress={item.url ? () => void Linking.openURL(item.url!) : openBusinessProfile} style={({ pressed }) => [styles.businessCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}>
              <View style={[styles.businessIcon, { backgroundColor: theme.orangeSoft }]}><Ionicons name={item.kind === "product" ? "cube-outline" : item.kind === "service" ? "briefcase-outline" : "business-outline"} size={21} color={theme.orange} /></View>
              <Text style={[styles.businessTitle, { color: theme.pageText }]}>{item.title}</Text>
              {item.description ? <Text style={[styles.businessDescription, { color: theme.pageTextMuted }]} numberOfLines={3}>{item.description}</Text> : null}
              <View style={styles.businessFooter}><Text style={[styles.businessKind, { color: theme.orange }]}>{item.kind === "product" ? "PRODUIT" : item.kind === "service" ? "SERVICE" : "ACTIVITÉ"}</Text><Ionicons name="chevron-forward" size={15} color={theme.pageTextMuted} /></View>
            </Pressable>
          ))}</View>

          {recentPosts.length > 0 ? <><View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>Mes derniers Temps forts</Text></View><View style={styles.recentPosts}>{recentPosts.map((post) => <Pressable key={post.id} onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)} style={({ pressed }) => [styles.postCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><Text style={[styles.postKind, { color: theme.orange }]}>{post.kind.toLocaleUpperCase("fr")}</Text><Text numberOfLines={2} style={[styles.postText, { color: theme.pageTextSecondary }]}>{post.body}</Text><Ionicons name="chevron-forward" size={17} color={theme.pageTextMuted} /></Pressable>)}</View></> : null}

          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>Apparence</Text><Text style={[styles.sectionSubtitle, { color: theme.pageTextMuted }]}>Connexio peut suivre automatiquement le thème de votre téléphone.</Text></View>
          <View style={[styles.appearanceCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
            {APPEARANCE_OPTIONS.map((option) => {
              const active = theme.mode === option.mode;
              return <Pressable key={option.mode} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => theme.setMode(option.mode)} style={[styles.appearanceOption, active && { backgroundColor: theme.accentSoft }]}><Ionicons name={option.icon} size={20} color={active ? theme.accent : theme.pageTextMuted} /><Text style={[styles.appearanceText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{option.label}</Text>{active ? <Ionicons name="checkmark-circle" size={19} color={theme.accent} /> : null}</Pressable>;
            })}
          </View>

          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>Langue</Text><Text style={[styles.sectionSubtitle, { color: theme.pageTextMuted }]}>Choisissez la langue par défaut de Connexio et des traductions automatiques.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Changer la langue de Connexio" onPress={() => setLanguagePickerOpen(true)} style={({ pressed }) => [styles.languageCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><View style={[styles.rowIcon, { backgroundColor: theme.accentSoft }]}><Ionicons name="language-outline" size={22} color={theme.accent} /></View><View style={styles.rowContent}><Text style={[styles.rowTitle, { color: theme.pageText }]}>{languageMode === "system" ? "Langue du téléphone" : SUPPORTED_LANGUAGES.find((item) => item.code === language)?.nativeName ?? language.toLocaleUpperCase()}</Text><Text style={[styles.rowSubtitle, { color: theme.pageTextMuted }]}>Langue active : {SUPPORTED_LANGUAGES.find((item) => item.code === language)?.frenchName ?? language.toLocaleUpperCase()}</Text></View><Ionicons name="chevron-forward" size={19} color={theme.pageTextMuted} /></Pressable>

          <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>Réglages</Text><Text style={[styles.sectionSubtitle, { color: theme.pageTextMuted }]}>Les fonctions sont classées par usage pour retrouver rapidement ce que vous cherchez.</Text></View>
          <View style={styles.settingsList}>
            {settingsEntries.map((item) => <Pressable key={item.title} accessibilityRole="button" onPress={() => router.push(item.route)} style={({ pressed }) => [styles.row, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><View style={[styles.rowIcon, { backgroundColor: theme.surfaceStrong }]}><Ionicons name={item.icon} size={21} color={theme.pageText} /></View><View style={styles.rowContent}><Text style={[styles.rowTitle, { color: theme.pageText }]}>{item.title}</Text><Text style={[styles.rowSubtitle, { color: theme.pageTextMuted }]}>{item.subtitle}</Text></View><Ionicons name="chevron-forward" size={19} color={theme.pageTextMuted} /></Pressable>)}
            <Pressable onPress={() => void Linking.openURL("mailto:contact@neptunebusiness.com?subject=Support%20Connexio")} style={({ pressed }) => [styles.row, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><View style={[styles.rowIcon, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="chatbubbles-outline" size={21} color={theme.pageText} /></View><View style={styles.rowContent}><Text style={[styles.rowTitle, { color: theme.pageText }]}>SAV application</Text><Text style={[styles.rowSubtitle, { color: theme.pageTextMuted }]}>Signaler un problème ou demander de l’aide</Text></View><Ionicons name="mail-outline" size={19} color={theme.pageTextMuted} /></Pressable>
          </View>

          {signOutError ? <Text accessibilityRole="alert" style={[styles.signOutError, { color: theme.danger, backgroundColor: theme.dangerSoft }]}>{signOutError}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityLabel="Se déconnecter de Connexio" disabled={signingOut} onPress={() => void handleSignOut()} style={({ pressed }) => [styles.signOutButton, { borderColor: theme.danger, backgroundColor: theme.dangerSoft }, pressed && styles.pressed, signingOut && styles.disabled]}>{signingOut ? <ActivityIndicator color={theme.danger} /> : <><Ionicons name="log-out-outline" size={22} color={theme.danger} /><View style={styles.signOutContent}><Text style={[styles.signOutText, { color: theme.danger }]}>Se déconnecter</Text><Text style={[styles.signOutHint, { color: theme.pageTextMuted }]}>Action rapide — aucune suppression de compte</Text></View></>}</Pressable>
          <Pressable onPress={() => void Linking.openSettings()} style={styles.systemSettings}><Ionicons name="settings-outline" size={17} color={theme.pageTextMuted} /><Text style={[styles.systemSettingsText, { color: theme.pageTextMuted }]}>Réglages système de l’application</Text></Pressable>
          <Text style={[styles.version, { color: theme.pageTextMuted }]}>Connexio {Constants.expoConfig?.version ?? "1.0.0"} · {getEnvironmentLabel()}</Text>
        </View>
      </ScrollView>
      <LanguagePickerModal visible={languagePickerOpen} onClose={() => setLanguagePickerOpen(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, scrollContent: { width: "100%", paddingBottom: 32 }, contentColumn: { width: "100%", maxWidth: MAX_CONTENT_WIDTH, alignSelf: "center" },
  hero: { margin: spacing.md, padding: spacing.lg, borderRadius: 28, borderWidth: 1, alignItems: "center", shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 5 }, name: { ...typography.heading2, marginTop: 12, textAlign: "center" }, company: { ...typography.body, marginTop: 3, textAlign: "center" }, metaRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 }, metaChip: { minHeight: 30, paddingHorizontal: 9, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 6 }, metaText: { fontSize: 11, fontWeight: "800" }, businessLink: { minHeight: 48, marginTop: 14, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, businessLinkText: { fontSize: 14, lineHeight: 19, fontWeight: "900", textAlign: "center" },
  sectionHeading: { marginHorizontal: spacing.md, marginTop: spacing.lg, marginBottom: 10 }, sectionTitle: { ...typography.heading2 }, sectionSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  businessGrid: { marginHorizontal: spacing.md, flexDirection: "row", flexWrap: "wrap", gap: 10 }, businessCard: { flexGrow: 1, flexBasis: 210, minHeight: 158, padding: 14, borderRadius: 20, borderWidth: 1 }, businessIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, businessTitle: { ...typography.heading3, marginTop: 10 }, businessDescription: { fontSize: 14, lineHeight: 20, marginTop: 5, flex: 1 }, businessFooter: { marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, businessKind: { fontSize: 11, fontWeight: "900" },
  recentPosts: { marginHorizontal: spacing.md, gap: 8 }, postCard: { minHeight: 70, padding: 12, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, postKind: { fontSize: 11, fontWeight: "900" }, postText: { flex: 1, fontSize: 14, lineHeight: 20 },
  appearanceCard: { marginHorizontal: spacing.md, padding: 5, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 5 }, appearanceOption: { flex: 1, minHeight: 56, paddingHorizontal: 8, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 3 }, appearanceText: { fontSize: 11, fontWeight: "900" },
  languageCard: { minHeight: 70, marginHorizontal: spacing.md, padding: 10, borderRadius: 19, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  settingsList: { marginHorizontal: spacing.md, gap: 8 }, row: { minHeight: 72, padding: 12, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 }, rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, rowContent: { flex: 1, minWidth: 0 }, rowTitle: { ...typography.heading3 }, rowSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 3 }, pressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  signOutError: { margin: spacing.md, borderRadius: 14, padding: 12 }, signOutButton: { minHeight: 68, marginHorizontal: spacing.md, marginTop: spacing.lg, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 }, signOutContent: { flex: 1 }, signOutText: { fontSize: 14, fontWeight: "900" }, signOutHint: { fontSize: 14, lineHeight: 19, marginTop: 2 }, disabled: { opacity: 0.5 }, systemSettings: { minHeight: 48, marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, systemSettingsText: { fontSize: 14, fontWeight: "800" }, version: { fontSize: 11, textAlign: "center", marginBottom: 8 }
});
