import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import { BrandHeader } from "../components/BrandHeader";
import { LanguagePickerModal } from "../components/LanguagePickerModal";
import { MemberStatusBadge } from "../components/MemberStatusBadge";
import { StatusAvatar } from "../components/StatusAvatar";
import { env } from "../config/env";
import { useExperience } from "../providers/ExperienceProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { gradients, spacing, typography } from "../theme";

type BusinessItem = { id?: string; kind?: "service" | "product" | "activity"; title?: string; description?: string; url?: string };
type OwnUniverse = { businessItems?: BusinessItem[]; headline?: string; bio?: string; sector?: string; canHelpWith?: string[]; lookingFor?: string[]; expertise?: string[] };

const SETTINGS = [
  ["notifications-outline", "Notifications", "/notification-settings"],
  ["shield-checkmark-outline", "Confidentialité", "/privacy"],
  ["person-circle-outline", "Compte et sécurité", "/account"],
  ["help-circle-outline", "Aide et accès", "/access-help"]
] as const;

export default function OwnProfileScreenV20() {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compactIdentity = width < 360;
  const { localeTag } = useAppLanguage();
  const { currentUser, signOut } = useSession();
  const { posts } = useExperience();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const universe = currentUser as typeof currentUser & OwnUniverse;
  const headline = universe.headline?.trim() || universe.sector?.trim() || `Entrepreneur · ${currentUser.company}`;
  const canHelpWith = (universe.canHelpWith ?? universe.expertise ?? []).filter(Boolean).slice(0, 6);
  const lookingFor = (universe.lookingFor ?? []).filter(Boolean).slice(0, 6);
  const businessItems = useMemo<BusinessItem[]>(() => {
    const synced = (universe.businessItems ?? []).filter((item) => item.title?.trim()).slice(0, 6);
    return synced.length ? synced : [{ id: "company", kind: "activity", title: currentUser.company || "Mon activité", description: currentUser.city ? `Activité professionnelle à ${currentUser.city}` : "Activité professionnelle synchronisée avec Neptune Business." }];
  }, [currentUser.city, currentUser.company, universe.businessItems]);
  const recentPosts = posts.filter((post) => post.author.id === currentUser.id).slice(0, 4);

  const openProfileEditor = () => {
    const url = currentUser.webProfileUrl ?? `${env.businessWebBaseUrl.replace(/\/$/, "")}/profile/${encodeURIComponent(currentUser.id)}`;
    void Linking.openURL(url);
  };
  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try { await signOut(); router.replace("/sign-in"); } finally { setSigningOut(false); }
  };

  return <LinearGradient colors={theme.pageGradient} style={styles.screen}>
    <BrandHeader title="Profil" subtitle="Votre univers professionnel et vos réglages Connexio." />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={theme.isLight ? [theme.surface, theme.accentSoft] : gradients.glass} style={[styles.hero, { borderColor: theme.borderSoft }]}>
        <View style={[styles.identityRow, compactIdentity && styles.identityRowCompact]}>
          <StatusAvatar user={currentUser} size={compactIdentity ? 84 : 92} />
          <View style={[styles.identityCopy, compactIdentity && styles.identityCopyCompact]}>
            <View style={[styles.availabilityRow, compactIdentity && styles.centeredRow]}><View style={[styles.availabilityDot, { backgroundColor: currentUser.online ? theme.success : theme.pageTextMuted }]} /><Text style={[styles.availabilityText, { color: currentUser.online ? theme.success : theme.pageTextMuted }]}>{currentUser.online ? "Disponible" : "Hors ligne"}</Text></View>
            <Text style={[styles.name, { color: theme.pageText }, compactIdentity && styles.centeredText]}>{currentUser.name}</Text>
            <Text style={[styles.headline, { color: theme.pageTextSecondary }, compactIdentity && styles.centeredText]}>{headline}</Text>
            <View style={[styles.metaRow, compactIdentity && styles.metaRowCompact]}><MemberStatusBadge role={currentUser.role} compact />{currentUser.city ? <View style={[styles.metaPill, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="location-outline" size={14} color={theme.pageTextMuted} /><Text numberOfLines={1} style={[styles.metaText, { color: theme.pageTextMuted }]}>{currentUser.city}</Text></View> : null}</View>
          </View>
        </View>
        {universe.bio?.trim() ? <Text style={[styles.bio, { color: theme.pageTextSecondary }]}>{universe.bio.trim()}</Text> : null}
        <View style={styles.heroActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Modifier mon profil" onPress={openProfileEditor} style={[styles.editButton, { backgroundColor: theme.accent }]}><Ionicons name="create-outline" size={19} color="#fff" /><Text style={styles.whiteText}>Modifier mon profil</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Prévisualiser mon profil public" onPress={() => router.push(`/profile/${encodeURIComponent(currentUser.id)}`)} style={[styles.previewButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="eye-outline" size={19} color={theme.pageText} /><Text style={[styles.previewText, { color: theme.pageText }]}>Vue membre</Text></Pressable>
        </View>
      </LinearGradient>

      {(canHelpWith.length || lookingFor.length) ? <><SectionTitle title="Pourquoi se connecter ?" subtitle="Ce que les autres membres voient immédiatement pour savoir comment échanger avec vous." /><View style={styles.intentGrid}>{canHelpWith.length ? <Intent title="Je peux aider sur" icon="hand-left-outline" items={canHelpWith} color={theme.success} background={theme.successSoft} /> : null}{lookingFor.length ? <Intent title="Je recherche" icon="search-outline" items={lookingFor} color={theme.orange} background={theme.orangeSoft} /> : null}</View></> : null}

      <SectionTitle title="Mon univers professionnel" subtitle="Services, produits et activités synchronisés avec Neptune Business." />
      <View style={styles.businessGrid}>{businessItems.map((item, index) => <Pressable key={item.id ?? `${item.title}-${index}`} onPress={item.url ? () => void Linking.openURL(item.url!) : openProfileEditor} style={({ pressed }) => [styles.businessCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><View style={[styles.businessIcon, { backgroundColor: item.kind === "product" ? theme.violetSoft : item.kind === "service" ? theme.accentSoft : theme.orangeSoft }]}><Ionicons name={item.kind === "product" ? "cube-outline" : item.kind === "service" ? "briefcase-outline" : "business-outline"} size={22} color={item.kind === "product" ? theme.violet : item.kind === "service" ? theme.accent : theme.orange} /></View><Text style={[styles.businessTitle, { color: theme.pageText }]}>{item.title}</Text>{item.description ? <Text style={[styles.businessDescription, { color: theme.pageTextMuted }]}>{item.description}</Text> : null}<View style={styles.businessFooter}><Text style={[styles.businessCta, { color: theme.accent }]}>Modifier</Text><Ionicons name="chevron-forward" size={16} color={theme.pageTextMuted} /></View></Pressable>)}</View>

      <SectionTitle title="Activité récente" subtitle="Vos derniers Temps forts dans Connexio." />
      {recentPosts.length ? <View style={styles.posts}>{recentPosts.map((post) => <Pressable key={post.id} onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)} style={({ pressed }) => [styles.postCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><View style={styles.postTop}><Text style={[styles.postKind, { color: theme.orange }]}>{post.kind.toLocaleUpperCase()}</Text><Text style={[styles.postDate, { color: theme.pageTextMuted }]}>{new Date(post.createdAt).toLocaleDateString(localeTag, { day: "numeric", month: "short" })}</Text></View><Text style={[styles.postBody, { color: theme.pageTextSecondary }]} numberOfLines={3}>{post.body}</Text></Pressable>)}</View> : <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Text style={[styles.emptyText, { color: theme.pageTextMuted }]}>Aucun Temps fort partagé récemment.</Text></View>}

      <SectionTitle title="Réglages" subtitle="Le profil reste la vue principale ; les préférences sont regroupées en dessous." />
      <View style={styles.settingsGrid}>
        <Pressable onPress={() => setLanguageOpen(true)} accessibilityLabel="Changer la langue de Connexio" style={[styles.settingCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Ionicons name="language-outline" size={22} color={theme.accent} /><Text style={[styles.settingText, { color: theme.pageText }]}>Langue</Text></Pressable>
        <Pressable onPress={() => theme.setMode(theme.isLight ? "dark" : "light")} accessibilityLabel={theme.isLight ? "Passer en mode sombre" : "Passer en mode clair"} style={[styles.settingCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Ionicons name={theme.isLight ? "moon-outline" : "sunny-outline"} size={22} color={theme.pageText} /><Text style={[styles.settingText, { color: theme.pageText }]}>Apparence</Text></Pressable>
        {SETTINGS.map(([icon, label, route]) => <Pressable key={label} onPress={() => router.push(route)} style={[styles.settingCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Ionicons name={icon} size={22} color={theme.pageText} /><Text style={[styles.settingText, { color: theme.pageText }]}>{label}</Text></Pressable>)}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Se déconnecter de Connexio" disabled={signingOut} onPress={() => void handleSignOut()} style={[styles.signOut, { borderColor: theme.danger, backgroundColor: theme.dangerSoft }]}>{signingOut ? <ActivityIndicator color={theme.danger} /> : <><Ionicons name="log-out-outline" size={20} color={theme.danger} /><Text style={[styles.signOutText, { color: theme.danger }]}>Se déconnecter</Text></>}</Pressable>
      <Text style={[styles.version, { color: theme.pageTextMuted }]}>Connexio {Constants.expoConfig?.version ?? "1.0.0"}</Text>
    </ScrollView>
    <LanguagePickerModal visible={languageOpen} onClose={() => setLanguageOpen(false)} />
  </LinearGradient>;
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useAppTheme();
  return <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: theme.pageTextMuted }]}>{subtitle}</Text></View>;
}
function Intent({ title, icon, items, color, background }: { title: string; icon: keyof typeof Ionicons.glyphMap; items: string[]; color: string; background: string }) {
  const theme = useAppTheme();
  return <View style={[styles.intentCard, { backgroundColor: background, borderColor: color }]}><View style={styles.intentTitle}><Ionicons name={icon} size={18} color={color} /><Text style={[styles.intentTitleText, { color }]}>{title}</Text></View><View style={styles.tags}>{items.map((item) => <View key={item} style={[styles.tag, { backgroundColor: theme.surface }]}><Text style={[styles.tagText, { color: theme.pageTextSecondary }]}>{item}</Text></View>)}</View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: spacing.md, paddingBottom: 34 },
  hero: { marginTop: 8, borderRadius: 28, borderWidth: 1, padding: 16 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  identityRowCompact: { flexDirection: "column", alignItems: "center", gap: 10 },
  identityCopy: { flex: 1, minWidth: 0 },
  identityCopyCompact: { width: "100%", flex: 0, alignItems: "center" },
  centeredRow: { justifyContent: "center" },
  centeredText: { textAlign: "center" },
  availabilityRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  availabilityDot: { width: 7, height: 7, borderRadius: 4 },
  availabilityText: { fontSize: 11, fontWeight: "900" },
  name: { fontSize: 25, lineHeight: 30, fontWeight: "900", marginTop: 4 },
  headline: { fontSize: 14, lineHeight: 19, fontWeight: "700", marginTop: 3 },
  metaRow: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, maxWidth: "100%" },
  metaRowCompact: { justifyContent: "center" },
  metaPill: { minHeight: 36, maxWidth: "100%", flexShrink: 1, paddingHorizontal: 9, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { flexShrink: 1, fontSize: 12, fontWeight: "800" },
  bio: { fontSize: 14, lineHeight: 20, marginTop: 13 },
  heroActions: { marginTop: 15, flexDirection: "row", gap: 8, flexWrap: "wrap" },
  editButton: { flexGrow: 1, flexShrink: 1, minWidth: 150, minHeight: 50, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  previewButton: { flexGrow: 1, flexShrink: 1, minWidth: 118, minHeight: 50, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  whiteText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  previewText: { fontSize: 12, fontWeight: "900" },
  sectionHeading: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { ...typography.heading3 },
  sectionSubtitle: { fontSize: 14, lineHeight: 19, marginTop: 3 },
  intentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  intentCard: { flexGrow: 1, flexBasis: 190, borderRadius: 20, borderWidth: 1, padding: 12 },
  intentTitle: { flexDirection: "row", alignItems: "center", gap: 7 },
  intentTitleText: { fontSize: 12, fontWeight: "900" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 9 },
  tag: { minHeight: 32, borderRadius: 999, paddingHorizontal: 9, alignItems: "center", justifyContent: "center" },
  tagText: { fontSize: 11, fontWeight: "800" },
  businessGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  businessCard: { flexGrow: 1, flexBasis: 210, minHeight: 174, borderRadius: 22, borderWidth: 1, padding: 13 },
  businessIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  businessTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900", marginTop: 11 },
  businessDescription: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  businessFooter: { marginTop: "auto", minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  businessCta: { fontSize: 11, fontWeight: "900" },
  posts: { gap: 8 },
  postCard: { borderRadius: 20, borderWidth: 1, padding: 12 },
  postTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  postKind: { fontSize: 10, fontWeight: "900" },
  postDate: { fontSize: 11, fontWeight: "700" },
  postBody: { fontSize: 13, lineHeight: 19, marginTop: 8 },
  empty: { minHeight: 90, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 12, fontWeight: "700" },
  settingsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  settingCard: { flexGrow: 1, flexBasis: 145, minHeight: 76, borderRadius: 20, borderWidth: 1, padding: 12, justifyContent: "space-between" },
  settingText: { fontSize: 12, fontWeight: "900" },
  signOut: { minHeight: 52, marginTop: 22, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  signOutText: { fontSize: 13, fontWeight: "900" },
  version: { fontSize: 10, textAlign: "center", marginTop: 12 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] }
});
