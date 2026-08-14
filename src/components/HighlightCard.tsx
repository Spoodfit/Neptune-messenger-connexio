import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { AppAlert } from "@/services/ui/AppAlert";

import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { env } from "../config/env";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { NeptuneExperienceApi } from "../services/api/experienceApi";
import { colors, gradients, typography } from "../theme";
import type { HighlightPost, QuickReaction } from "../types/experience";
import { ActionSheet, type ActionSheetOption } from "./ActionSheet";
import { HighlightMediaView } from "./HighlightMediaView";
import { StatusAvatar } from "./StatusAvatar";

interface HighlightCardProps { post: HighlightPost; compact?: boolean; onReact?: (emoji: QuickReaction) => void; }
const REACTIONS: QuickReaction[] = ["❤️", "🔥", "👏", "💡", "🤝", "😂"];
const KIND_LABELS: Record<HighlightPost["kind"], string> = { standard: "TEMPS FORT", besoin: "BESOIN", reussite: "RÉUSSITE", offre: "OFFRE" };
const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);

export function HighlightCard({ post, compact = false, onReact }: HighlightCardProps) {
  const { accessToken } = useSession();
  const theme = useAppTheme();
  const api = useMemo(() => env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? new NeptuneExperienceApi(accessToken) : null, [accessToken]);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const totalReactions = post.reactions.reduce((total, reaction) => total + reaction.count, 0);
  const locationLabel = post.location?.label ?? post.locationLabel;
  const synchronized = post.kind === "offre" ? post.syncedWithAdvantagesCommittee || post.syncedWithBusinessApp : post.syncedWithBusinessApp;

  const sharePost = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const result = api ? await api.shareHighlight(post.id) : { url: Linking.createURL(`/highlight/${encodeURIComponent(post.id)}`), shareCount: post.shareCount + 1 };
      await Share.share({ title: `${post.author.name} sur Connexio`, message: `${post.body || "Temps fort Neptune"}\n${result.url}`, url: result.url });
    } catch (error) { AppAlert.alert("Partage impossible", error instanceof Error ? error.message : "La publication n’a pas pu être partagée."); }
    finally { setSharing(false); }
  };
  const reportPost = async () => {
    if (!api) { AppAlert.alert("Signalement enregistré", "Le signalement est simulé en démonstration."); return; }
    try { await api.reportContent("highlight", post.id, "Contenu signalé depuis Connexio"); AppAlert.alert("Signalement transmis", "La modération Neptune examinera ce contenu."); }
    catch (error) { AppAlert.alert("Signalement impossible", error instanceof Error ? error.message : "Réessayez ultérieurement."); }
  };
  const menuOptions: ActionSheetOption[] = [
    { id: "profile", label: `Voir le profil de ${post.author.name}`, icon: "person-outline", onPress: () => router.push(`/profile/${encodeURIComponent(post.author.id)}`) },
    ...(env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? [
      { id: "share", label: "Partager cette publication", icon: "paper-plane-outline", onPress: sharePost },
      { id: "report", label: "Signaler cette publication", icon: "flag-outline", destructive: true, onPress: reportPost }
    ] satisfies ActionSheetOption[] : [])
  ];

  const kindBackground = post.kind === "besoin" ? theme.dangerSoft : post.kind === "offre" ? theme.successSoft : theme.orangeSoft;
  const kindColor = post.kind === "besoin" ? theme.danger : post.kind === "offre" ? theme.success : theme.orange;

  return (
    <LinearGradient colors={theme.isLight ? [theme.surface, theme.surfaceStrong] : gradients.glass} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={[styles.card, { borderColor: theme.borderSoft, shadowColor: theme.shadow }, compact && styles.compactCard]}>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir le profil de ${post.author.name}`} onPress={() => router.push(`/profile/${encodeURIComponent(post.author.id)}`)} style={styles.authorPressable}>
          <StatusAvatar user={post.author} size={42} accessible={false} />
          <View style={styles.authorContent}><Text style={[styles.authorName, { color: theme.pageText }]} numberOfLines={1}>{post.author.name}</Text><Text style={[styles.meta, { color: theme.pageTextMuted }]} numberOfLines={1}>{post.author.company} · {new Date(post.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</Text></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Options de la publication" onPress={() => setMenuOpen(true)} style={styles.moreButton}><Ionicons name="ellipsis-horizontal" size={20} color={theme.pageTextMuted} /></Pressable>
      </View>

      <View style={styles.kindRow}>
        <View style={[styles.kindBadge, { backgroundColor: kindBackground, borderColor: kindColor }]}><Text style={[styles.kindText, { color: kindColor }]}>{KIND_LABELS[post.kind]}</Text></View>
        {synchronized ? <View style={[styles.syncBadge, { backgroundColor: theme.successSoft }]}><Ionicons name="sync" size={12} color={theme.success} />{!compact ? <Text style={[styles.syncText, { color: theme.success }]}>{post.kind === "offre" ? "Comité Avantage" : "Neptune Business"}</Text> : null}</View> : null}
      </View>

      {post.media ? <View style={styles.mediaWrap}><HighlightMediaView media={post.media} compact={compact} />{post.media.durationSeconds ? <View style={styles.duration}><Text style={styles.durationText}>{Math.floor(post.media.durationSeconds / 60)}:{String(Math.floor(post.media.durationSeconds % 60)).padStart(2, "0")}</Text></View> : null}</View> : null}
      <Text style={[styles.body, { color: theme.pageTextSecondary }, compact && styles.compactBody]} numberOfLines={compact ? 5 : undefined}>{post.body}</Text>
      {locationLabel || post.coordinates ? <View style={styles.locationLine}><Ionicons name="location-outline" size={13} color={theme.pageTextMuted} /><Text style={[styles.locationText, { color: theme.pageTextMuted }]} numberOfLines={1}>{locationLabel ?? "Position approximative"}</Text></View> : null}
      <View style={styles.metrics}><Text style={[styles.metricText, { color: theme.pageTextMuted }]}>{totalReactions} réactions</Text><Text style={[styles.metricText, { color: theme.pageTextMuted }]}>{post.comments.length} commentaires</Text>{!compact ? <Text style={[styles.metricText, { color: theme.pageTextMuted }]}>{post.shareCount} partages</Text> : null}</View>

      {reactionOpen && onReact ? <View style={[styles.reactionPicker, { borderColor: theme.border, backgroundColor: theme.surfaceStrong }]}>{REACTIONS.map((emoji) => {
        const active = post.reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByCurrentUser);
        return <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`Réagir avec ${emoji}`} accessibilityState={{ selected: active }} onPress={() => { onReact(emoji); setReactionOpen(false); }} style={styles.reactionTarget}><View style={[styles.reactionVisual, active && { borderWidth: 1, borderColor: theme.violet, backgroundColor: theme.violetSoft }]}><Text style={styles.reactionEmoji}>{emoji}</Text></View></Pressable>;
      })}</View> : null}

      {post.reactions.length > 0 && onReact ? <View style={styles.reactionSummary}>{post.reactions.map((reaction) => <Pressable key={reaction.emoji} accessibilityRole="button" accessibilityLabel={`${reaction.emoji}, ${reaction.count} réactions`} accessibilityState={{ selected: reaction.reactedByCurrentUser }} onPress={() => onReact(reaction.emoji)} style={styles.reactionSummaryTarget}><View style={[styles.reactionSummaryVisual, { borderColor: reaction.reactedByCurrentUser ? theme.violet : theme.borderSoft, backgroundColor: reaction.reactedByCurrentUser ? theme.violetSoft : theme.surfaceStrong }]}><Text style={styles.reactionPillEmoji}>{reaction.emoji}</Text><Text style={[styles.reactionPillCount, { color: theme.pageTextSecondary }]}>{reaction.count}</Text></View></Pressable>)}</View> : null}

      {env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? <View style={[styles.actions, { borderTopColor: theme.borderSoft }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Réagir à la publication" onPress={() => setReactionOpen((value) => !value)} style={styles.action}><Ionicons name="happy-outline" size={19} color={theme.pageTextMuted} />{!compact ? <Text style={[styles.actionText, { color: theme.pageTextMuted }]}>Réagir</Text> : null}</Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Commenter la publication" onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)} style={styles.action}><Ionicons name="chatbubble-outline" size={18} color={theme.pageTextMuted} />{!compact ? <Text style={[styles.actionText, { color: theme.pageTextMuted }]}>Commenter</Text> : null}</Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Partager la publication" accessibilityState={{ busy: sharing }} disabled={sharing} onPress={() => void sharePost()} style={styles.action}><Ionicons name={sharing ? "hourglass-outline" : "paper-plane-outline"} size={18} color={theme.pageTextMuted} />{!compact ? <Text style={[styles.actionText, { color: theme.pageTextMuted }]}>Partager</Text> : null}</Pressable>
      </View> : null}
      <ActionSheet visible={menuOpen} title="Options du Temps fort" subtitle={post.author.name} options={menuOptions} onClose={() => setMenuOpen(false)} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", flexGrow: 1, padding: 12, borderRadius: 22, borderWidth: 1, shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 }, compactCard: { minHeight: 205, padding: 10, flex: 1, alignSelf: "stretch" }, head: { flexDirection: "row", alignItems: "center", gap: 8 }, authorPressable: { flex: 1, minWidth: 48, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9 }, authorContent: { flex: 1, minWidth: 0 }, authorName: { fontSize: 14, fontWeight: "900" }, meta: { fontSize: 11, marginTop: 2 }, moreButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  kindRow: { marginTop: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }, kindBadge: { minHeight: 24, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1, alignItems: "center", justifyContent: "center" }, kindText: { fontSize: 11, fontWeight: "900" }, syncBadge: { minHeight: 24, paddingHorizontal: 7, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 8 }, syncText: { fontSize: 11, fontWeight: "900" },
  mediaWrap: { marginTop: 9, position: "relative" }, duration: { position: "absolute", right: 8, bottom: 8, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(2,7,19,0.78)" }, durationText: { color: colors.white, fontSize: 11, fontWeight: "900" }, body: { ...typography.bodySmall, lineHeight: 19, marginTop: 9 }, compactBody: { fontSize: 14, lineHeight: 20 }, locationLine: { minHeight: 26, marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 }, locationText: { flex: 1, fontSize: 11, fontWeight: "700" }, metrics: { minHeight: 28, marginTop: 6, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }, metricText: { fontSize: 11, fontWeight: "700" },
  reactionPicker: { minHeight: 48, marginTop: 4, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap" }, reactionTarget: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, reactionVisual: { width: 34, height: 28, borderRadius: 999, alignItems: "center", justifyContent: "center" }, reactionEmoji: { fontSize: 19 }, reactionSummary: { minHeight: 48, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }, reactionSummaryTarget: { minWidth: 48, height: 48, alignItems: "center", justifyContent: "center" }, reactionSummaryVisual: { minHeight: 27, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 }, reactionPillEmoji: { fontSize: 14 }, reactionPillCount: { fontSize: 11, fontWeight: "900" }, actions: { minHeight: 48, marginTop: 8, borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }, action: { flex: 1, minWidth: 48, minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, actionText: { fontSize: 11, fontWeight: "800" }
});
