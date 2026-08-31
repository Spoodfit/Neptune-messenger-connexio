import { Text } from "@/components/LocalizedText";
import { TextInput } from "@/components/LocalizedTextInput";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HighlightMediaView } from "../components/HighlightMediaView";
import { InlineVoiceRecorder } from "../components/InlineVoiceRecorder";
import { StatusAvatar } from "../components/StatusAvatar";
import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { env } from "../config/env";
import { canPublishHighlightKind, TRITON_CHECKOUT_URL } from "../domain/accessPolicy";
import { useExperience } from "../providers/ExperienceProvider";
import { useSession } from "../providers/SessionProvider";
import { type ConnexioTheme, useAppTheme } from "../providers/ThemeProvider";
import { NeptuneExperienceApi } from "../services/api/experienceApi";
import { uploadHighlightMedia } from "../services/api/uploadApi";
import { pickApproximateLocation, pickHighlightMedia } from "../services/media/mediaPicker";
import { AppAlert } from "../services/ui/AppAlert";
import { colors, spacing, typography } from "../theme";
import type { HighlightKind, HighlightLocation, HighlightMedia, PlaceSuggestion } from "../types/experience";
import type { MessageAttachment } from "../types/messaging";

const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);
const KINDS: Array<{ value: HighlightKind; label: string; icon: keyof typeof Ionicons.glyphMap; helper: string }> = [
  { value: "standard", label: "Temps fort", icon: "sparkles-outline", helper: "Partager un moment utile au réseau" },
  { value: "besoin", label: "Besoin", icon: "hand-left-outline", helper: "Obtenir un contact ou un coup de main" },
  { value: "reussite", label: "Réussite", icon: "trophy-outline", helper: "Faire connaître une avancée" },
  { value: "offre", label: "Offre", icon: "pricetag-outline", helper: "Proposer une opportunité au réseau" }
];
const AVAILABLE_KINDS = BACKEND_CAPABILITIES.highlightsCommunity ? KINDS : KINDS.filter((item) => item.value === "besoin");
const PROMPTS: Record<HighlightKind, string> = {
  standard: "Qu’est-ce qui peut être utile ou inspirant pour le réseau ?",
  besoin: "De quoi avez-vous besoin pour avancer ?",
  reussite: "Quelle avancée voulez-vous partager ?",
  offre: "Que pouvez-vous proposer aux membres ?"
};
const STARTERS: Record<HighlightKind, string[]> = {
  standard: ["Aujourd’hui, il s’est passé…", "Le moment à retenir :", "À partager avec le réseau :"],
  besoin: ["Je recherche…", "J’aurais besoin d’un contact pour…", "Qui connaît quelqu’un qui…"],
  reussite: ["Petite victoire du jour :", "Objectif atteint :", "Bonne nouvelle :"],
  offre: ["Je peux vous aider à…", "Opportunité disponible :", "Pour les membres Neptune :"]
};
const DEMO_PLACES: PlaceSuggestion[] = [
  { id: "demo-carcassonne", label: "Carcassonne", address: "11000 Carcassonne", latitude: 43.213, longitude: 2.351 },
  { id: "demo-toulouse", label: "Toulouse", address: "31000 Toulouse", latitude: 43.6045, longitude: 1.444 },
  { id: "demo-montpellier", label: "Montpellier", address: "34000 Montpellier", latitude: 43.611, longitude: 3.877 }
];

function isHighlightKind(value?: string): value is HighlightKind {
  return value === "standard" || value === "besoin" || value === "reussite" || value === "offre";
}

