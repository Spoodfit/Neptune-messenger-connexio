import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HighlightMediaView } from "@/components/HighlightMediaView";
import VoiceRecorderModal from "@/components/VoiceRecorderModal";
import { env } from "@/config/env";
import { useExperience } from "@/providers/ExperienceProvider";
import { useSession } from "@/providers/SessionProvider";
import { NeptuneExperienceApi } from "@/services/api/experienceApi";
import { uploadHighlightMedia } from "@/services/api/uploadApi";
import {
  pickApproximateLocation,
  pickHighlightMedia
} from "@/services/media/mediaPicker";
import { colors, gradients, radii, spacing, typography } from "@/theme";
import type {
  HighlightKind,
  HighlightLocation,
  HighlightMedia,
  PlaceSuggestion
} from "@/types/experience";
import type { MessageAttachment } from "@/types/messaging";

const KINDS: Array<{
  value: HighlightKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { value: "standard", label: "Temps fort", icon: "sparkles-outline" },
  { value: "besoin", label: "Besoin", icon: "hand-left-outline" },
  { value: "reussite", label: "Réussite", icon: "trophy-outline" },
  { value: "offre", label: "Offre", icon: "pricetag-outline" }
];

const DEMO_PLACES: PlaceSuggestion[] = [
  {
    id: "demo-teleski-bram",
    label: "Téléski Nautique de Bram",
    address: "Lac de Buzerens, 11150 Bram",
    latitude: 43.244,
    longitude: 2.116
  },
  {
    id: "demo-cite-carcassonne",
    label: "Cité de Carcassonne",
    address: "1 Rue Viollet le Duc, 11000 Carcassonne",
    latitude: 43.206,
    longitude: 2.364
  },
  {
    id: "demo-narbonne",
    label: "Narbonne",
    address: "11100 Narbonne",
    latitude: 43.184,
    longitude: 3.003
  }
];

