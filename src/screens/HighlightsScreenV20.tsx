import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AdvantageAdCard } from "../components/AdvantageAdCard";
import { BrandHeader } from "../components/BrandHeader";
import DiscoveryMap from "../components/DiscoveryMap";
import type { DiscoveryEntitySelection } from "../components/DiscoveryMap.types";
import { HighlightCard } from "../components/HighlightCard";
import { StatusAvatar } from "../components/StatusAvatar";
import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { env } from "../config/env";
import { discoveryEventsMock } from "../data/discoveryEventsMock";
import { canPublishHighlightKind, TRITON_CHECKOUT_URL } from "../domain/accessPolicy";
import { getDiscoveryEventState, visibleDiscoveryEvents, type DiscoveryEvent } from "../domain/discoveryEvents";
import { inferHighlightKind, popularHighlightIds } from "../domain/highlightInference";
import { useExperience } from "../providers/ExperienceProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
import { useMessaging } from "../providers/MessagingProvider";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { NeptuneEventsApi } from "../services/api/neptuneEventsApi";
import { NeptuneExperienceApi } from "../services/api/experienceApi";
import { uploadHighlightMedia } from "../services/api/uploadApi";
import { pickApproximateLocation, pickHighlightMedia } from "../services/media/mediaPicker";
import { AppAlert } from "../services/ui/AppAlert";
import { gradients, typography } from "../theme";
import type { HighlightMedia, HighlightPost } from "../types/experience";

const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);
type FeedRow = { id: string; kind: "wide"; post: HighlightPost } | { id: string; kind: "pair"; left: HighlightPost; right?: HighlightPost };

function buildFeedRows(posts: HighlightPost[]): FeedRow[] {
  const popular = popularHighlightIds(posts);
  const rows: FeedRow[] = [];
  let pending: HighlightPost | null = null;
  const flushPending = () => {
    if (!pending) return;
    rows.push({ id: `pair-${pending.id}-advantage`, kind: "pair", left: pending });
    pending = null;
  };
  for (const post of posts) {
    const needsWide = popular.has(post.id) || post.media?.kind === "video" || Boolean(post.media && (post.media.height ?? 0) > (post.media.width ?? 0) * 1.35);
    if (needsWide) {
      flushPending();
      rows.push({ id: `wide-${post.id}`, kind: "wide", post });
      continue;
    }
    if (!pending) pending = post;
    else {
      rows.push({ id: `pair-${pending.id}-${post.id}`, kind: "pair", left: pending, right: post });
      pending = null;
    }
  }
  flushPending();
  return rows;
}