export default function NewHighlightScreenV19() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind?: string }>();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { accessToken, currentUser } = useSession();
  const { members, createPost, refreshExperience } = useExperience();
  const api = useMemo(() => env.mockMode ? null : new NeptuneExperienceApi(accessToken), [accessToken]);
  const requestedKind = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const initialKind: HighlightKind = isHighlightKind(requestedKind) && AVAILABLE_KINDS.some((item) => item.value === requestedKind)
    ? requestedKind
    : BACKEND_CAPABILITIES.highlightsCommunity ? "standard" : "besoin";

  const [kind, setKind] = useState<HighlightKind>(initialKind);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<HighlightMedia>();
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [location, setLocation] = useState<HighlightLocation | null>(null);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [locating, setLocating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const mentionQuery = useMemo(() => body.match(/(?:^|\s)@([^\s@]*)$/u)?.[1]?.toLocaleLowerCase("fr") ?? null, [body]);
  const mentionSuggestions = useMemo(() => mentionQuery === null ? [] : members.filter((member) => `${member.name} ${member.company}`.toLocaleLowerCase("fr").includes(mentionQuery)).slice(0, 5), [members, mentionQuery]);
  const mentionedUserIds = useMemo(() => members.filter((member) => {
    const text = body.toLocaleLowerCase("fr");
    const firstName = member.name.split(" ")[0]?.toLocaleLowerCase("fr") ?? "";
    return Boolean(firstName && text.includes(`@${firstName}`)) || text.includes(`@${member.name.toLocaleLowerCase("fr")}`) || Boolean(member.company && text.includes(`@${member.company.toLocaleLowerCase("fr")}`));
  }).map((member) => member.id), [body, members]);

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 3 || location?.label === query) {
      setPlaces([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearchingPlace(true);
      const request = api ? api.searchPlaces(query) : Promise.resolve(DEMO_PLACES.filter((place) => `${place.label} ${place.address ?? ""}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))));
      void request.then((items) => { if (!cancelled) setPlaces(items.slice(0, 6)); }).catch(() => { if (!cancelled) setPlaces([]); }).finally(() => { if (!cancelled) setSearchingPlace(false); });
    }, 280);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [api, location?.label, locationQuery]);

  const chooseKind = (next: HighlightKind) => {
    if (!canPublishHighlightKind(currentUser.role, next)) {
      AppAlert.alert("Passez Triton", "Les comptes Free peuvent publier uniquement des Besoins. L’abonnement Triton débloque tous les formats.", [
        { text: "Plus tard", style: "cancel" },
        { text: "Passer Triton", onPress: () => void Linking.openURL(TRITON_CHECKOUT_URL) }
      ]);
      return;
    }
    setKind(next);
  };

  const selectMedia = async (mediaKind: "photo" | "video") => {
    try {
      const selected = await pickHighlightMedia(mediaKind);
      if (selected) setMedia(selected);
    } catch (error) {
      AppAlert.alert("Média indisponible", error instanceof Error ? error.message : "Le média n’a pas pu être sélectionné.");
    }
  };

  const useRecordedVoice = (attachment: MessageAttachment) => {
    setVoiceOpen(false);
    setMedia({ ...attachment, kind: "audio" });
  };

  const choosePlace = (place: PlaceSuggestion) => {
    const next: HighlightLocation = { label: place.label, placeId: place.id, address: place.address, latitude: place.latitude, longitude: place.longitude, accuracyRadiusMeters: 100 };
    setLocation(next);
    setLocationQuery(place.label);
    setPlaces([]);
  };

  const useCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const point = await pickApproximateLocation();
      const next: HighlightLocation = { label: "Ma position approximative", latitude: point.latitude, longitude: point.longitude, accuracyRadiusMeters: point.accuracyRadiusMeters };
      setLocation(next);
      setLocationQuery(next.label);
    } catch (error) {
      AppAlert.alert("Localisation impossible", error instanceof Error ? error.message : "La position n’a pas pu être obtenue.");
    } finally {
      setLocating(false);
    }
  };

  const publish = async () => {
    if (publishing) return;
    if (!canPublishHighlightKind(currentUser.role, kind)) {
      await Linking.openURL(TRITON_CHECKOUT_URL);
      return;
    }
    const cleanBody = body.trim();
    if (!cleanBody && !media) {
      AppAlert.alert("Publication vide", "Ajoutez un texte, une photo, une vidéo ou un message vocal.");
      return;
    }
    if (media?.kind === "video" && (media.durationSeconds ?? 0) > 60) {
      AppAlert.alert("Vidéo trop longue", "La durée maximale est de 60 secondes.");
      return;
    }
    setPublishing(true);
    try {
      let readyMedia = media;
      if (readyMedia && api && readyMedia.status !== "ready") {
        setMedia((current) => current ? { ...current, status: "uploading", uploadProgress: 0 } : current);
        readyMedia = await uploadHighlightMedia(readyMedia, accessToken, (progress) => setMedia((current) => current ? { ...current, status: "uploading", uploadProgress: progress } : current));
      }
      const coordinates = location ? { latitude: location.latitude, longitude: location.longitude, accuracyRadiusMeters: location.accuracyRadiusMeters } : undefined;
      const post = api
        ? await api.createHighlight({ kind, body: cleanBody, media: readyMedia, mentionedUserIds, coordinates, location: location ?? undefined, author: currentUser })
        : createPost({ kind, body: cleanBody, media: readyMedia ? { ...readyMedia, status: "ready", uploadProgress: 1 } : undefined, mentionedUserIds, coordinates });
      if (api) await refreshExperience();
      router.replace({ pathname: "/(tabs)/highlights", params: { published: post.id } });
    } catch (error) {
      setMedia((current) => current ? { ...current, status: "failed" } : current);
      AppAlert.alert("Publication impossible", error instanceof Error ? error.message : "Le Temps fort n’a pas pu être publié.");
    } finally {
      setPublishing(false);
    }
  };

  const canPublish = Boolean(body.trim() || media) && !publishing;
  const syncLabel = kind === "besoin" ? "Synchronisé avec les Besoins Neptune Business" : kind === "offre" ? "Synchronisé avec le Comité Avantage" : "Visible dans Connexio";

  return <LinearGradient colors={theme.pageGradient} style={styles.screen}>
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 8), paddingLeft: 8 + insets.left, paddingRight: 8 + insets.right }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => router.back()} style={styles.headerButton}><Ionicons name="close" size={25} color={theme.pageText} /></Pressable>
      <View style={styles.headerCopy}><Text accessibilityRole="header" style={styles.headerTitle}>Créer un Temps fort</Text><Text style={styles.headerSubtitle}>Une idée, un besoin, une opportunité</Text></View>
      <View style={styles.headerButton} />
    </View>

    <ScrollView contentContainerStyle={[styles.content, { paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right, paddingBottom: 120 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.authorRow}><StatusAvatar user={currentUser} size={48} accessible={false} /><View style={styles.flex}><Text style={styles.authorName}>{currentUser.name}</Text><View style={styles.inline}><Ionicons name="people-outline" size={15} color={theme.pageTextMuted} /><Text style={styles.visibilityText}>Visible par la communauté Neptune</Text></View></View></View>

      <View style={styles.kindRow}>{AVAILABLE_KINDS.map((item) => {
        const active = kind === item.value;
        return <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={() => chooseKind(item.value)} style={[styles.kindChip, { backgroundColor: active ? theme.accentSoft : theme.surface, borderColor: active ? theme.accent : theme.borderSoft }]}><Ionicons name={item.icon} size={18} color={active ? theme.accent : theme.pageTextMuted} /><View style={styles.flex}><Text style={[styles.kindLabel, { color: active ? theme.pageText : theme.pageTextMuted }]}>{item.label}</Text><Text style={styles.kindHelper}>{item.helper}</Text></View></Pressable>;
      })}</View>

      <Text style={styles.prompt}>{PROMPTS[kind]}</Text>
      <TextInput value={body} onChangeText={setBody} multiline maxLength={2000} placeholder="Écrivez comme vous parleriez à un membre du réseau… Utilisez @ pour mentionner." placeholderTextColor={theme.pageTextMuted} style={styles.editor} textAlignVertical="top" />
      <View style={styles.editorFooter}><Text style={styles.counter}>{body.length}/2 000</Text><View style={styles.syncPill}><Ionicons name="sync-outline" size={15} color={theme.success} /><Text style={styles.syncText}>{syncLabel}</Text></View></View>

      <View style={styles.starters}>{STARTERS[kind].map((starter) => <Pressable key={starter} onPress={() => setBody((current) => current.trim() ? current : `${starter} `)} style={styles.starterChip}><Ionicons name="flash-outline" size={15} color={theme.orange} /><Text style={styles.starterText}>{starter}</Text></Pressable>)}</View>

      {mentionSuggestions.length > 0 ? <View style={styles.suggestions}>{mentionSuggestions.map((member) => <Pressable key={member.id} onPress={() => setBody((current) => current.replace(/@[^\s@]*$/u, `@${member.name.split(" ")[0]} `))} style={styles.suggestionRow}><StatusAvatar user={member} size={34} accessible={false} /><View style={styles.flex}><Text style={styles.suggestionName}>{member.name}</Text><Text style={styles.secondaryText}>{member.company}</Text></View></Pressable>)}</View> : null}

      <View style={styles.mediaToolbar}>
        <MediaButton styles={styles} theme={theme} icon="image-outline" label="Photo" onPress={() => void selectMedia("photo")} />
        <MediaButton styles={styles} theme={theme} icon="videocam-outline" label="Vidéo" onPress={() => void selectMedia("video")} />
        <MediaButton styles={styles} theme={theme} icon="mic-outline" label="Vocal" onPress={() => setVoiceOpen(true)} />
        <MediaButton styles={styles} theme={theme} icon="location-outline" label="Lieu" active={Boolean(location)} onPress={() => setContextOpen(true)} />
      </View>

      {voiceOpen ? <View style={styles.blockTop}><InlineVoiceRecorder onCancel={() => setVoiceOpen(false)} onRecorded={useRecordedVoice} /></View> : null}
      {media ? <View style={styles.mediaPreview}><HighlightMediaView media={media} /><View style={styles.mediaOverlay}><View style={styles.mediaStatus}><Text style={styles.mediaStatusText}>{media.status === "uploading" ? `Envoi · ${Math.round((media.uploadProgress ?? 0) * 100)} %` : media.kind === "video" ? "Vidéo" : media.kind === "audio" ? "Vocal" : "Photo"}</Text></View><Pressable accessibilityLabel="Retirer le média" onPress={() => setMedia(undefined)} style={styles.removeMedia}><Ionicons name="close" size={20} color={colors.white} /></Pressable></View></View> : null}

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: contextOpen }} onPress={() => setContextOpen((value) => !value)} style={styles.contextHeader}><View style={styles.contextIcon}><Ionicons name="location-outline" size={20} color={theme.orange} /></View><View style={styles.flex}><Text style={styles.contextTitle}>Ajouter du contexte</Text><Text style={styles.contextSubtitle}>{location?.label ?? "Lieu approximatif, facultatif"}</Text></View><Ionicons name={contextOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.pageTextMuted} /></Pressable>

      {contextOpen ? <View style={styles.contextPanel}>
        <View style={styles.locationSearch}><Ionicons name="search-outline" size={19} color={theme.pageTextMuted} /><TextInput value={locationQuery} onChangeText={(value) => { setLocationQuery(value); if (value !== location?.label) setLocation(null); }} placeholder="Rechercher un lieu" placeholderTextColor={theme.pageTextMuted} style={styles.locationInput} />{searchingPlace ? <ActivityIndicator size="small" color={theme.accent} /> : null}</View>
        {places.map((place) => <Pressable key={place.id} onPress={() => choosePlace(place)} style={styles.placeRow}><Ionicons name="location-outline" size={18} color={theme.orange} /><View style={styles.flex}><Text style={styles.placeTitle}>{place.label}</Text>{place.address ? <Text style={styles.secondaryText}>{place.address}</Text> : null}</View></Pressable>)}
        <Pressable disabled={locating} onPress={() => void useCurrentLocation()} style={styles.currentLocation}>{locating ? <ActivityIndicator size="small" color={theme.pageText} /> : <Ionicons name="locate-outline" size={19} color={theme.pageText} />}<Text style={styles.currentLocationText}>{locating ? "Localisation…" : "Utiliser ma position approximative"}</Text></Pressable>
        {location ? <View style={styles.selectedLocation}><Ionicons name="checkmark-circle" size={20} color={theme.success} /><View style={styles.flex}><Text style={styles.placeTitle}>{location.label}</Text>{location.address ? <Text style={styles.secondaryText}>{location.address}</Text> : null}</View><Pressable accessibilityLabel="Retirer le lieu" onPress={() => { setLocation(null); setLocationQuery(""); }} style={styles.smallIconButton}><Ionicons name="close" size={19} color={theme.pageTextMuted} /></Pressable></View> : null}
      </View> : null}
    </ScrollView>

    <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10), paddingLeft: spacing.md + insets.left, paddingRight: spacing.md + insets.right }]}><View style={styles.flex}><Text style={styles.bottomTitle}>{canPublish ? "Prêt à partager" : "Ajoutez un message ou un média"}</Text><Text style={styles.bottomMeta}>{kind === "besoin" ? "Le réseau pourra vous répondre directement." : "Votre Temps fort apparaîtra immédiatement dans le feed."}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Publier" disabled={!canPublish} onPress={() => void publish()} style={[styles.publishButton, !canPublish && styles.disabled]}>{publishing ? <ActivityIndicator size="small" color="#fff" /> : <><Text style={styles.publishText}>Publier</Text><Ionicons name="arrow-up" size={18} color="#fff" /></>}</Pressable></View>
  </LinearGradient>;
}

type ComposerStyles = ReturnType<typeof createStyles>;
function MediaButton({ styles, theme, icon, label, active = false, onPress }: { styles: ComposerStyles; theme: ConnexioTheme; icon: keyof typeof Ionicons.glyphMap; label: string; active?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter ${label}`} onPress={onPress} style={[styles.mediaButton, { backgroundColor: active ? theme.accentSoft : theme.surface, borderColor: active ? theme.accent : theme.borderSoft }]}><Ionicons name={icon} size={20} color={active ? theme.accent : theme.pageText} /><Text style={styles.mediaButtonText}>{label}</Text></Pressable>;
}

const createStyles = (theme: ConnexioTheme) => StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 70, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.borderSoft, backgroundColor: theme.shellBackground, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  headerTitle: { ...typography.heading3, color: theme.pageText },
  headerSubtitle: { fontSize: 14, lineHeight: 18, color: theme.pageTextMuted, marginTop: 2, textAlign: "center" },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingTop: 16 },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 }, flex: { flex: 1, minWidth: 0 }, inline: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  authorName: { color: theme.pageText, fontSize: 14, fontWeight: "900" }, visibilityText: { color: theme.pageTextMuted, fontSize: 14, lineHeight: 18 }, secondaryText: { color: theme.pageTextMuted, fontSize: 12, lineHeight: 17 },
  kindRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 14 },
  kindChip: { flexGrow: 1, flexBasis: 150, minHeight: 68, paddingHorizontal: 11, borderRadius: 18, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  kindLabel: { fontSize: 13, fontWeight: "900" }, kindHelper: { color: theme.pageTextMuted, fontSize: 14, lineHeight: 18, marginTop: 2 },
  prompt: { color: theme.pageText, fontSize: 21, lineHeight: 27, fontWeight: "900", letterSpacing: -0.35, marginTop: 4 },
  editor: { minHeight: 148, paddingVertical: 13, color: theme.pageText, fontSize: 17, lineHeight: 25, fontWeight: "500" },
  editorFooter: { minHeight: 40, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }, counter: { color: theme.pageTextMuted, fontSize: 11, fontWeight: "700" },
  syncPill: { minHeight: 36, paddingHorizontal: 9, borderRadius: 999, backgroundColor: theme.successSoft, flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 1 }, syncText: { color: theme.success, fontSize: 14, lineHeight: 18, fontWeight: "800", flexShrink: 1 },
  starters: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingVertical: 8 }, starterChip: { minHeight: 48, maxWidth: "100%", paddingHorizontal: 11, borderRadius: 14, backgroundColor: theme.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 6 }, starterText: { color: theme.pageTextSecondary, fontSize: 14, lineHeight: 18, fontWeight: "700", flexShrink: 1 },
  suggestions: { marginTop: 6, borderRadius: 18, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, overflow: "hidden" }, suggestionRow: { minHeight: 56, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 9 }, suggestionName: { color: theme.pageText, fontSize: 12, fontWeight: "900" },
  mediaToolbar: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }, mediaButton: { minWidth: 76, minHeight: 48, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, mediaButtonText: { color: theme.pageText, fontSize: 11, fontWeight: "900" },
  blockTop: { marginTop: 10 }, mediaPreview: { marginTop: 12, borderRadius: 22, borderWidth: 1, borderColor: theme.borderSoft, overflow: "hidden", position: "relative" }, mediaOverlay: { position: "absolute", left: 8, right: 8, top: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, mediaStatus: { minHeight: 30, paddingHorizontal: 9, borderRadius: 999, backgroundColor: "rgba(2,7,19,.76)", justifyContent: "center" }, mediaStatusText: { color: colors.white, fontSize: 11, fontWeight: "900" }, removeMedia: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(2,7,19,.78)", alignItems: "center", justifyContent: "center" },
  contextHeader: { minHeight: 78, marginTop: 16, paddingHorizontal: 11, borderRadius: 20, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface, flexDirection: "row", alignItems: "center", gap: 10 }, contextIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: theme.orangeSoft, alignItems: "center", justifyContent: "center" }, contextTitle: { color: theme.pageText, fontSize: 13, fontWeight: "900" }, contextSubtitle: { color: theme.pageTextMuted, fontSize: 14, lineHeight: 18, marginTop: 2 },
  contextPanel: { marginTop: 8, padding: 10, borderRadius: 20, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surface }, locationSearch: { minHeight: 52, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.inputBackground, flexDirection: "row", alignItems: "center", gap: 8 }, locationInput: { flex: 1, minHeight: 50, color: theme.pageText, fontSize: 16 }, placeRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 6 }, placeTitle: { color: theme.pageText, fontSize: 12, fontWeight: "900" }, currentLocation: { minHeight: 48, marginTop: 8, paddingHorizontal: 10, borderRadius: 15, backgroundColor: theme.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 8 }, currentLocationText: { color: theme.pageText, fontSize: 14, lineHeight: 18, fontWeight: "800" }, selectedLocation: { minHeight: 58, marginTop: 8, paddingHorizontal: 9, borderRadius: 16, backgroundColor: theme.successSoft, flexDirection: "row", alignItems: "center", gap: 8 }, smallIconButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 102, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.borderSoft, backgroundColor: theme.shellBackground, flexDirection: "row", alignItems: "center", gap: 10 }, bottomTitle: { color: theme.pageText, fontSize: 12, fontWeight: "900" }, bottomMeta: { color: theme.pageTextMuted, fontSize: 14, lineHeight: 18, marginTop: 2 }, publishButton: { minWidth: 108, minHeight: 52, paddingHorizontal: 14, borderRadius: 17, backgroundColor: theme.accent, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }, publishText: { color: "#fff", fontSize: 14, fontWeight: "900" }, disabled: { opacity: 0.42 }
});
