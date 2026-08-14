import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AdvantageAdCard } from "@/components/AdvantageAdCard";
import { BrandHeader } from "@/components/BrandHeader";
import { HighlightCard } from "@/components/HighlightCard";
import NeptuneMap from "@/components/NeptuneMap";
import { StatusAvatar } from "@/components/StatusAvatar";
import { capabilitiesForBackendContract } from "@/config/backendCapabilities";
import { env } from "@/config/env";
import { useExperience } from "@/providers/ExperienceProvider";
import { useMessaging } from "@/providers/MessagingProvider";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import { colors, gradients, typography } from "@/theme";
import type { HighlightPost } from "@/types/experience";

type FeedRow =
  | { id: string; kind: "wide"; post: HighlightPost }
  | { id: string; kind: "pair"; left: HighlightPost; right?: HighlightPost };
const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);

function canUseCompactColumn(post: HighlightPost): boolean {
  if (post.kind === "besoin" || post.media?.kind === "video") return false;
  if (post.media && (post.media.height ?? 0) > (post.media.width ?? 0) * 1.35) return false;
  return post.body.trim().length <= 280;
}
function buildFeedRows(posts: HighlightPost[]): FeedRow[] {
  const rows: FeedRow[] = [];
  let pending: HighlightPost | null = null;
  for (const post of posts) {
    if (!canUseCompactColumn(post)) {
      if (pending) { rows.push({ id: `pair-${pending.id}-ad`, kind: "pair", left: pending }); pending = null; }
      rows.push({ id: `wide-${post.id}`, kind: "wide", post });
      continue;
    }
    if (!pending) { pending = post; continue; }
    rows.push({ id: `pair-${pending.id}-${post.id}`, kind: "pair", left: pending, right: post });
    pending = null;
  }
  if (pending) rows.push({ id: `pair-${pending.id}-ad`, kind: "pair", left: pending });
  return rows;
}
const publishIdSafe = (value?: string) => value ?? "";

