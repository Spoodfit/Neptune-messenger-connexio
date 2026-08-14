import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppAlert } from "@/services/ui/AppAlert";

import { ActionSheet, type ActionSheetOption } from "@/components/ActionSheet";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { MemberStatusBadge } from "@/components/MemberStatusBadge";
import { StatusAvatar } from "@/components/StatusAvatar";
import { ThemeModeButton } from "@/components/ThemeModeButton";
import { capabilitiesForBackendContract } from "@/config/backendCapabilities";
import { env } from "@/config/env";
import { canInitiatePrivateInteraction } from "@/domain/accessPolicy";
import { useExperience } from "@/providers/ExperienceProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { useAppTheme } from "@/providers/ThemeProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import { restorePrivateConversation } from "@/state/conversationPresentation";
import { colors, spacing, typography } from "@/theme";

const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);
type BusinessItem = { id?: string; kind?: "service" | "product" | "activity"; title?: string; description?: string; url?: string };

export default function MemberProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
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

  if (!member) return <LinearGradient colors={theme.pageGradient} style={styles.missing}><Text style={[styles.title, { color: theme.pageText }]}>Profil introuvable</Text><Text style={[styles.mutedText, { color: theme.pageTextMuted }]}>Le membre n’est plus visible ou son profil n’a pas encore été synchronisé.</Text><Pressable onPress={() => router.back()} style={styles.primaryButton}><Text style={styles.primaryText}>Retour</Text></Pressable></LinearGradient>;

  const memberPosts = posts.filter((post) => post.author.id === member.id).slice(0, 4);
  const businessItems = (((member as typeof member & { businessItems?: BusinessItem[] }).businessItems ?? []).filter((item) => item.title?.trim()).slice(0, 8));
  const displayedBusinessItems: BusinessItem[] = businessItems.length > 0 ? businessItems : [{ id: "company", kind: "activity", title: member.company || "Activité professionnelle", description: member.city ? `Activité professionnelle à ${member.city}` : "Activité professionnelle synchronisée avec Neptune Business." }];
  const existingConversation = [...visibleConversations, ...localConversations].find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(member.id));

  const ensureConversation = async () => {
    if (!env.mockMode && !BACKEND_CAPABILITIES.messaging) throw new Error("La messagerie sécurisée Connexio n’est pas encore activée.");
    if (!canInitiatePrivateInteraction(currentUser.role)) throw new Error("Cette action est réservée aux membres Triton et supérieurs.");
    if (existingConversation) return existingConversation;
    if (api) { const conversation = await api.createPrivateConversation([member.id]); await refreshConversations(); return conversation; }
    return createPrivateConversation({ memberIds: [member.id] });
  };

  const openMessage = async () => {
    if (opening) return;
    setOpening(true);
    try { const conversation = await ensureConversation(); restorePrivateConversation(conversation.id); router.push(`/chat/${encodeURIComponent(conversation.id)}`); }
    catch (error) { AppAlert.alert("Conversation impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
    finally { setOpening(false); }
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
    } catch (error) { AppAlert.alert("Mise en relation impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
    finally { setOpening(false); }
  };

  const startCall = async (mode: "audio" | "video") => {
    if (opening) return;
    setOpening(true);
    try { const conversation = await ensureConversation(); router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode, returnTo: `/profile/${encodeURIComponent(member.id)}` } }); }
    catch (error) { AppAlert.alert("Appel impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
    finally { setOpening(false); }
  };

  const blockMember = async () => { setBlockConfirmOpen(false); try { if (api) await api.blockMember(member.id); router.replace("/(tabs)/messages"); } catch (error) { AppAlert.alert("Blocage impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); } };
  const muteMember = async () => { try { const conversation = await ensureConversation(); const nextMuted = !conversation.muted; if (api && !conversation.id.startsWith("local-")) { await api.setConversationMuted(conversation.id, nextMuted); await refreshConversations(); } else toggleConversationMuted(conversation.id); } catch (error) { AppAlert.alert("Action impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); } };
  const reportMember = async () => { try { if (api) await api.reportContent("profile", member.id, "Profil signalé depuis Connexio"); AppAlert.alert("Signalement transmis", "La modération Neptune va examiner ce profil."); } catch (error) { AppAlert.alert("Signalement impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); } };
  const openBusinessProfile = async () => { const url = member.webProfileUrl ?? `${env.businessWebBaseUrl.replace(/\/$/, "")}/profile/${encodeURIComponent(member.id)}`; if (await Linking.canOpenURL(url)) await Linking.openURL(url); else AppAlert.alert("Profil indisponible", "Le profil Neptune Business ne peut pas être ouvert."); };
  const callPhone = () => member.phone ? void Linking.openURL(`tel:${member.phone}`) : AppAlert.alert("Téléphone non partagé", "Le membre n’a pas rendu son numéro disponible dans son profil Neptune.");
  const recommendContact = () => router.push({ pathname: "/contact-actions", params: { intent: "recommend", recipientId: member.id } });

  const menuOptions: ActionSheetOption[] = [
    { id: "business-profile", label: "Voir le profil Neptune Business", icon: "open-outline", onPress: openBusinessProfile },
    { id: "recommend-contact", label: "Lui recommander un contact", icon: "people-outline", onPress: recommendContact },
    ...(env.mockMode || BACKEND_CAPABILITIES.messaging ? [{ id: "mute", label: existingConversation?.muted ? "Réactiver ses notifications" : "Mettre ses messages en sourdine", icon: existingConversation?.muted ? "notifications-outline" : "notifications-off-outline", onPress: muteMember }] satisfies ActionSheetOption[] : []),
    ...(env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? [{ id: "report", label: "Signaler ce membre", icon: "flag-outline", onPress: reportMember }] satisfies ActionSheetOption[] : []),
    ...(env.mockMode || BACKEND_CAPABILITIES.blockedMembers ? [{ id: "block", label: "Bloquer ce membre", icon: "person-remove-outline", destructive: true, onPress: () => setBlockConfirmOpen(true) }] satisfies ActionSheetOption[] : [])
  ];

  return (
    <LinearGradient colors={theme.pageGradient} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), paddingLeft: spacing.sm + insets.left, paddingRight: spacing.sm + insets.right, backgroundColor: theme.shellBackground, borderBottomColor: theme.shellBorder }]}>
        <Pressable accessibilityLabel="Retour" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="chevron-back" size={25} color={theme.pageText} /></Pressable>
        <Text style={[styles.headerTitle, { color: theme.pageText }]}>Profil membre</Text>
        <View style={styles.headerActions}><ThemeModeButton /><Pressable accessibilityLabel="Plus d’options" onPress={() => setMenuOpen(true)} style={styles.headerButton}><Ionicons name="ellipsis-horizontal" size={23} color={theme.pageText} /></Pressable></View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right, paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
        <View style={styles.identity}>
          <StatusAvatar user={member} size={104} />
          <View style={styles.onlineRow}><View style={[styles.onlineDot, { backgroundColor: member.online ? theme.success : theme.pageTextMuted }]} /><Text style={[styles.onlineText, { color: theme.pageTextMuted }]}>{member.online ? "Disponible" : member.lastSeenAt ? "Vu récemment" : "Hors ligne"}</Text></View>
          <Text style={[styles.name, { color: theme.pageText }]}>{member.name}</Text><Text style={[styles.company, { color: theme.pageTextSecondary }]}>{member.company}</Text>
          <View style={styles.metaRow}><MemberStatusBadge role={member.role} compact /><View style={[styles.cityBadge, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="location-outline" size={13} color={theme.pageTextMuted} /><Text style={[styles.cityText, { color: theme.pageTextMuted }]}>{member.city}</Text></View></View>
        </View>

        {opening ? <View style={styles.loadingRow}><ActivityIndicator size="small" color={theme.violet} /><Text style={[styles.loadingText, { color: theme.pageTextMuted }]}>Ouverture sécurisée…</Text></View> : null}

        <View style={styles.actions}>
          {env.mockMode || BACKEND_CAPABILITIES.messaging ? <ProfileAction label="Message" icon="chatbubble-ellipses" disabled={opening} onPress={() => void openMessage()} /> : null}
          <ProfileAction label="Téléphone" icon="call-outline" onPress={callPhone} />
          {env.mockMode || BACKEND_CAPABILITIES.calls ? <ProfileAction label="Visio" icon="videocam-outline" disabled={opening || member.videoCallEnabled === false} onPress={() => void startCall("video")} /> : null}
        </View>

        {env.mockMode || BACKEND_CAPABILITIES.calls ? <Pressable disabled={opening} onPress={() => void startCall("audio")} style={[styles.audioAction, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Ionicons name="headset-outline" size={20} color={theme.pageText} /><Text style={[styles.audioText, { color: theme.pageText }]}>Appel audio Connexio</Text></Pressable> : null}

        <Pressable accessibilityRole="button" accessibilityLabel={`Recommander un contact à ${member.name}`} onPress={recommendContact} style={[styles.recommendAction, { backgroundColor: theme.violetSoft, borderColor: theme.violet }]}>
          <Ionicons name="people-outline" size={20} color={theme.violet} />
          <View style={styles.recommendCopy}><Text style={[styles.recommendTitle, { color: theme.pageText }]}>Recommander un contact à {member.name.split(" ")[0]}</Text><Text style={[styles.recommendText, { color: theme.pageTextMuted }]}>Choisir un membre Connexio ou, si besoin, un contact du téléphone.</Text></View>
          <Ionicons name="chevron-forward" size={18} color={theme.pageTextMuted} />
        </Pressable>

        <View style={styles.sectionHeading}><Text style={[styles.sectionTitle, { color: theme.pageText }]}>Activité professionnelle</Text><Text style={[styles.sectionHelp, { color: theme.pageTextMuted }]}>Touchez une carte pour démarrer une mise en relation avec un message prêt à envoyer.</Text></View>
        <View style={styles.businessGrid}>{displayedBusinessItems.map((item, index) => <Pressable key={item.id ?? `${item.title}-${index}`} onPress={() => setRelationItem(item)} style={({ pressed }) => [styles.businessCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><View style={[styles.businessIcon, { backgroundColor: theme.orangeSoft }]}><Ionicons name={item.kind === "product" ? "cube-outline" : item.kind === "service" ? "briefcase-outline" : "business-outline"} size={21} color={theme.orange} /></View><Text style={[styles.businessTitle, { color: theme.pageText }]}>{item.title}</Text>{item.description ? <Text style={[styles.businessDescription, { color: theme.pageTextMuted }]} numberOfLines={3}>{item.description}</Text> : null}<View style={styles.cardCta}><Text style={[styles.cardCtaText, { color: theme.violet }]}>Échanger à ce sujet</Text><Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.violet} /></View></Pressable>)}</View>

        <Text style={[styles.sectionTitleStandalone, { color: theme.pageText }]}>Derniers Temps forts</Text>
        {memberPosts.length > 0 ? <View style={styles.posts}>{memberPosts.map((post) => <Pressable key={post.id} onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)} style={({ pressed }) => [styles.postCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }, pressed && styles.pressed]}><View style={styles.postTop}><Text style={[styles.kindText, { color: theme.orange }]}>{post.kind.toLocaleUpperCase("fr")}</Text><Text style={[styles.postDate, { color: theme.pageTextMuted }]}>{new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</Text></View><Text style={[styles.postBody, { color: theme.pageTextSecondary }]} numberOfLines={4}>{post.body}</Text></Pressable>)}</View> : <View style={[styles.emptyPosts, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Ionicons name="sparkles-outline" size={25} color={theme.pageTextMuted} /><Text style={[styles.mutedText, { color: theme.pageTextMuted }]}>Aucun Temps fort partagé récemment.</Text></View>}
      </ScrollView>

      <ActionSheet visible={menuOpen} title={member.name} subtitle={member.company} options={menuOptions} onClose={() => setMenuOpen(false)} />
      <ConfirmationDialog visible={Boolean(relationItem)} icon="chatbubble-ellipses-outline" title="Démarrer la mise en relation ?" message={relationItem ? relationMessage(relationItem) : ""} confirmLabel="Envoyer et discuter" onCancel={() => setRelationItem(null)} onConfirm={() => void confirmRelation()} />
      <ConfirmationDialog visible={blockConfirmOpen} destructive icon="person-remove-outline" title={`Bloquer ${member.name} ?`} message="Vous ne recevrez plus ses messages et cette personne ne pourra plus vous appeler dans Connexio." confirmLabel="Bloquer" onCancel={() => setBlockConfirmOpen(false)} onConfirm={() => void blockMember()} />
    </LinearGradient>
  );
}

function ProfileAction({ label, icon, disabled, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; disabled?: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.disabled]}><View style={[styles.actionIconPlain, { backgroundColor: theme.surfaceStrong, borderColor: theme.borderSoft }]}><Ionicons name={icon} size={22} color={theme.pageText} /></View><Text style={[styles.actionText, { color: theme.pageTextSecondary }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: 10 }, title: { ...typography.heading2 }, mutedText: { ...typography.body, textAlign: "center" }, primaryButton: { minHeight: 48, marginTop: 8, paddingHorizontal: 22, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }, primaryText: { color: colors.white, fontWeight: "900" },
  header: { minHeight: 66, paddingBottom: spacing.sm, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 }, headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" }, headerActions: { flexDirection: "row", alignItems: "center", gap: 2 }, headerTitle: { ...typography.heading3, flex: 1, minWidth: 0, textAlign: "center" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingTop: spacing.lg }, identity: { alignItems: "center", paddingHorizontal: spacing.md }, onlineRow: { minHeight: 28, marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6 }, onlineDot: { width: 8, height: 8, borderRadius: 4 }, onlineText: { fontSize: 11, fontWeight: "800" }, name: { ...typography.heading2, marginTop: 4, textAlign: "center" }, company: { ...typography.body, marginTop: 3, textAlign: "center" }, metaRow: { minHeight: 36, marginTop: 10, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 8 }, cityBadge: { minHeight: 30, paddingHorizontal: 9, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 5 }, cityText: { fontSize: 11, fontWeight: "800" },
  loadingRow: { minHeight: 40, marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, loadingText: { fontSize: 11 }, actions: { marginTop: spacing.lg, flexDirection: "row", justifyContent: "center", gap: 18, paddingHorizontal: spacing.md }, action: { minWidth: 72, minHeight: 78, alignItems: "center", justifyContent: "center" }, actionIconPlain: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" }, actionText: { marginTop: 6, fontSize: 11, fontWeight: "800" }, audioAction: { minHeight: 52, marginHorizontal: spacing.md, marginTop: 12, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, audioText: { fontSize: 13, fontWeight: "900" },
  recommendAction: { minHeight: 76, marginHorizontal: spacing.md, marginTop: 12, padding: 12, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 }, recommendCopy: { flex: 1, minWidth: 0 }, recommendTitle: { fontSize: 13, fontWeight: "900" }, recommendText: { fontSize: 11, lineHeight: 16, marginTop: 3 }, sectionHeading: { marginHorizontal: spacing.md, marginTop: spacing.xl, marginBottom: 10 }, sectionTitle: { ...typography.heading2 }, sectionHelp: { fontSize: 12, lineHeight: 17, marginTop: 4 }, businessGrid: { marginHorizontal: spacing.md, flexDirection: "row", flexWrap: "wrap", gap: 10 }, businessCard: { flexGrow: 1, flexBasis: 210, minHeight: 166, padding: 14, borderRadius: 20, borderWidth: 1 }, businessIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, businessTitle: { ...typography.heading3, marginTop: 10 }, businessDescription: { fontSize: 13, lineHeight: 19, marginTop: 5, flex: 1 }, cardCta: { minHeight: 30, marginTop: 10, flexDirection: "row", alignItems: "center", gap: 6 }, cardCtaText: { fontSize: 11, fontWeight: "900" }, sectionTitleStandalone: { ...typography.heading2, marginHorizontal: spacing.md, marginTop: spacing.xl, marginBottom: 10 }, posts: { marginHorizontal: spacing.md, gap: 9 }, postCard: { minHeight: 104, padding: 13, borderRadius: 19, borderWidth: 1 }, postTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 }, kindText: { fontSize: 10, fontWeight: "900" }, postDate: { fontSize: 11 }, postBody: { fontSize: 13, lineHeight: 19, marginTop: 8 }, emptyPosts: { minHeight: 120, marginHorizontal: spacing.md, padding: spacing.md, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 8 }, pressed: { opacity: 0.78, transform: [{ scale: 0.992 }] }, disabled: { opacity: 0.45 }
});
