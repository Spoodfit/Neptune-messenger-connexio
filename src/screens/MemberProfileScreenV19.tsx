import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionSheet, type ActionSheetOption } from "../components/ActionSheet";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { MemberStatusBadge } from "../components/MemberStatusBadge";
import { StatusAvatar } from "../components/StatusAvatar";
import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { env } from "../config/env";
import { canInitiatePrivateInteraction } from "../domain/accessPolicy";
import { useExperience } from "../providers/ExperienceProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
import { useMessaging } from "../providers/MessagingProvider";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { NeptuneExperienceApi } from "../services/api/experienceApi";
import { AppAlert } from "../services/ui/AppAlert";
import { restorePrivateConversation } from "../state/conversationPresentation";
import { gradients, spacing, typography } from "../theme";

const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);
type BusinessItem = { id?: string; kind?: "service" | "product" | "activity"; title?: string; description?: string; url?: string };
type MemberUniverse = {
  businessItems?: BusinessItem[];
  headline?: string;
  bio?: string;
  sector?: string;
  canHelpWith?: string[];
  lookingFor?: string[];
  expertise?: string[];
};

export default function MemberProfileScreenV19() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { localeTag } = useAppLanguage();
  const id = Array.isArray(params.id) ? (params.id[0] ?? "") : (params.id ?? "");
  const { accessToken, currentUser } = useSession();
  const { getMember, posts, localConversations, createPrivateConversation, sendLocalMessage, toggleConversationMuted } = useExperience();
  const { visibleConversations, refreshConversations, sendMessage } = useMessaging();
  const api = useMemo(() => env.mockMode ? null : new NeptuneExperienceApi(accessToken), [accessToken]);
  const [opening, setOpening] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [relationItem, setRelationItem] = useState<BusinessItem | null>(null);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const member = getMember(id);

  if (!member) {
    return <LinearGradient colors={theme.pageGradient} style={styles.missing}><Ionicons name="person-outline" size={34} color={theme.pageTextMuted} /><Text style={[styles.missingTitle, { color: theme.pageText }]}>Profil introuvable</Text><Text style={[styles.missingText, { color: theme.pageTextMuted }]}>Le membre n’est plus visible ou son profil n’a pas encore été synchronisé.</Text><Pressable onPress={() => router.back()} style={[styles.missingButton, { backgroundColor: theme.accent }]}><Text style={styles.whiteText}>Retour</Text></Pressable></LinearGradient>;
  }

  const universe = member as typeof member & MemberUniverse;
  const businessItems = (universe.businessItems ?? []).filter((item) => item.title?.trim()).slice(0, 6);
  const displayedBusinessItems: BusinessItem[] = businessItems.length > 0 ? businessItems : [{ id: "company", kind: "activity", title: member.company || "Activité professionnelle", description: member.city ? `Activité professionnelle à ${member.city}` : "Activité professionnelle synchronisée avec Neptune Business." }];
  const canHelpWith = (universe.canHelpWith ?? universe.expertise ?? []).filter(Boolean).slice(0, 5);
  const lookingFor = (universe.lookingFor ?? []).filter(Boolean).slice(0, 5);
  const memberPosts = posts.filter((post) => post.author.id === member.id).slice(0, 4);
  const existingConversation = [...visibleConversations, ...localConversations].find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(member.id));
  const isSelf = member.id === currentUser.id;
  const headline = universe.headline?.trim() || universe.sector?.trim() || `Entrepreneur · ${member.company}`;

  const ensureConversation = async () => {
    if (isSelf) throw new Error("Vous consultez votre propre profil.");
    if (!env.mockMode && !BACKEND_CAPABILITIES.messaging) throw new Error("La messagerie sécurisée Connexio n’est pas encore activée.");
    if (!canInitiatePrivateInteraction(currentUser.role)) throw new Error("Cette action est réservée aux membres Triton et supérieurs.");
    if (existingConversation) return existingConversation;
    if (api) {
      const conversation = await api.createPrivateConversation([member.id]);
      await refreshConversations();
      return conversation;
    }
    return createPrivateConversation({ memberIds: [member.id] });
  };

  const openMessage = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const conversation = await ensureConversation();
      restorePrivateConversation(conversation.id);
      router.push(`/chat/${encodeURIComponent(conversation.id)}`);
    } catch (error) {
      AppAlert.alert("Conversation impossible", error instanceof Error ? error.message : "Réessayez ultérieurement.");
    } finally { setOpening(false); }
  };

  const startCall = async (mode: "audio" | "video") => {
    if (opening) return;
    setOpening(true);
    try {
      const conversation = await ensureConversation();
      router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode, returnTo: `/profile/${encodeURIComponent(member.id)}` } });
    } catch (error) {
      AppAlert.alert("Appel impossible", error instanceof Error ? error.message : "Réessayez ultérieurement.");
    } finally { setOpening(false); }
  };

  const relationMessage = (item: BusinessItem) => {
    const firstName = member.name.split(" ")[0] || member.name;
    const subject = item.title?.trim() || member.company || "votre activité";
    return `Bonjour ${firstName}, votre ${item.kind === "product" ? "produit" : item.kind === "service" ? "service" : "activité"} « ${subject} » m’intéresse. Pouvons-nous en parler ?`;
  };

  const confirmRelation = async () => {
    if (!relationItem || opening) return;
    const message = relationMessage(relationItem);
    setRelationItem(null);
    setOpening(true);
    try {
      const conversation = await ensureConversation();
      restorePrivateConversation(conversation.id);
      const accepted = conversation.id.startsWith("local-") ? await sendLocalMessage(conversation.id, message) : await sendMessage(conversation.id, message);
      if (!accepted) throw new Error("Le message de mise en relation n’a pas pu être envoyé.");
      router.push(`/chat/${encodeURIComponent(conversation.id)}`);
    } catch (error) {
      AppAlert.alert("Mise en relation impossible", error instanceof Error ? error.message : "Réessayez ultérieurement.");
    } finally { setOpening(false); }
  };

  const openBusinessProfile = async () => {
    const url = member.webProfileUrl ?? `${env.businessWebBaseUrl.replace(/\/$/, "")}/profile/${encodeURIComponent(member.id)}`;
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  };
  const recommendContact = () => router.push({ pathname: "/contact-actions", params: { intent: "recommend", recipientId: member.id } });
  const callPhone = () => member.phone ? void Linking.openURL(`tel:${member.phone}`) : AppAlert.alert("Téléphone non partagé", "Le membre n’a pas rendu son numéro disponible dans son profil Neptune.");
  const muteMember = async () => {
    try {
      const conversation = await ensureConversation();
      if (api && !conversation.id.startsWith("local-")) { await api.setConversationMuted(conversation.id, !conversation.muted); await refreshConversations(); }
      else toggleConversationMuted(conversation.id);
    } catch (error) { AppAlert.alert("Action impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
  };
  const reportMember = async () => {
    try {
      if (api) await api.reportContent("profile", member.id, "Profil signalé depuis Connexio");
      AppAlert.alert("Signalement transmis", "La modération Neptune va examiner ce profil.");
    } catch (error) { AppAlert.alert("Signalement impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
  };
  const blockMember = async () => {
    setBlockConfirmOpen(false);
    try {
      if (api) await api.blockMember(member.id);
      router.replace("/(tabs)/messages");
    } catch (error) { AppAlert.alert("Blocage impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
  };

  const menuOptions: ActionSheetOption[] = [
    { id: "business-profile", label: "Voir le profil Neptune Business", icon: "open-outline", onPress: openBusinessProfile },
    { id: "recommend", label: "Lui recommander un contact", icon: "people-outline", onPress: recommendContact },
    ...(env.mockMode || BACKEND_CAPABILITIES.messaging ? [{ id: "mute", label: existingConversation?.muted ? "Réactiver ses notifications" : "Mettre ses messages en sourdine", icon: existingConversation?.muted ? "notifications-outline" : "notifications-off-outline", onPress: muteMember }] satisfies ActionSheetOption[] : []),
    ...(env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? [{ id: "report", label: "Signaler ce membre", icon: "flag-outline", onPress: reportMember }] satisfies ActionSheetOption[] : []),
    ...(env.mockMode || BACKEND_CAPABILITIES.blockedMembers ? [{ id: "block", label: "Bloquer ce membre", icon: "person-remove-outline", destructive: true, onPress: () => setBlockConfirmOpen(true) }] satisfies ActionSheetOption[] : [])
  ];

  return <LinearGradient colors={theme.pageGradient} style={styles.screen}>
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 8), paddingLeft: 8 + insets.left, paddingRight: 8 + insets.right }]}>
      <Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={[styles.headerButton, { backgroundColor: theme.shellBackground }]}><Ionicons name="chevron-back" size={24} color={theme.pageText} /></Pressable>
      <View style={styles.headerCenter}><Text style={[styles.headerTitle, { color: theme.pageText }]}>Profil</Text></View>
      <Pressable accessibilityLabel={theme.isLight ? "Passer en mode sombre" : "Passer en mode clair"} onPress={() => theme.setMode(theme.isLight ? "dark" : "light")} style={[styles.headerButton, { backgroundColor: theme.shellBackground }]}><Ionicons name={theme.isLight ? "moon-outline" : "sunny-outline"} size={20} color={theme.pageText} /></Pressable>
      <Pressable accessibilityLabel="Plus d’options" onPress={() => setMenuOpen(true)} style={[styles.headerButton, { backgroundColor: theme.shellBackground }]}><Ionicons name="ellipsis-horizontal" size={22} color={theme.pageText} /></Pressable>
    </View>

    <ScrollView contentContainerStyle={[styles.content, { paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right, paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={theme.isLight ? [theme.surface, theme.accentSoft] : gradients.glass} style={[styles.hero, { borderColor: theme.borderSoft }]}>
        <View style={styles.identityRow}><StatusAvatar user={member} size={92} /><View style={styles.identityCopy}><View style={styles.availabilityRow}><View style={[styles.availabilityDot, { backgroundColor: member.online ? theme.success : theme.pageTextMuted }]} /><Text style={[styles.availabilityText, { color: member.online ? theme.success : theme.pageTextMuted }]}>{member.online ? "Disponible" : "Hors ligne"}</Text></View><Text style={[styles.name, { color: theme.pageText }]}>{member.name}</Text><Text style={[styles.headline, { color: theme.pageTextSecondary }]} numberOfLines={2}>{headline}</Text><View style={styles.metaRow}><MemberStatusBadge role={member.role} compact /><View style={[styles.metaPill, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="location-outline" size={14} color={theme.pageTextMuted} /><Text style={[styles.metaText, { color: theme.pageTextMuted }]}>{member.city}</Text></View></View></View></View>
        {universe.bio?.trim() ? <Text style={[styles.bio, { color: theme.pageTextSecondary }]}>{universe.bio.trim()}</Text> : null}
        {!isSelf ? <><View style={styles.heroActions}><Pressable disabled={opening} onPress={() => void openMessage()} style={[styles.messageButton, { backgroundColor: theme.accent }]}>{opening ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />}<Text style={styles.whiteText}>Écrire un message</Text></Pressable><Pressable onPress={recommendContact} style={[styles.recommendButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="people-outline" size={20} color={theme.pageText} /><Text style={[styles.recommendText, { color: theme.pageText }]}>Recommander</Text></Pressable></View><View style={styles.quickActions}><QuickAction icon="call-outline" label="Téléphone" onPress={callPhone} />{env.mockMode || BACKEND_CAPABILITIES.calls ? <QuickAction icon="headset-outline" label="Audio" disabled={opening} onPress={() => void startCall("audio")} /> : null}{env.mockMode || BACKEND_CAPABILITIES.calls ? <QuickAction icon="videocam-outline" label="Visio" disabled={opening || member.videoCallEnabled === false} onPress={() => void startCall("video")} /> : null}<QuickAction icon="open-outline" label="Neptune" onPress={() => void openBusinessProfile()} /></View></> : null}
      </LinearGradient>

      {(canHelpWith.length > 0 || lookingFor.length > 0) ? <><SectionHeading title="Pourquoi se connecter ?" subtitle="Les sujets sur lesquels une mise en relation peut être utile." />
        <View style={styles.intentGrid}>{canHelpWith.length > 0 ? <IntentCard title="Peut aider sur" icon="hand-left-outline" items={canHelpWith} tone="success" /> : null}{lookingFor.length > 0 ? <IntentCard title="Recherche" icon="search-outline" items={lookingFor} tone="orange" /> : null}</View></> : null}

      <SectionHeading title="Son univers professionnel" subtitle={`Découvrez ce que fait ${member.name.split(" ")[0]} et démarrez une conversation sur un sujet précis.`} />
      <View style={styles.businessGrid}>{displayedBusinessItems.map((item, index) => <Pressable key={item.id ?? `${item.title}-${index}`} disabled={isSelf} onPress={() => setRelationItem(item)} style={({ pressed }) => [styles.businessCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><View style={[styles.businessIcon, { backgroundColor: item.kind === "product" ? theme.violetSoft : item.kind === "service" ? theme.accentSoft : theme.orangeSoft }]}><Ionicons name={item.kind === "product" ? "cube-outline" : item.kind === "service" ? "briefcase-outline" : "business-outline"} size={22} color={item.kind === "product" ? theme.violet : item.kind === "service" ? theme.accent : theme.orange} /></View><Text style={[styles.businessTitle, { color: theme.pageText }]}>{item.title}</Text>{item.description ? <Text style={[styles.businessDescription, { color: theme.pageTextMuted }]}>{item.description}</Text> : null}{!isSelf ? <View style={styles.businessCta}><Text style={[styles.businessCtaText, { color: theme.accent }]}>Échanger à ce sujet</Text><Ionicons name="arrow-forward" size={15} color={theme.accent} /></View> : null}</Pressable>)}</View>

      <SectionHeading title="Activité récente" subtitle="Ses derniers Temps forts dans Connexio." />
      {memberPosts.length > 0 ? <View style={styles.posts}>{memberPosts.map((post) => <Pressable key={post.id} onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)} style={({ pressed }) => [styles.postCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><View style={styles.postTop}><View style={[styles.kindBadge, { backgroundColor: post.kind === "besoin" ? theme.dangerSoft : post.kind === "offre" ? theme.successSoft : theme.orangeSoft }]}><Text style={[styles.kindText, { color: post.kind === "besoin" ? theme.danger : post.kind === "offre" ? theme.success : theme.orange }]}>{post.kind.toLocaleUpperCase()}</Text></View><Text style={[styles.postDate, { color: theme.pageTextMuted }]}>{new Date(post.createdAt).toLocaleDateString(localeTag, { day: "numeric", month: "short" })}</Text></View><Text style={[styles.postBody, { color: theme.pageTextSecondary }]} numberOfLines={3}>{post.body}</Text><View style={styles.postFooter}><Text style={[styles.postMeta, { color: theme.pageTextMuted }]}>{post.reactions.reduce((sum, reaction) => sum + reaction.count, 0)} réactions · {post.comments.length} commentaires</Text><Ionicons name="chevron-forward" size={17} color={theme.pageTextMuted} /></View></Pressable>)}</View> : <View style={[styles.emptyActivity, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Ionicons name="sparkles-outline" size={25} color={theme.pageTextMuted} /><Text style={[styles.emptyActivityText, { color: theme.pageTextMuted }]}>Aucun Temps fort partagé récemment.</Text></View>}
    </ScrollView>

    <ActionSheet visible={menuOpen} title="Actions du profil" subtitle={member.name} options={menuOptions} onClose={() => setMenuOpen(false)} />
    <ConfirmationDialog visible={Boolean(relationItem)} title="Démarrer la conversation ?" message={relationItem ? relationMessage(relationItem) : ""} confirmLabel="Envoyer le message" cancelLabel="Annuler" icon="chatbubble-ellipses-outline" onCancel={() => setRelationItem(null)} onConfirm={() => void confirmRelation()} />
    <ConfirmationDialog visible={blockConfirmOpen} title="Bloquer ce membre ?" message="Vous ne recevrez plus ses messages directs et son contenu sera masqué selon les règles Connexio." confirmLabel="Bloquer" destructive icon="person-remove-outline" onCancel={() => setBlockConfirmOpen(false)} onConfirm={() => void blockMember()} />
  </LinearGradient>;
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useAppTheme();
  return <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: theme.pageTextMuted }]}>{subtitle}</Text></View>;
}
function QuickAction({ icon, label, disabled = false, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; disabled?: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed, disabled && styles.disabled]}><View style={[styles.quickIcon, { backgroundColor: theme.surfaceStrong }]}><Ionicons name={icon} size={20} color={theme.pageText} /></View><Text style={[styles.quickLabel, { color: theme.pageTextMuted }]}>{label}</Text></Pressable>;
}
function IntentCard({ title, icon, items, tone }: { title: string; icon: keyof typeof Ionicons.glyphMap; items: string[]; tone: "success" | "orange" }) {
  const theme = useAppTheme();
  const color = tone === "success" ? theme.success : theme.orange;
  const background = tone === "success" ? theme.successSoft : theme.orangeSoft;
  return <View style={[styles.intentCard, { backgroundColor: background, borderColor: color }]}><View style={styles.intentTitleRow}><Ionicons name={icon} size={18} color={color} /><Text style={[styles.intentTitle, { color }]}>{title}</Text></View><View style={styles.tagWrap}>{items.map((item) => <View key={item} style={[styles.intentTag, { backgroundColor: theme.surface }]}><Text style={[styles.intentTagText, { color: theme.pageTextSecondary }]}>{item}</Text></View>)}</View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, missing: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center" }, missingTitle: { ...typography.heading2, marginTop: 10 }, missingText: { ...typography.bodySmall, textAlign: "center", marginTop: 6, maxWidth: 330 }, missingButton: { minWidth: 110, minHeight: 48, borderRadius: 16, marginTop: 18, alignItems: "center", justifyContent: "center" }, whiteText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  header: { position: "absolute", zIndex: 20, top: 0, left: 0, right: 0, minHeight: 64, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 6 }, headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, headerCenter: { flex: 1, alignItems: "center" }, headerTitle: { fontSize: 13, fontWeight: "900" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingTop: 76 }, hero: { borderRadius: 28, borderWidth: 1, padding: 16, overflow: "hidden" }, identityRow: { flexDirection: "row", alignItems: "center", gap: 14 }, identityCopy: { flex: 1, minWidth: 0 }, availabilityRow: { flexDirection: "row", alignItems: "center", gap: 6 }, availabilityDot: { width: 7, height: 7, borderRadius: 4 }, availabilityText: { fontSize: 11, fontWeight: "900" }, name: { fontSize: 25, lineHeight: 30, fontWeight: "900", letterSpacing: -0.45, marginTop: 4 }, headline: { fontSize: 14, lineHeight: 19, fontWeight: "700", marginTop: 3 }, metaRow: { marginTop: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }, metaPill: { minHeight: 32, paddingHorizontal: 9, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 5 }, metaText: { fontSize: 11, fontWeight: "800" }, bio: { fontSize: 14, lineHeight: 20, marginTop: 13 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 15 }, messageButton: { flexGrow: 1, minWidth: 150, minHeight: 52, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, recommendButton: { minWidth: 126, minHeight: 52, paddingHorizontal: 12, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, recommendText: { fontSize: 12, fontWeight: "900" }, quickActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around", gap: 8, marginTop: 13 }, quickAction: { minWidth: 64, minHeight: 70, alignItems: "center", justifyContent: "center", gap: 5 }, quickIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, quickLabel: { fontSize: 11, fontWeight: "800" },
  sectionHeading: { marginTop: 22, marginBottom: 10 }, sectionTitle: { ...typography.heading3 }, sectionSubtitle: { fontSize: 14, lineHeight: 19, marginTop: 3, maxWidth: 560 }, intentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, intentCard: { flexGrow: 1, flexBasis: 180, padding: 12, borderRadius: 20, borderWidth: 1 }, intentTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 }, intentTitle: { fontSize: 12, fontWeight: "900" }, tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9 }, intentTag: { minHeight: 32, paddingHorizontal: 9, borderRadius: 999, alignItems: "center", justifyContent: "center" }, intentTagText: { fontSize: 11, fontWeight: "800" },
  businessGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 }, businessCard: { flexGrow: 1, flexBasis: 210, minHeight: 180, padding: 13, borderRadius: 22, borderWidth: 1 }, businessIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, businessTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900", marginTop: 11 }, businessDescription: { fontSize: 12, lineHeight: 17, marginTop: 6 }, businessCta: { marginTop: "auto", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 5 }, businessCtaText: { fontSize: 12, fontWeight: "900" },
  posts: { gap: 8 }, postCard: { padding: 12, borderRadius: 20, borderWidth: 1 }, postTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, kindBadge: { minHeight: 28, paddingHorizontal: 8, borderRadius: 8, alignItems: "center", justifyContent: "center" }, kindText: { fontSize: 10, fontWeight: "900" }, postDate: { fontSize: 11, fontWeight: "700" }, postBody: { fontSize: 13, lineHeight: 19, marginTop: 8 }, postFooter: { minHeight: 36, marginTop: 5, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, postMeta: { fontSize: 11, fontWeight: "700" }, emptyActivity: { minHeight: 110, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 7 }, emptyActivityText: { fontSize: 11, fontWeight: "700" }, pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.42 }
});
