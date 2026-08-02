import { VideoView, useVideoPlayer } from "expo-video";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme";
import type { HighlightMedia } from "../types/experience";

interface HighlightMediaViewProps {
  media: HighlightMedia;
  compact?: boolean;
}

function VideoMedia({ media, compact }: HighlightMediaViewProps) {
  const player = useVideoPlayer(media.uri ?? null, (instance) => {
    instance.loop = false;
  });

  if (!media.uri) {
    return (
      <View style={[styles.missing, compact && styles.compact]}>
        <Text style={styles.missingText}>Vidéo indisponible</Text>
      </View>
    );
  }

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="cover"
      playsInline
      style={[styles.media, compact && styles.compact]}
    />
  );
}

export function HighlightMediaView({
  media,
  compact = false
}: HighlightMediaViewProps) {
  if (media.kind === "video") {
    return <VideoMedia media={media} compact={compact} />;
  }
  if (!media.uri) {
    return (
      <View style={[styles.missing, compact && styles.compact]}>
        <Text style={styles.missingText}>Photo indisponible</Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel="Ouvrir la photo"
      onPress={() => void Linking.openURL(media.uri!)}
    >
      <Image
        source={{ uri: media.uri }}
        resizeMode="cover"
        style={[styles.media, compact && styles.compact]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  media: {
    width: "100%",
    height: 220,
    borderRadius: 17,
    backgroundColor: colors.surfaceStrong,
    overflow: "hidden"
  },
  compact: { height: 150 },
  missing: {
    width: "100%",
    height: 220,
    borderRadius: 17,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  missingText: { color: colors.textMuted, fontSize: 11, fontWeight: "800" }
});
