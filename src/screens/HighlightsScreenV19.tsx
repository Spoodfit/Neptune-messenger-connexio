import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { BrandHeader } from "../components/BrandHeader";
import DiscoveryMap from "../components/DiscoveryMap";
import type { DiscoveryEntitySelection } from "../components/DiscoveryMap.types";
import { HighlightCard } from "../components/HighlightCard";
import { StatusAvatar } from "../components/StatusAvatar";
import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { env } from "../config/env";
import { discoveryEventsMock } from "../data/discoveryEventsMock";
import { getDiscoveryEventState, visibleDiscoveryEvents, type DiscoveryEvent, type DiscoveryEventWindow } from "../domain/discoveryEvents";
import { useExperience } from "../providers/ExperienceProvider";
import { useAppLanguage } from "../providers/LanguageProvider";
import { useMessaging } from "../providers/MessagingProvider";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { NeptuneExperienceApi } from "../services/api/experienceApi";
import { NeptuneEventsApi } from "../services/api/neptuneEventsApi";
import { gradients, typography } from "../theme";
import type { HighlightKind } from "../types/experience";

const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);
type FeedFilter = "all" | HighlightKind;
type MapFilter = "all" | "person" | "event";

const FEED_FILTERS: Array<{ value: FeedFilter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: "all", label: "Pour vous", icon: "sparkles-outline" },
  { value: "besoin", label: "Besoins", icon: "hand-left-outline" },
  { value: "offre", label: "Offres", icon: "pricetag-outline" },
  { value: "reussite", label: "Réussites", icon: "trophy-outline" },
  { value: "standard", label: "Temps forts", icon: "flash-outline" }
];
const MAP_FILTERS = [
  ["all", "Tout", "apps-outline"],
  ["person", "Personnes", "people-outline"],
  ["event", "Évènements", "calendar-outline"]
] as const;
const EVENT_WINDOWS: Array<{ value: DiscoveryEventWindow; label: string }> = [
  { value: "all", label: "Tous" },
  { value: "recent", label: "Terminés depuis moins d’une heure" },
  { value: "live", label: "En cours" },
  { value: "upcoming", label: "À venir" }
];