export default function HighlightsScreen() {
  const params = useLocalSearchParams<{ published?: string }>();
  const publishedId = Array.isArray(params.published) ? params.published[0] : params.published;
  const { accessToken } = useSession();
  const { posts, mapMoments, localConversations, togglePostReaction, createPrivateConversation } = useExperience();
  const { visibleConversations, refreshConversations } = useMessaging();
  const api = useMemo(() => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)), [accessToken]);
  const [mode, setMode] = useState<"feed" | "map">("feed");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [openingAction, setOpeningAction] = useState(false);
  const overlayProgress = useRef(new Animated.Value(0)).current;
  const publishProgress = useRef(new Animated.Value(publishedId ? 0 : 1)).current;
  const feedRows = useMemo(() => buildFeedRows(posts), [posts]);
  const selectedMoment = useMemo(() => mapMoments.find((moment) => moment.member.id === selectedMemberId), [mapMoments, selectedMemberId]);
  const selectedPosts = useMemo(() => selectedMoment ? posts.filter((post) => selectedMoment.recentPostIds.includes(post.id)) : [], [posts, selectedMoment]);

  useEffect(() => {
    Animated.spring(overlayProgress, { toValue: selectedMemberId ? 1 : 0, useNativeDriver: true, damping: 18, stiffness: 170, mass: 0.75 }).start();
  }, [overlayProgress, selectedMemberId]);
  useEffect(() => {
    if (!publishedId) return;
    publishProgress.setValue(0);
    Animated.sequence([
      Animated.timing(publishProgress, { toValue: 0.55, duration: 220, useNativeDriver: true }),
      Animated.spring(publishProgress, { toValue: 1, useNativeDriver: true, damping: 15, stiffness: 185, mass: 0.72 })
    ]).start();
  }, [publishIdSafe(publishedId), publishProgress]);

  const ensureSelectedConversation = async () => {
    if (!selectedMoment) throw new Error("Membre introuvable.");
    const existing = [...visibleConversations, ...localConversations].find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(selectedMoment.member.id));
    if (existing) return existing;
    if (api) { const conversation = await api.createPrivateConversation([selectedMoment.member.id]); await refreshConversations(); return conversation; }
    return createPrivateConversation({ memberIds: [selectedMoment.member.id] });
  };
  const openSelectedAction = async (action: "message" | "audio" | "video") => {
    if (openingAction) return;
    setOpeningAction(true);
    try {
      const conversation = await ensureSelectedConversation();
      if (action === "message") router.push(`/chat/${encodeURIComponent(conversation.id)}`);
      else router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode: action } });
    } finally { setOpeningAction(false); }
  };
  const openPost = (postId: string) => router.push(`/highlight/${encodeURIComponent(postId)}`);

  const renderPost = (post: HighlightPost, compact: boolean) => {
    const newlyPublished = publishedId === post.id;
    return (
      <Animated.View style={newlyPublished ? { opacity: publishProgress, transform: [{ translateY: publishProgress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }, { scale: publishProgress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] } : undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir le Temps fort" onPress={() => openPost(post.id)} style={({ pressed }) => [styles.postPressable, pressed && styles.postPressed]}>
          <HighlightCard post={post} compact={compact} onReact={env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? (emoji) => togglePostReaction(post.id, emoji) : undefined} />
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <BrandHeader title="Temps forts" subtitle="Publications, besoins, offres et proximité Neptune." />
      <View style={styles.toolbar}>
        <View style={styles.modeBar} accessibilityRole="tablist">
          {(env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? (["feed", "map"] as const) : (["feed"] as const)).map((item) => {
            const active = mode === item;
            return <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={item === "feed" ? "Afficher le Feed" : "Afficher la carte"} onPress={() => setMode(item)} style={styles.modeButton}>{active ? <LinearGradient colors={gradients.activeTab} style={StyleSheet.absoluteFill} /> : null}<Ionicons name={item === "feed" ? "sparkles" : "map"} size={16} color={active ? colors.text : colors.textMuted} /><Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{item === "feed" ? "Feed" : "Map"}</Text></Pressable>;
          })}
        </View>
      </View>

      {mode === "feed" ? (
        <ScrollView contentContainerStyle={styles.feed} showsVerticalScrollIndicator={false}>
          <View style={styles.rows}>
            {feedRows.map((row) => row.kind === "wide" ? <View key={row.id} style={styles.wideRow}>{renderPost(row.post, false)}</View> : <View key={row.id} style={styles.pairRow}><View style={styles.halfColumn}>{renderPost(row.left, true)}</View><View style={styles.halfColumn}>{row.right ? renderPost(row.right, true) : <AdvantageAdCard />}</View></View>)}
            {posts.length === 0 ? <View style={styles.emptyFeed}><Ionicons name="sparkles-outline" size={28} color={colors.textMuted} /><Text style={styles.emptyText}>Aucun Temps fort visible.</Text></View> : null}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.mapStage}>
          <NeptuneMap moments={mapMoments} selectedMemberId={selectedMemberId} onSelectMember={(memberId) => setSelectedMemberId((current) => current === memberId ? null : memberId)} />
          {selectedMoment ? (
            <Animated.View style={[styles.momentOverlay, { opacity: overlayProgress, transform: [{ translateY: overlayProgress.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] }]}>
              <View style={styles.memberSummary}>
                <Pressable onPress={() => router.push(`/profile/${encodeURIComponent(selectedMoment.member.id)}`)} style={styles.memberIdentity}><StatusAvatar user={selectedMoment.member} size={43} accessible={false} /><View style={styles.memberText}><Text style={styles.memberName} numberOfLines={1}>{selectedMoment.member.name}</Text><Text style={styles.memberMeta} numberOfLines={1}>{selectedMoment.member.company} · position approximative</Text></View></Pressable>
                <Pressable onPress={() => setSelectedMemberId(null)} style={styles.closeButton}><Ionicons name="close" size={20} color={colors.textMuted} /></Pressable>
              </View>
              <ScrollView style={styles.momentScroll} contentContainerStyle={styles.floatingMoments} showsVerticalScrollIndicator={false}>
                {selectedPosts.slice(0, 3).map((post, index) => <View key={post.id} style={[styles.momentBubble, { marginLeft: index * 12, marginRight: Math.max(0, 24 - index * 10) }]}><Pressable onPress={() => openPost(post.id)}><View style={styles.momentTop}><Text style={styles.momentKind}>{post.kind.toLocaleUpperCase("fr")}</Text><Text style={styles.momentDate}>{new Date(post.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</Text></View><Text style={styles.momentBody} numberOfLines={3}>{post.body}</Text></Pressable><View style={styles.bubbleActions}>{(["❤️", "🔥", "👏"] as const).map((emoji) => <Pressable key={emoji} onPress={() => togglePostReaction(post.id, emoji)} style={styles.bubbleReaction}><Text style={styles.bubbleEmoji}>{emoji}</Text></Pressable>)}<Pressable onPress={() => openPost(post.id)} style={styles.bubbleComment}><Ionicons name="chatbubble-outline" size={17} color={colors.textMuted} /><Text style={styles.momentStat}>{post.comments.length}</Text></Pressable></View></View>)}
              </ScrollView>
              <View style={styles.quickActions}>{openingAction ? <View style={styles.actionLoader}><ActivityIndicator size="small" color={colors.violet} /></View> : null}{([ ["message", "chatbubble", "Message"], ["audio", "call", "Appeler"], ["video", "videocam", "Visio"] ] as const).map(([action, icon, label]) => <Pressable key={action} disabled={openingAction} onPress={() => void openSelectedAction(action)} style={styles.quickAction}><Ionicons name={icon} size={19} color={colors.text} /><Text style={styles.quickText}>{label}</Text></Pressable>)}</View>
            </Animated.View>
          ) : <View style={styles.mapHint}><Ionicons name="sparkles" size={16} color={colors.orange} /><Text style={styles.mapHintText}>Les contours pulsants indiquent une publication récente.</Text></View>}
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, toolbar: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8 }, modeBar: { height: 52, padding: 3, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", overflow: "hidden" }, modeButton: { flex: 1, minHeight: 48, overflow: "hidden", borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, modeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "900" }, modeLabelActive: { color: colors.text },
  postPressable: { borderRadius: 22 }, postPressed: { opacity: 0.96, transform: [{ scale: 0.996 }] }, feed: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 10, paddingBottom: 24 }, rows: { gap: 9 }, wideRow: { width: "100%" }, pairRow: { width: "100%", flexDirection: "row", alignItems: "stretch", gap: 9 }, halfColumn: { flex: 1, minWidth: 0 }, emptyFeed: { width: "100%", minHeight: 180, alignItems: "center", justifyContent: "center", gap: 8 }, emptyText: { ...typography.bodySmall, color: colors.textMuted },
  mapStage: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 10, paddingBottom: 12, position: "relative" }, mapHint: { position: "absolute", left: 22, right: 22, bottom: 24, minHeight: 48, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(8,18,38,0.94)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, mapHintText: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, fontWeight: "800" },
  momentOverlay: { position: "absolute", left: 18, right: 18, bottom: 20, maxHeight: "78%", padding: 10, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: "rgba(5,11,28,0.96)", shadowColor: "#000000", shadowOpacity: 0.4, shadowRadius: 26, shadowOffset: { width: 0, height: 16 } }, memberSummary: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 8 }, memberIdentity: { flex: 1, minWidth: 0, minHeight: 50, flexDirection: "row", alignItems: "center", gap: 9 }, memberText: { flex: 1, minWidth: 0 }, memberName: { color: colors.text, fontSize: 14, fontWeight: "900" }, memberMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 }, closeButton: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceStrong },
  momentScroll: { maxHeight: 310, marginTop: 6 }, floatingMoments: { gap: 8, paddingBottom: 4 }, momentBubble: { padding: 11, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface }, momentTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, momentKind: { color: colors.orange, fontSize: 11, fontWeight: "900" }, momentDate: { color: colors.textMuted, fontSize: 11 }, momentBody: { color: colors.textSecondary, fontSize: 11, lineHeight: 16, marginTop: 5 }, bubbleActions: { minHeight: 48, marginTop: 5, flexDirection: "row", alignItems: "center", gap: 2 }, bubbleReaction: { width: 48, height: 48, alignItems: "center", justifyContent: "center" }, bubbleEmoji: { fontSize: 17 }, bubbleComment: { minWidth: 48, height: 48, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, momentStat: { color: colors.textMuted, fontSize: 11, fontWeight: "800" }, quickActions: { minHeight: 56, marginTop: 7, flexDirection: "row", alignItems: "center", gap: 8, position: "relative" }, quickAction: { flex: 1, minHeight: 48, borderRadius: 16, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, quickText: { color: colors.text, fontSize: 11, fontWeight: "900" }, actionLoader: { position: "absolute", left: 0, right: 0, top: -38, alignItems: "center" }
});