export default function NewHighlightScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useSession();
  const { members, createPost, refreshExperience } = useExperience();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)),
    [accessToken]
  );
  const [kind, setKind] = useState<HighlightKind>("standard");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<HighlightMedia | undefined>();
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<HighlightLocation | null>(null);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [locating, setLocating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const mentionQuery = useMemo(() => {
    const match = body.match(/(?:^|\s)@([^\s@]*)$/u);
    return match?.[1]?.toLocaleLowerCase("fr") ?? null;
  }, [body]);
  const suggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    return members
      .filter((member) =>
        [member.name, member.company]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(mentionQuery)
      )
      .slice(0, 5);
  }, [members, mentionQuery]);
  const mentionedUserIds = useMemo(
    () =>
      members
        .filter((member) => {
          const text = body.toLocaleLowerCase("fr");
          const firstName =
            member.name.split(" ")[0]?.toLocaleLowerCase("fr") ?? "";
          return (
            (firstName && text.includes(`@${firstName}`)) ||
            text.includes(`@${member.name.toLocaleLowerCase("fr")}`) ||
            (member.company &&
              text.includes(`@${member.company.toLocaleLowerCase("fr")}`))
          );
        })
        .map((member) => member.id),
    [body, members]
  );

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 3 || selectedLocation?.label === query) {
      setPlaceSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearchingPlace(true);
      const operation = api
        ? api.searchPlaces(query)
        : Promise.resolve(
            DEMO_PLACES.filter((place) =>
              `${place.label} ${place.address ?? ""}`
                .toLocaleLowerCase("fr")
                .includes(query.toLocaleLowerCase("fr"))
            )
          );
      void operation
        .then((items) => {
          if (!cancelled) setPlaceSuggestions(items.slice(0, 6));
        })
        .catch(() => {
          if (!cancelled) setPlaceSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setSearchingPlace(false);
        });
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, locationQuery, selectedLocation?.label]);

  const insertMention = (name: string) => {
    setBody((current) =>
      current.replace(/@[^\s@]*$/u, `@${name.split(" ")[0]} `)
    );
  };

  const selectMedia = async (mediaKind: "photo" | "video") => {
    try {
      const selected = await pickHighlightMedia(mediaKind);
      if (selected) setMedia(selected);
    } catch (error) {
      Alert.alert(
        "Média indisponible",
        error instanceof Error
          ? error.message
          : "Le média n’a pas pu être sélectionné."
      );
    }
  };

  const useRecordedVoice = (attachment: MessageAttachment) => {
    setMedia({
      id: attachment.id,
      kind: "audio",
      uri: attachment.uri,
      name: attachment.name,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      durationSeconds: attachment.durationSeconds,
      uploadProgress: attachment.uploadProgress,
      status: attachment.status,
      transcript: attachment.transcript,
      transcriptStatus: attachment.transcriptStatus
    });
  };

  const choosePlace = (place: PlaceSuggestion) => {
    setSelectedLocation({
      label: place.label,
      placeId: place.id,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      accuracyRadiusMeters: 100
    });
    setLocationQuery(place.label);
    setPlaceSuggestions([]);
  };

  const useCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const coordinates = await pickApproximateLocation();
      const location: HighlightLocation = {
        label: "Ma position approximative",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracyRadiusMeters: coordinates.accuracyRadiusMeters
      };
      setSelectedLocation(location);
      setLocationQuery(location.label);
    } catch (error) {
      Alert.alert(
        "Localisation impossible",
        error instanceof Error
          ? error.message
          : "La position n’a pas pu être obtenue."
      );
    } finally {
      setLocating(false);
    }
  };

  const publish = async () => {
    if (publishing) return;
    const cleanBody = body.trim();
    if (!cleanBody && !media) {
      Alert.alert(
        "Publication vide",
        "Ajoutez un texte, une photo, une vidéo ou un message vocal."
      );
      return;
    }
    if (media?.kind === "video" && (media.durationSeconds ?? 0) > 60) {
      Alert.alert("Vidéo trop longue", "La durée maximale est de 60 secondes.");
      return;
    }

    setPublishing(true);
    try {
      let readyMedia = media;
      if (readyMedia && api && readyMedia.status !== "ready") {
        setMedia((current) =>
          current
            ? { ...current, status: "uploading", uploadProgress: 0 }
            : current
        );
        readyMedia = await uploadHighlightMedia(
          readyMedia,
          accessToken,
          (progress) =>
            setMedia((current) =>
              current
                ? { ...current, status: "uploading", uploadProgress: progress }
                : current
            )
        );
      }

      const coordinates = selectedLocation
        ? {
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
            accuracyRadiusMeters: selectedLocation.accuracyRadiusMeters
          }
        : undefined;

      const post = api
        ? await api.createHighlight({
            kind,
            body: cleanBody,
            media: readyMedia,
            mentionedUserIds,
            coordinates,
            location: selectedLocation ?? undefined
          })
        : createPost({
            kind,
            body: cleanBody,
            media: readyMedia
              ? { ...readyMedia, status: "ready", uploadProgress: 1 }
              : undefined,
            mentionedUserIds,
            coordinates
          });

      if (api) await refreshExperience();
      router.replace({
        pathname: "/(tabs)/highlights",
        params: { published: post.id }
      });
    } catch (error) {
      setMedia((current) =>
        current ? { ...current, status: "failed" } : current
      );
      Alert.alert(
        "Publication impossible",
        error instanceof Error
          ? error.message
          : "Le Temps fort n’a pas pu être publié."
      );
    } finally {
      setPublishing(false);
    }
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, spacing.sm),
            paddingLeft: spacing.sm + insets.left,
            paddingRight: spacing.sm + insets.right
          }
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="close" size={25} color={colors.text} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.headerTitle}>
          Nouveau Temps fort
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Publier"
          accessibilityState={{ busy: publishing, disabled: publishing }}
          disabled={publishing}
          onPress={() => void publish()}
          style={styles.publishButton}
        >
          {publishing ? (
            <ActivityIndicator size="small" color={colors.orange} />
          ) : (
            <Text style={styles.publishText}>Publier</Text>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingLeft: spacing.md + insets.left,
            paddingRight: spacing.md + insets.right,
            paddingBottom: Math.max(insets.bottom, spacing.xl)
          }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Type de publication</Text>
        <View style={styles.kindGrid}>
          {KINDS.map((item) => {
            const selected = kind === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setKind(item.value)}
                style={[
                  styles.kindButton,
                  selected && styles.kindButtonSelected
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={selected ? colors.orange : colors.textMuted}
                />
                <Text
                  style={[
                    styles.kindLabel,
                    selected && styles.kindLabelSelected
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {kind === "besoin" || kind === "offre" ? (
          <View style={styles.syncNote}>
            <Ionicons name="sync" size={19} color={colors.success} />
            <Text style={styles.syncNoteText}>
              {kind === "besoin"
                ? "Ce Besoin sera synchronisé avec Neptune Business dans les deux sens."
                : "Cette Offre sera publiée dans le Comité Avantage. Un avantage créé sur Neptune Business générera également un Temps fort Offre."}
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Contenu</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Partagez un moment, une offre ou un besoin… Utilisez @ pour mentionner."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2_000}
          style={styles.editor}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{body.length}/2 000</Text>

        {suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            {suggestions.map((member) => (
              <Pressable
                key={member.id}
                onPress={() => insertMention(member.name)}
                style={styles.suggestionRow}
              >
                <View style={styles.suggestionAvatar}>
                  <Text style={styles.suggestionInitials}>{member.initials}</Text>
                </View>
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionName}>{member.name}</Text>
                  <Text style={styles.suggestionCompany} numberOfLines={1}>
                    {member.company}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.mediaActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajouter une photo"
            onPress={() => void selectMedia("photo")}
            style={styles.mediaButton}
          >
            <Ionicons name="image-outline" size={21} color={colors.text} />
            <Text style={styles.mediaLabel}>Photo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajouter une vidéo de soixante secondes maximum"
            onPress={() => void selectMedia("video")}
            style={styles.mediaButton}
          >
            <Ionicons name="videocam-outline" size={22} color={colors.text} />
            <Text style={styles.mediaLabel}>Vidéo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enregistrer un Temps fort vocal"
            onPress={() => setVoiceRecorderOpen(true)}
            style={styles.mediaButton}
          >
            <Ionicons name="mic-outline" size={22} color={colors.text} />
            <Text style={styles.mediaLabel}>Vocal</Text>
          </Pressable>
        </View>
        <Text style={styles.mediaHint}>
          Vidéo : 60 secondes maximum · Vocal : 5 minutes maximum.
        </Text>

        {media ? (
          <View style={styles.mediaPreview}>
            <HighlightMediaView media={media} />
            <View style={styles.mediaPreviewTop}>
              <Text style={styles.mediaPreviewLabel}>
                {media.status === "uploading"
                  ? `Envoi · ${Math.round((media.uploadProgress ?? 0) * 100)} %`
                  : media.kind === "video"
                    ? `Vidéo · ${Math.round(media.durationSeconds ?? 0)} secondes`
                    : media.kind === "audio"
                      ? `Vocal · ${Math.round(media.durationSeconds ?? 0)} secondes`
                      : "Photo"}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retirer le média"
                disabled={publishing}
                onPress={() => setMedia(undefined)}
                style={styles.removeMedia}
              >
                <Ionicons name="close" size={20} color={colors.white} />
              </Pressable>
            </View>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Lieu du Temps fort</Text>
        <View style={styles.locationSearch}>
          <Ionicons name="search-outline" size={19} color={colors.textMuted} />
          <TextInput
            value={locationQuery}
            onChangeText={(value) => {
              setLocationQuery(value);
              if (value !== selectedLocation?.label) setSelectedLocation(null);
            }}
            placeholder="Ex. Téléski nautique de Bram"
            placeholderTextColor={colors.textMuted}
            style={styles.locationInput}
          />
          {searchingPlace ? (
            <ActivityIndicator size="small" color={colors.violet} />
          ) : null}
        </View>

        {placeSuggestions.length > 0 ? (
          <View style={styles.placeSuggestions}>
            {placeSuggestions.map((place) => (
              <Pressable
                key={place.id}
                accessibilityRole="button"
                onPress={() => choosePlace(place)}
                style={styles.placeRow}
              >
                <Ionicons
                  name="location-outline"
                  size={19}
                  color={colors.orange}
                />
                <View style={styles.placeContent}>
                  <Text style={styles.placeLabel}>{place.label}</Text>
                  {place.address ? (
                    <Text style={styles.placeAddress} numberOfLines={1}>
                      {place.address}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: locating }}
          disabled={locating}
          onPress={() => void useCurrentLocation()}
          style={styles.currentLocationButton}
        >
          <Ionicons name="locate-outline" size={20} color={colors.text} />
          <Text style={styles.currentLocationText}>
            {locating
              ? "Localisation…"
              : "Utiliser ma position approximative"}
          </Text>
        </Pressable>

        {selectedLocation ? (
          <View style={styles.selectedLocation}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <View style={styles.selectedLocationText}>
              <Text style={styles.selectedLocationTitle}>
                {selectedLocation.label}
              </Text>
              {selectedLocation.address ? (
                <Text style={styles.selectedLocationAddress}>
                  {selectedLocation.address}
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retirer le lieu"
              onPress={() => {
                setSelectedLocation(null);
                setLocationQuery("");
              }}
              style={styles.removeLocation}
            >
              <Ionicons name="close" size={19} color={colors.textMuted} />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <VoiceRecorderModal
        visible={voiceRecorderOpen}
        onClose={() => setVoiceRecorderOpen(false)}
        onRecorded={useRecordedVoice}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    minHeight: 58,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center"
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    ...typography.heading3,
    color: colors.text,
    flex: 1,
    textAlign: "center"
  },
  publishButton: {
    minWidth: 68,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  publishText: { color: colors.orange, fontSize: 12, fontWeight: "900" },
  content: { width: "100%", maxWidth: 680, alignSelf: "center" },
  sectionTitle: {
    ...typography.heading3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: 8
  },
  kindGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kindButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  kindButtonSelected: {
    borderColor: colors.violet,
    backgroundColor: "rgba(107,79,234,0.22)"
  },
  kindLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800" },
  kindLabelSelected: { color: colors.text },
  syncNote: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.successSoft,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9
  },
  syncNoteText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1
  },
  editor: {
    minHeight: 168,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    color: colors.text,
    ...typography.body
  },
  counter: {
    color: colors.textMuted,
    fontSize: 9,
    textAlign: "right",
    marginTop: 4
  },
  suggestions: {
    marginTop: 7,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    overflow: "hidden"
  },
  suggestionRow: {
    minHeight: 52,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  suggestionAvatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  suggestionInitials: { color: colors.text, fontSize: 9, fontWeight: "900" },
  suggestionContent: { flex: 1, minWidth: 0 },
  suggestionName: { color: colors.text, fontSize: 11, fontWeight: "900" },
  suggestionCompany: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  mediaActions: { marginTop: 9, flexDirection: "row", gap: 8 },
  mediaButton: {
    flex: 1,
    minWidth: 72,
    minHeight: 52,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  mediaLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: "900" },
  mediaHint: {
    color: colors.textMuted,
    fontSize: 8.5,
    lineHeight: 13,
    textAlign: "center",
    marginTop: 6
  },
  mediaPreview: {
    marginTop: 10,
    borderRadius: 22,
    overflow: "hidden",
    position: "relative"
  },
  mediaPreviewTop: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  mediaPreviewLabel: {
    color: colors.white,
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(2,7,19,0.75)"
  },
  removeMedia: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "rgba(2,7,19,0.75)",
    alignItems: "center",
    justifyContent: "center"
  },
  locationSearch: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  locationInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    color: colors.text,
    ...typography.bodySmall
  },
  placeSuggestions: {
    marginTop: 7,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    overflow: "hidden"
  },
  placeRow: {
    minHeight: 58,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft
  },
  placeContent: { flex: 1, minWidth: 0 },
  placeLabel: { color: colors.text, fontSize: 11, fontWeight: "900" },
  placeAddress: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  currentLocationButton: {
    minHeight: 50,
    marginTop: 8,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  currentLocationText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "900"
  },
  selectedLocation: {
    minHeight: 60,
    marginTop: 8,
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor: colors.successSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  selectedLocationText: { flex: 1, minWidth: 0 },
  selectedLocationTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "900"
  },
  selectedLocationAddress: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 2
  },
  removeLocation: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  }
});