export default function HighlightsScreenV20() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ compose?: string; composeNonce?: string }>();
  const compose = Array.isArray(params.compose) ? params.compose[0] : params.compose;
  const composeNonce = Array.isArray(params.composeNonce) ? params.composeNonce[0] : params.composeNonce;
  const { localeTag } = useAppLanguage();
  const { currentUser, accessToken } = useSession();
  const { posts, mapMoments, members, localConversations, createPost, refreshExperience, togglePostReaction, createPrivateConversation } = useExperience();
  const { visibleConversations, refreshConversations } = useMessaging();
  const [mode, setMode] = useState<"feed" | "map">("feed");
  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<HighlightMedia>();
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracyRadiusMeters: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [events, setEvents] = useState<DiscoveryEvent[]>(env.mockMode ? discoveryEventsMock : []);
  const [selectedEntity, setSelectedEntity] = useState<DiscoveryEntitySelection | null>(null);
  const [openingAction, setOpeningAction] = useState(false);

  const experienceApi = useMemo(() => env.mockMode ? null : new NeptuneExperienceApi(accessToken), [accessToken]);
  const eventsApi = useMemo(() => env.mockMode ? null : new NeptuneEventsApi(accessToken), [accessToken]);
  const feedRows = useMemo(() => buildFeedRows([...posts].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))), [posts]);
  const mapEvents = useMemo(() => visibleDiscoveryEvents(events, "all"), [events]);
  const selectedMoment = selectedEntity?.kind === "person" ? mapMoments.find((item) => item.member.id === selectedEntity.id) : undefined;
  const selectedEvent = selectedEntity?.kind === "event" ? events.find((item) => item.id === selectedEntity.id) : undefined;

  useEffect(() => {
    if (!eventsApi) return;
    let cancelled = false;
    void eventsApi.listDiscoveryEvents().then((items) => { if (!cancelled) setEvents(items); }).catch(() => { if (!cancelled) setEvents([]); });
    return () => { cancelled = true; };
  }, [eventsApi]);

  const startAutomaticLocation = async () => {
    if (location || locating) return;
    setLocating(true);
    try { setLocation(await pickApproximateLocation()); } catch {} finally { setLocating(false); }
  };

  const openComposer = () => {
    setComposerOpen(true);
    void startAutomaticLocation();
  };

  useEffect(() => {
    if (compose !== "1") return;
    setMode("feed");
    setSelectedEntity(null);
    openComposer();
  }, [compose, composeNonce]);

  const selectMedia = async (kind: "photo" | "video") => {
    try {
      const selected = await pickHighlightMedia(kind);
      if (selected) setMedia(selected);
    } catch (error) {
      AppAlert.alert("Média indisponible", error instanceof Error ? error.message : "Le média n’a pas pu être sélectionné.");
    }
  };

  const mentionedUserIds = useMemo(() => {
    const text = body.toLocaleLowerCase("fr");
    return members.filter((member) => {
      const firstName = member.name.split(" ")[0]?.toLocaleLowerCase("fr") ?? "";
      return Boolean(firstName && text.includes(`@${firstName}`)) || text.includes(`@${member.name.toLocaleLowerCase("fr")}`) || Boolean(member.company && text.includes(`@${member.company.toLocaleLowerCase("fr")}`));
    }).map((member) => member.id);
  }, [body, members]);

  const publishQuickly = async () => {
    if (publishing) return;
    const cleanBody = body.trim();
    if (!cleanBody && !media) return;
    const kind = inferHighlightKind(cleanBody);
    if (!canPublishHighlightKind(currentUser.role, kind)) {
      AppAlert.alert("Publication détectée automatiquement", `Connexio a identifié cette publication comme « ${kind} ». Votre statut actuel ne permet pas encore ce format.`, [
        { text: "Modifier", style: "cancel" },
        { text: "Passer Triton", onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL) }
      ]);
      return;
    }
    setPublishing(true);
    try {
      let readyMedia = media;
      if (readyMedia && experienceApi && readyMedia.status !== "ready") readyMedia = await uploadHighlightMedia(readyMedia, accessToken);
      const coordinates = location ?? undefined;
      const post = experienceApi
        ? await experienceApi.createHighlight({ kind, body: cleanBody, media: readyMedia, mentionedUserIds, coordinates, location: coordinates ? { label: "Position approximative", ...coordinates } : undefined, author: currentUser })
        : createPost({ kind, body: cleanBody, media: readyMedia ? { ...readyMedia, status: "ready", uploadProgress: 1 } : undefined, mentionedUserIds, coordinates });
      if (experienceApi) await refreshExperience();
      setBody(""); setMedia(undefined); setLocation(null); setComposerOpen(false);
      router.setParams({ published: post.id, compose: "0" });
    } catch (error) {
      AppAlert.alert("Publication impossible", error instanceof Error ? error.message : "Réessayez ultérieurement.");
    } finally { setPublishing(false); }
  };

  const ensureSelectedConversation = async () => {
    if (!selectedMoment) throw new Error("Membre introuvable.");
    const existing = [...visibleConversations, ...localConversations].find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(selectedMoment.member.id));
    if (existing) return existing;
    if (experienceApi) { const conversation = await experienceApi.createPrivateConversation([selectedMoment.member.id]); await refreshConversations(); return conversation; }
    return createPrivateConversation({ memberIds: [selectedMoment.member.id] });
  };

  const openPersonAction = async (action: "message" | "audio" | "video") => {
    if (openingAction) return;
    setOpeningAction(true);
    try {
      const conversation = await ensureSelectedConversation();
      if (action === "message") router.push(`/chat/${encodeURIComponent(conversation.id)}`);
      else router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode: action, returnTo: "/(tabs)/highlights" } });
    } finally { setOpeningAction(false); }
  };

  const renderPost = (post: HighlightPost, compact: boolean) => <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir le Temps fort" onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)} style={({ pressed }) => [styles.postPressable, pressed && styles.pressed]}><HighlightCard post={post} compact={compact} onReact={env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? (emoji) => togglePostReaction(post.id, emoji) : undefined} /></Pressable>;

  return <LinearGradient colors={theme.pageGradient} style={styles.screen}>
    <BrandHeader title="Temps forts" subtitle="Publications, besoins, offres et proximité Neptune." />
    <View style={styles.modeWrap}><View style={[styles.modeBar, { borderColor: theme.borderSoft, backgroundColor: theme.surface }]} accessibilityRole="tablist">{(["feed", "map"] as const).map((item) => { const active = mode === item; return <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={item === "feed" ? "Afficher le Feed" : "Afficher la carte"} onPress={() => setMode(item)} style={styles.modeButton}>{active ? <LinearGradient colors={theme.isLight ? [theme.accentSoft, theme.violetSoft] : gradients.activeTab} style={StyleSheet.absoluteFill} /> : null}<Ionicons name={item === "feed" ? "sparkles" : "map"} size={16} color={active ? theme.pageText : theme.pageTextMuted} /><Text style={[styles.modeLabel, { color: active ? theme.pageText : theme.pageTextMuted }]}>{item === "feed" ? "Feed" : "Map"}</Text></Pressable>; })}</View></View>

    {mode === "feed" ? <ScrollView contentContainerStyle={styles.feed} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={[styles.quickComposer, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <StatusAvatar user={currentUser} size={42} accessible={false} />
        <View style={styles.composerBody}>
          {!composerOpen ? <Pressable accessibilityRole="button" accessibilityLabel="Écrire une publication rapide" onPress={openComposer} style={styles.composerPromptWrap}><Text style={[styles.composerPrompt, { color: theme.pageTextMuted }]}>Quoi de neuf pour le réseau ?</Text></Pressable> : <TextInput autoFocus multiline value={body} onChangeText={setBody} placeholder="Partagez simplement ce que vous voulez…" placeholderTextColor={theme.pageTextMuted} style={[styles.composerInput, { color: theme.pageText }]} />}
          {composerOpen ? <View style={styles.composerTools}><Pressable accessibilityLabel="Ajouter une photo" onPress={() => void selectMedia("photo")} style={styles.toolButton}><Ionicons name="image-outline" size={20} color={theme.pageTextMuted} /></Pressable><Pressable accessibilityLabel="Ajouter une vidéo" onPress={() => void selectMedia("video")} style={styles.toolButton}><Ionicons name="videocam-outline" size={20} color={theme.pageTextMuted} /></Pressable><View style={styles.locationState}>{locating ? <ActivityIndicator size="small" color={theme.accent} /> : <Ionicons name={location ? "location" : "location-outline"} size={18} color={location ? theme.accent : theme.pageTextMuted} />}<Text style={[styles.locationText, { color: theme.pageTextMuted }]}>{location ? "Position ajoutée" : "Localisation auto"}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Publier maintenant" disabled={publishing || (!body.trim() && !media)} onPress={() => void publishQuickly()} style={[styles.publishButton, { backgroundColor: theme.accent }, (publishing || (!body.trim() && !media)) && styles.disabled]}>{publishing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.publishText}>Publier</Text>}</Pressable></View> : null}
          {media ? <View style={[styles.mediaChip, { backgroundColor: theme.surfaceStrong }]}><Ionicons name={media.kind === "video" ? "videocam" : "image"} size={15} color={theme.accent} /><Text style={[styles.mediaText, { color: theme.pageTextSecondary }]} numberOfLines={1}>{media.name ?? (media.kind === "video" ? "Vidéo" : "Photo")}</Text><Pressable accessibilityLabel="Retirer le média" onPress={() => setMedia(undefined)} style={styles.removeMedia}><Ionicons name="close" size={17} color={theme.pageTextMuted} /></Pressable></View> : null}
        </View>
      </View>
      <View style={styles.rows}>{feedRows.map((row) => row.kind === "wide" ? <View key={row.id} style={styles.wideRow}>{renderPost(row.post, false)}</View> : <View key={row.id} style={styles.pairRow}><View style={styles.halfColumn}>{renderPost(row.left, true)}</View><View style={styles.halfColumn}>{row.right ? renderPost(row.right, true) : <AdvantageAdCard />}</View></View>)}{posts.length === 0 ? <View style={styles.empty}><Ionicons name="sparkles-outline" size={28} color={theme.pageTextMuted} /><Text style={[styles.emptyText, { color: theme.pageTextMuted }]}>Aucun Temps fort visible.</Text></View> : null}</View>
    </ScrollView> : <View style={styles.mapPage}><DiscoveryMap moments={mapMoments} events={mapEvents} selectedEntity={selectedEntity} onSelectEntity={(entity) => setSelectedEntity((current) => current?.kind === entity.kind && current.id === entity.id ? null : entity)} />
      {selectedMoment ? <View style={[styles.mapSheet, { backgroundColor: theme.shellBackground, borderColor: theme.border }]}><View style={styles.sheetTop}><Pressable onPress={() => router.push(`/profile/${encodeURIComponent(selectedMoment.member.id)}`)} style={styles.personIdentity}><StatusAvatar user={selectedMoment.member} size={48} accessible={false} /><View style={styles.sheetCopy}><Text style={[styles.sheetTitle, { color: theme.pageText }]}>{selectedMoment.member.name}</Text><Text style={[styles.sheetMeta, { color: theme.pageTextMuted }]} numberOfLines={1}>{selectedMoment.member.company} · {selectedMoment.member.city}</Text></View></Pressable><Pressable accessibilityLabel="Fermer" onPress={() => setSelectedEntity(null)} style={styles.closeButton}><Ionicons name="close" size={20} color={theme.pageTextMuted} /></Pressable></View><View style={styles.sheetActions}>{([ ["message", "chatbubble-outline", "Message"], ["audio", "call-outline", "Appel"], ["video", "videocam-outline", "Visio"] ] as const).map(([action, icon, label]) => <Pressable key={action} disabled={openingAction} onPress={() => void openPersonAction(action)} style={[styles.sheetAction, { backgroundColor: theme.surfaceStrong }]}><Ionicons name={icon} size={18} color={theme.pageText} /><Text style={[styles.sheetActionText, { color: theme.pageText }]}>{label}</Text></Pressable>)}</View></View> : null}
      {selectedEvent ? <View style={[styles.mapSheet, { backgroundColor: theme.shellBackground, borderColor: theme.border }]}><View style={styles.sheetTop}><View style={[styles.eventIcon, { backgroundColor: theme.accentSoft }]}><Ionicons name="calendar" size={22} color={theme.accent} /></View><View style={styles.sheetCopy}><Text style={[styles.sheetTitle, { color: theme.pageText }]} numberOfLines={2}>{selectedEvent.title}</Text><Text style={[styles.sheetMeta, { color: theme.pageTextMuted }]}>{getDiscoveryEventState(selectedEvent) === "live" ? "En cours" : new Date(selectedEvent.startsAt).toLocaleString(localeTag, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{selectedEvent.city ? ` · ${selectedEvent.city}` : ""}</Text></View><Pressable accessibilityLabel="Fermer" onPress={() => setSelectedEntity(null)} style={styles.closeButton}><Ionicons name="close" size={20} color={theme.pageTextMuted} /></Pressable></View>{selectedEvent.webUrl ? <Pressable onPress={() => void Linking.openURL(selectedEvent.webUrl!)} style={[styles.eventCta, { backgroundColor: theme.accent }]}><Text style={styles.publishText}>Voir l’évènement</Text><Ionicons name="arrow-forward" size={17} color="#fff" /></Pressable> : null}</View> : null}
    </View>}
  </LinearGradient>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  modeWrap: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 10, paddingTop: 8, paddingBottom: 7 },
  modeBar: { height: 58, padding: 3, borderRadius: 16, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  modeButton: { flex: 1, minHeight: 50, borderRadius: 12, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  modeLabel: { fontSize: 11, fontWeight: "900" },
  feed: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 10, paddingBottom: 24 },
  quickComposer: { minHeight: 70, borderRadius: 22, borderWidth: 1, padding: 10, flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 9 },
  composerBody: { flex: 1, minWidth: 0 },
  composerPromptWrap: { minHeight: 48, justifyContent: "center" },
  composerPrompt: { fontSize: 14, fontWeight: "700" },
  composerInput: { minHeight: 74, maxHeight: 150, paddingVertical: 8, fontSize: 16, lineHeight: 22, textAlignVertical: "top" },
  composerTools: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  toolButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  locationState: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 4, flexGrow: 1 },
  locationText: { fontSize: 12, fontWeight: "700" },
  publishButton: { minWidth: 78, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  publishText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  disabled: { opacity: 0.4 },
  mediaChip: { minHeight: 40, borderRadius: 12, paddingLeft: 9, marginBottom: 3, flexDirection: "row", alignItems: "center", gap: 6 },
  mediaText: { flex: 1, fontSize: 11, fontWeight: "700" },
  removeMedia: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  rows: { gap: 9 },
  wideRow: { width: "100%" },
  pairRow: { width: "100%", flexDirection: "row", alignItems: "stretch", gap: 9 },
  halfColumn: { flex: 1, minWidth: 0 },
  postPressable: { borderRadius: 22 },
  pressed: { opacity: 0.95, transform: [{ scale: 0.996 }] },
  empty: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyText: { ...typography.bodySmall },
  mapPage: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 6, paddingBottom: 6, position: "relative" },
  mapSheet: { position: "absolute", left: 12, right: 12, bottom: 12, borderRadius: 24, borderWidth: 1, padding: 11, shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  sheetTop: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 9 },
  personIdentity: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: "row", alignItems: "center", gap: 9 },
  sheetCopy: { flex: 1, minWidth: 0 },
  sheetTitle: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  sheetMeta: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  closeButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  sheetActions: { marginTop: 8, flexDirection: "row", gap: 7 },
  sheetAction: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  sheetActionText: { fontSize: 11, fontWeight: "900" },
  eventIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  eventCta: { minHeight: 48, marginTop: 8, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 }
});