export default function HighlightsScreenV19() {
  const theme = useAppTheme();
  const { localeTag } = useAppLanguage();
  const { currentUser, accessToken } = useSession();
  const { posts, mapMoments, localConversations, togglePostReaction, createPrivateConversation } = useExperience();
  const { visibleConversations, refreshConversations } = useMessaging();
  const [mode, setMode] = useState<"feed" | "map">("feed");
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [mapFilter, setMapFilter] = useState<MapFilter>("all");
  const [eventWindow, setEventWindow] = useState<DiscoveryEventWindow>("all");
  const [selectedEntity, setSelectedEntity] = useState<DiscoveryEntitySelection | null>(null);
  const [events, setEvents] = useState<DiscoveryEvent[]>(env.mockMode ? discoveryEventsMock : []);
  const [eventsLoading, setEventsLoading] = useState(!env.mockMode);
  const [eventsSyncUnavailable, setEventsSyncUnavailable] = useState(false);
  const [openingAction, setOpeningAction] = useState(false);

  const experienceApi = useMemo(() => env.mockMode ? null : new NeptuneExperienceApi(accessToken), [accessToken]);
  const eventsApi = useMemo(() => env.mockMode ? null : new NeptuneEventsApi(accessToken), [accessToken]);
  const activeModeGradient = theme.isLight ? ([theme.accentSoft, theme.violetSoft] as const) : gradients.activeTab;

  useEffect(() => {
    if (!eventsApi) return;
    let cancelled = false;
    setEventsLoading(true);
    void eventsApi.listDiscoveryEvents()
      .then((items) => {
        if (cancelled) return;
        setEvents(items);
        setEventsSyncUnavailable(false);
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
          setEventsSyncUnavailable(true);
        }
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => { cancelled = true; };
  }, [eventsApi]);

  useEffect(() => {
    if (selectedEntity?.kind === "person" && mapFilter === "event") setSelectedEntity(null);
    if (selectedEntity?.kind === "event" && mapFilter === "person") setSelectedEntity(null);
  }, [mapFilter, selectedEntity]);

  const filteredPosts = useMemo(() => {
    const source = feedFilter === "all" ? posts : posts.filter((post) => post.kind === feedFilter);
    return [...source].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  }, [feedFilter, posts]);
  const mapEvents = useMemo(() => mapFilter === "person" ? [] : visibleDiscoveryEvents(events, eventWindow), [eventWindow, events, mapFilter]);
  const mapPeople = mapFilter === "event" ? [] : mapMoments;
  const selectedMoment = selectedEntity?.kind === "person" ? mapMoments.find((moment) => moment.member.id === selectedEntity.id) : undefined;
  const selectedEvent = selectedEntity?.kind === "event" ? events.find((event) => event.id === selectedEntity.id) : undefined;
  const selectedPost = selectedMoment ? posts.find((post) => selectedMoment.recentPostIds.includes(post.id)) : undefined;

  const ensureSelectedConversation = async () => {
    if (!selectedMoment) throw new Error("Membre introuvable.");
    const existing = [...visibleConversations, ...localConversations].find((conversation) => conversation.type === "direct" && conversation.memberIds?.includes(selectedMoment.member.id));
    if (existing) return existing;
    if (experienceApi) {
      const conversation = await experienceApi.createPrivateConversation([selectedMoment.member.id]);
      await refreshConversations();
      return conversation;
    }
    return createPrivateConversation({ memberIds: [selectedMoment.member.id] });
  };

  const openPersonAction = async (action: "message" | "audio" | "video") => {
    if (openingAction) return;
    setOpeningAction(true);
    try {
      const conversation = await ensureSelectedConversation();
      if (action === "message") router.push(`/chat/${encodeURIComponent(conversation.id)}`);
      else router.push({ pathname: "/call/[id]", params: { id: conversation.id, mode: action, returnTo: "/(tabs)/highlights" } });
    } finally {
      setOpeningAction(false);
    }
  };

  const eventState = selectedEvent ? getDiscoveryEventState(selectedEvent) : null;
  const eventColor = eventState === "live" ? theme.success : eventState === "recent" ? theme.warning : eventState === "voting" ? theme.violet : theme.accent;
  const eventLabel = eventState === "live" ? "En cours maintenant" : eventState === "recent" ? "Terminé il y a moins d’une heure" : eventState === "voting" ? "Vote en cours" : "À venir";

  return <LinearGradient colors={theme.pageGradient} style={styles.screen}>
    <BrandHeader title="Temps forts" subtitle="Découvrir, demander un coup de main et créer des opportunités." />

    <View style={styles.modeWrap}>
      <View style={[styles.modeBar, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]} accessibilityRole="tablist">
        {(["feed", "map"] as const).map((item) => {
          const active = mode === item;
          return <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={item === "feed" ? "Afficher le Feed" : "Afficher la carte"} onPress={() => setMode(item)} style={styles.modeButton}>
            {active ? <LinearGradient colors={activeModeGradient} style={StyleSheet.absoluteFill} /> : null}
            <Ionicons name={item === "feed" ? "sparkles" : "map-outline"} size={17} color={active ? theme.pageText : theme.pageTextMuted} />
            <Text style={[styles.modeText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{item === "feed" ? "Feed" : "Map"}</Text>
          </Pressable>;
        })}
      </View>
    </View>

    {mode === "feed" ? <ScrollView contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="Publier un Temps fort" onPress={() => router.push("/new-highlight")} style={[styles.composerCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
        <StatusAvatar user={currentUser} size={44} accessible={false} />
        <View style={styles.composerCopy}>
          <Text style={[styles.composerPrompt, { color: theme.pageText }]}>Qu’est-ce qui peut être utile au réseau aujourd’hui ?</Text>
          <Text style={[styles.composerHint, { color: theme.pageTextMuted }]}>Un besoin, une réussite, une offre ou un moment à partager.</Text>
        </View>
        <View style={[styles.composerAdd, { backgroundColor: theme.accentSoft }]}><Ionicons name="add" size={23} color={theme.accent} /></View>
      </Pressable>

      <View style={styles.quickPublishRow}>
        <Pressable onPress={() => router.push({ pathname: "/new-highlight", params: { kind: "besoin" } })} style={[styles.quickPublish, { backgroundColor: theme.dangerSoft }]}><Ionicons name="hand-left-outline" size={17} color={theme.danger} /><Text style={[styles.quickPublishText, { color: theme.danger }]}>J’ai besoin d’aide</Text></Pressable>
        <Pressable onPress={() => router.push({ pathname: "/new-highlight", params: { kind: "offre" } })} style={[styles.quickPublish, { backgroundColor: theme.successSoft }]}><Ionicons name="pricetag-outline" size={17} color={theme.success} /><Text style={[styles.quickPublishText, { color: theme.success }]}>Je peux aider</Text></Pressable>
      </View>

      <View style={styles.filterRow}>
        {FEED_FILTERS.map((item) => {
          const active = feedFilter === item.value;
          return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => setFeedFilter(item.value)} style={[styles.filterChip, { backgroundColor: active ? theme.accentSoft : theme.surface, borderColor: active ? theme.accent : theme.borderSoft }]}><Ionicons name={item.icon} size={16} color={active ? theme.accent : theme.pageTextMuted} /><Text style={[styles.filterText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{item.label}</Text></Pressable>;
        })}
      </View>

      <View style={styles.feedHeading}>
        <View><Text style={[styles.sectionTitle, { color: theme.pageText }]}>{feedFilter === "all" ? "À découvrir" : FEED_FILTERS.find((item) => item.value === feedFilter)?.label}</Text><Text style={[styles.sectionSubtitle, { color: theme.pageTextMuted }]}>{filteredPosts.length} publication{filteredPosts.length > 1 ? "s" : ""}</Text></View>
        <Ionicons name="options-outline" size={20} color={theme.pageTextMuted} />
      </View>

      <View style={styles.postList}>
        {filteredPosts.map((post) => <Pressable key={post.id} accessibilityRole="button" accessibilityLabel="Ouvrir le Temps fort" onPress={() => router.push(`/highlight/${encodeURIComponent(post.id)}`)} style={({ pressed }) => [styles.postPressable, pressed && styles.pressed]}><HighlightCard post={post} onReact={env.mockMode || BACKEND_CAPABILITIES.highlightsCommunity ? (emoji) => togglePostReaction(post.id, emoji) : undefined} /></Pressable>)}
        {filteredPosts.length === 0 ? <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Ionicons name="sparkles-outline" size={28} color={theme.pageTextMuted} /><Text style={[styles.emptyTitle, { color: theme.pageText }]}>Rien ici pour le moment</Text><Text style={[styles.emptyText, { color: theme.pageTextMuted }]}>Soyez le premier à partager quelque chose d’utile au réseau.</Text></View> : null}
      </View>
    </ScrollView> : <View style={styles.mapContent}>
      <View style={styles.mapFilters}>{MAP_FILTERS.map(([value, label, icon]) => {
        const active = mapFilter === value;
        return <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => setMapFilter(value)} style={[styles.mapFilterChip, { backgroundColor: active ? theme.accentSoft : theme.surface, borderColor: active ? theme.accent : theme.borderSoft }]}><Ionicons name={icon} size={16} color={active ? theme.accent : theme.pageTextMuted} /><Text style={[styles.filterText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{label}</Text></Pressable>;
      })}</View>

      {mapFilter !== "person" ? <View style={styles.eventWindowRow}>{EVENT_WINDOWS.map((item) => {
        const active = eventWindow === item.value;
        return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => setEventWindow(item.value)} style={[styles.windowChip, { backgroundColor: active ? theme.surfaceStrong : "transparent", borderColor: active ? theme.border : "transparent" }]}><Text style={[styles.windowText, { color: active ? theme.pageText : theme.pageTextMuted }]}>{item.label}</Text></Pressable>;
      })}{eventsLoading ? <ActivityIndicator size="small" color={theme.accent} /> : null}</View> : null}

      <View style={styles.mapStage}>
        <DiscoveryMap moments={mapPeople} events={mapEvents} selectedEntity={selectedEntity} onSelectEntity={(entity) => setSelectedEntity((current) => current?.kind === entity.kind && current.id === entity.id ? null : entity)} />

        {!selectedEntity ? <View style={[styles.mapLegend, { backgroundColor: theme.shellBackground, borderColor: theme.borderSoft }]}>
          <View style={styles.legendItem}><View style={[styles.personLegend, { borderColor: theme.violet }]} /><Text style={[styles.legendText, { color: theme.pageTextSecondary }]}>Personne</Text></View>
          <View style={styles.legendItem}><View style={[styles.eventLegend, { backgroundColor: theme.accent }]} /><Text style={[styles.legendText, { color: theme.pageTextSecondary }]}>Évènement</Text></View>
          {eventsSyncUnavailable ? <Text style={[styles.syncWarning, { color: theme.pageTextMuted }]}>Synchronisation évènements en attente du backend Neptune Business.</Text> : null}
        </View> : null}

        {selectedMoment ? <View style={[styles.entitySheet, { backgroundColor: theme.shellBackground, borderColor: theme.border }]}>
          <View style={styles.sheetTop}>
            <Pressable onPress={() => router.push(`/profile/${encodeURIComponent(selectedMoment.member.id)}`)} style={styles.personIdentity}><StatusAvatar user={selectedMoment.member} size={50} accessible={false} /><View style={styles.identityCopy}><Text style={[styles.entityTitle, { color: theme.pageText }]} numberOfLines={1}>{selectedMoment.member.name}</Text><Text style={[styles.entityMeta, { color: theme.pageTextMuted }]} numberOfLines={1}>{selectedMoment.member.company} · {selectedMoment.member.city}</Text></View></Pressable>
            <Pressable accessibilityLabel="Fermer" onPress={() => setSelectedEntity(null)} style={[styles.closeButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="close" size={20} color={theme.pageTextMuted} /></Pressable>
          </View>
          {selectedPost ? <Pressable onPress={() => router.push(`/highlight/${encodeURIComponent(selectedPost.id)}`)} style={[styles.latestMoment, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}><Text style={[styles.momentEyebrow, { color: theme.orange }]}>DERNIER TEMPS FORT</Text><Text style={[styles.momentText, { color: theme.pageTextSecondary }]} numberOfLines={2}>{selectedPost.body}</Text></Pressable> : null}
          <View style={styles.sheetActions}><Pressable disabled={openingAction} onPress={() => void openPersonAction("message")} style={[styles.primaryAction, { backgroundColor: theme.accent }]}><Ionicons name="chatbubble-ellipses" size={19} color="#fff" /><Text style={styles.primaryActionText}>Message</Text></Pressable><Pressable disabled={openingAction} onPress={() => void openPersonAction("audio")} style={[styles.secondaryAction, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="call-outline" size={19} color={theme.pageText} /></Pressable><Pressable onPress={() => router.push(`/profile/${encodeURIComponent(selectedMoment.member.id)}`)} style={[styles.secondaryAction, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="person-outline" size={19} color={theme.pageText} /></Pressable></View>
        </View> : null}

        {selectedEvent ? <View style={[styles.entitySheet, { backgroundColor: theme.shellBackground, borderColor: theme.border }]}>
          <View style={styles.sheetTop}><View style={[styles.eventIconLarge, { backgroundColor: eventColor }]}><Ionicons name="calendar" size={23} color="#fff" /></View><View style={styles.identityCopy}><View style={styles.eventStateRow}><View style={[styles.stateDot, { backgroundColor: eventColor }]} /><Text style={[styles.eventState, { color: eventColor }]}>{eventLabel}</Text></View><Text style={[styles.entityTitle, { color: theme.pageText }]} numberOfLines={2}>{selectedEvent.title}</Text></View><Pressable accessibilityLabel="Fermer" onPress={() => setSelectedEntity(null)} style={[styles.closeButton, { backgroundColor: theme.surfaceStrong }]}><Ionicons name="close" size={20} color={theme.pageTextMuted} /></Pressable></View>
          <View style={styles.eventDetails}><View style={styles.detailRow}><Ionicons name="time-outline" size={17} color={theme.pageTextMuted} /><Text style={[styles.detailText, { color: theme.pageTextSecondary }]}>{new Date(selectedEvent.startsAt).toLocaleString(localeTag, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Text></View>{selectedEvent.address || selectedEvent.city ? <View style={styles.detailRow}><Ionicons name="location-outline" size={17} color={theme.pageTextMuted} /><Text style={[styles.detailText, { color: theme.pageTextSecondary }]} numberOfLines={1}>{selectedEvent.address ?? selectedEvent.city}</Text></View> : null}</View>
          {selectedEvent.summary ? <Text style={[styles.eventSummary, { color: theme.pageTextMuted }]} numberOfLines={2}>{selectedEvent.summary}</Text> : null}
          <Pressable accessibilityRole="link" disabled={!selectedEvent.webUrl} onPress={() => selectedEvent.webUrl ? void Linking.openURL(selectedEvent.webUrl) : undefined} style={[styles.eventCta, { backgroundColor: theme.accent }, !selectedEvent.webUrl && styles.disabled]}><Text style={styles.primaryActionText}>Voir l’évènement Neptune</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></Pressable>
        </View> : null}
      </View>
    </View>}
  </LinearGradient>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  modeWrap: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 12, paddingTop: 8 },
  modeBar: { minHeight: 56, padding: 4, borderRadius: 18, borderWidth: 1, flexDirection: "row", overflow: "hidden" },
  modeButton: { flex: 1, minHeight: 48, borderRadius: 14, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  modeText: { fontSize: 13, fontWeight: "900" },
  feedContent: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 12, paddingBottom: 28 },
  composerCard: { marginTop: 12, minHeight: 88, padding: 12, borderRadius: 22, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  composerCopy: { flex: 1, minWidth: 0 },
  composerPrompt: { fontSize: 14, lineHeight: 19, fontWeight: "900" },
  composerHint: { fontSize: 14, lineHeight: 19, marginTop: 3 },
  composerAdd: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickPublishRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  quickPublish: { flex: 1, minHeight: 48, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 8 },
  quickPublishText: { fontSize: 12, fontWeight: "900" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 12 },
  filterChip: { minHeight: 48, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  filterText: { fontSize: 12, fontWeight: "800" },
  feedHeading: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2 },
  sectionTitle: { ...typography.heading3 },
  sectionSubtitle: { fontSize: 11, marginTop: 2 },
  postList: { gap: 12 }, postPressable: { borderRadius: 22 }, pressed: { opacity: 0.95, transform: [{ scale: 0.996 }] },
  empty: { minHeight: 210, padding: 24, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 15, fontWeight: "900", marginTop: 10 }, emptyText: { ...typography.bodySmall, textAlign: "center", marginTop: 5 },
  mapContent: { flex: 1, width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 12, paddingBottom: 12 },
  mapFilters: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 10, paddingBottom: 8 },
  mapFilterChip: { minHeight: 48, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 7 },
  eventWindowRow: { minHeight: 48, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingBottom: 8 },
  windowChip: { minHeight: 44, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  windowText: { fontSize: 11, fontWeight: "800" },
  mapStage: { flex: 1, position: "relative" },
  mapLegend: { position: "absolute", left: 12, right: 12, bottom: 12, minHeight: 50, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 14, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 }, personLegend: { width: 18, height: 18, borderRadius: 7, borderWidth: 3 }, eventLegend: { width: 16, height: 16, borderRadius: 5, transform: [{ rotate: "45deg" }] }, legendText: { fontSize: 11, fontWeight: "800" }, syncWarning: { flexBasis: "100%", fontSize: 11, lineHeight: 15, paddingBottom: 4 },
  entitySheet: { position: "absolute", left: 10, right: 10, bottom: 10, padding: 12, borderRadius: 24, borderWidth: 1, shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  sheetTop: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10 }, personIdentity: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 }, identityCopy: { flex: 1, minWidth: 0 }, entityTitle: { fontSize: 15, lineHeight: 20, fontWeight: "900" }, entityMeta: { fontSize: 11, marginTop: 3 }, closeButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  latestMoment: { marginTop: 9, padding: 10, borderRadius: 17, borderWidth: 1 }, momentEyebrow: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 }, momentText: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  sheetActions: { flexDirection: "row", gap: 8, marginTop: 10 }, primaryAction: { flex: 1, minHeight: 48, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, primaryActionText: { color: "#fff", fontSize: 13, fontWeight: "900" }, secondaryAction: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  eventIconLarge: { width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center" }, eventStateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 }, stateDot: { width: 7, height: 7, borderRadius: 4 }, eventState: { fontSize: 10, fontWeight: "900" }, eventDetails: { gap: 6, marginTop: 9 }, detailRow: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: 7 }, detailText: { flex: 1, fontSize: 12, fontWeight: "700" }, eventSummary: { fontSize: 11, lineHeight: 16, marginTop: 6 }, eventCta: { minHeight: 48, borderRadius: 16, marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, disabled: { opacity: 0.5 }
});
