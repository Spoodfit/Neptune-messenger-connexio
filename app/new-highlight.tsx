import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HighlightMediaView } from "@/components/HighlightMediaView";
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
  HighlightMedia,
  HighlightPost
} from "@/types/experience";

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

export default function NewHighlightScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken } = useSession();
  const { members, createPost } = useExperience();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)),
    [accessToken]
  );
  const [kind, setKind] = useState<HighlightKind>("standard");
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<HighlightMedia | undefined>();
  const [locationEnabled, setLocationEnabled] = useState(false);
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

  const publish = async () => {
    if (publishing) return;
    const cleanBody = body.trim();
    if (!cleanBody && !media) {
      Alert.alert("Publication vide", "Ajoutez un texte, une photo ou une vidéo.");
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
          current ? { ...current, status: "uploading", uploadProgress: 0 } : current
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
        setMedia(readyMedia);
      }

      let coordinates: HighlightPost["coordinates"];
      if (locationEnabled) {
        coordinates = await pickApproximateLocation();
        if (api) {
          await api.updateLocation(
            coordinates.latitude,
            coordinates.longitude,
            coordinates.accuracyRadiusMeters
          );
        }
      }

      const post = api
        ? await api.createHighlight({
            kind,
            body: cleanBody,
            media: readyMedia,
            mentionedUserIds,
            coordinates
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

      router.replace(`/highlight/${encodeURIComponent(post.id)}`);
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
                style={[styles.kindButton, selected && styles.kindButtonSelected]}
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

        {kind === "besoin" ? (
          <View style={styles.syncNote}>
            <Ionicons name="sync" size={19} color={colors.success} />
            <Text style={styles.syncNoteText}>
              Cette publication sera créée avec les cibles Connexio et Neptune
              Business. Le serveur applique l’idempotence et la synchronisation
              bidirectionnelle.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Contenu</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Partagez une réussite, un besoin ou les coulisses de votre activité… Utilisez @ pour mentionner."
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
            onPress={() => void selectMedia("photo")}
            style={styles.mediaButton}
          >
            <Ionicons name="image-outline" size={21} color={colors.text} />
            <Text style={styles.mediaLabel}>Photo</Text>
          </Pressable>
          <Pressable
            onPress={() => void selectMedia("video")}
            style={styles.mediaButton}
          >
            <Ionicons name="videocam-outline" size={22} color={colors.text} />
            <Text style={styles.mediaLabel}>Vidéo − 1 min</Text>
          </Pressable>
        </View>

        {media ? (
          <View style={styles.mediaPreview}>
            <HighlightMediaView media={media} />
            <View style={styles.mediaPreviewTop}>
              <Text style={styles.mediaPreviewLabel}>
                {media.status === "uploading"
                  ? `Envoi · ${Math.round((media.uploadProgress ?? 0) * 100)} %`
                  : media.kind === "video"
                    ? `Vidéo · ${Math.round(media.durationSeconds ?? 0)} secondes`
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

        <View style={styles.locationRow}>
          <View style={styles.locationContent}>
            <Text style={styles.locationTitle}>Position approximative sur la Map</Text>
            <Text style={styles.locationSubtitle}>
              La position est obtenue au moment de publier et protégée par un rayon
              de confidentialité compris entre 1 et 3 km.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Activer la position approximative"
            style={styles.switchControl}
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </ScrollView>
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
  syncNoteText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
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
  suggestionInitials: { color: colors.text, fontSize: 10, fontWeight: "900" },
  suggestionContent: { flex: 1, minWidth: 0 },
  suggestionName: { color: colors.text, fontSize: 12, fontWeight: "900" },
  suggestionCompany: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  mediaActions: { flexDirection: "row", gap: 8, marginTop: spacing.md },
  mediaButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7
  },
  mediaLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: "800" },
  mediaPreview: {
    marginTop: 10,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative"
  },
  mediaPreviewTop: {
    position: "absolute",
    top: 9,
    left: 9,
    right: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  mediaPreviewLabel: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(2,7,19,0.72)"
  },
  removeMedia: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(2,7,19,0.72)",
    alignItems: "center",
    justifyContent: "center"
  },
  locationRow: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  locationContent: { flex: 1, minWidth: 0 },
  switchControl: { width: 48, height: 44 },
  locationTitle: { color: colors.text, fontSize: 13, fontWeight: "900" },
  locationSubtitle: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3
  }
});
