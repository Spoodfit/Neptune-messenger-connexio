import { Text } from "@/components/LocalizedText";
import {
  Ionicons } from "@expo/vector-icons";
import { VideoView,
  useVideoPlayer } from "expo-video";
import { useMemo,
  useState } from "react";
import { Image,
  Linking,
  Pressable,
  StyleSheet,
  View
} from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import { AppAlert } from "../services/ui/AppAlert";
import { colors } from "../theme";
import type { HighlightMedia } from "../types/experience";

interface HighlightMediaViewProps { media: HighlightMedia; compact?: boolean; }

function formatDuration(durationSeconds?: number): string {
  const total = Math.max(0, Math.round(durationSeconds ?? 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

async function openMedia(uri?: string): Promise<void> {
  if (!uri) { AppAlert.alert("Contenu indisponible", "Ce média n’est plus accessible."); return; }
  const supported = await Linking.canOpenURL(uri);
  if (!supported) { AppAlert.alert("Ouverture impossible", "Aucune application ne peut lire ce média."); return; }
  await Linking.openURL(uri);
}

function VideoMedia({ media, compact }: HighlightMediaViewProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const player = useVideoPlayer(media.uri ?? null, (instance) => { instance.loop = false; });
  if (!media.uri) return <View style={[styles.missing, compact && styles.compact]}><Text style={styles.missingText}>Vidéo indisponible</Text></View>;
  return <VideoView player={player} nativeControls contentFit="cover" playsInline style={[styles.media, compact && styles.compact]} />;
}

function AudioMedia({ media, compact = false }: HighlightMediaViewProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const waveform = [8, 14, 23, 11, 19, 27, 9, 17, 25, 12, 21, 15, 28, 10, 18, 24, 13];
  const transcriptReady = Boolean(media.transcript?.trim());

  return (
    <View style={[styles.audioCard, compact && styles.audioCompact]}>
      <View style={styles.audioMain}>
        <Pressable accessibilityRole="button" accessibilityLabel="Lire le Temps fort vocal" onPress={() => void openMedia(media.uri)} style={styles.audioPlay}><Ionicons name="play" size={22} color={colors.white} /></Pressable>
        <View style={styles.audioContent}>
          <Text style={styles.audioTitle}>Temps fort vocal</Text>
          <View style={styles.waveform} accessibilityElementsHidden>{waveform.map((height, index) => <View key={`${media.id}-highlight-wave-${index}`} style={[styles.waveBar, { height: compact ? Math.min(height, 20) : height }]} />)}</View>
          <Text style={styles.audioMeta}>{media.status === "uploading" ? `Envoi · ${Math.round((media.uploadProgress ?? 0) * 100)} %` : formatDuration(media.durationSeconds)}</Text>
        </View>
      </View>
      {media.transcriptStatus === "pending" ? <View style={styles.transcriptPending}><Ionicons name="sparkles-outline" size={15} color={theme.orange} /><Text style={styles.transcriptPendingText}>Transcription en cours…</Text></View> : transcriptReady ? <><Pressable accessibilityRole="button" accessibilityLabel={transcriptVisible ? "Masquer la transcription du vocal" : "Afficher la transcription du vocal"} accessibilityState={{ expanded: transcriptVisible }} onPress={() => setTranscriptVisible((current) => !current)} style={styles.transcriptToggle}><Ionicons name="document-text-outline" size={16} color={theme.orange} /><Text style={styles.transcriptToggleText}>{transcriptVisible ? "Masquer la transcription" : "Afficher la transcription"}</Text><Ionicons name={transcriptVisible ? "chevron-up" : "chevron-down"} size={16} color={theme.pageTextMuted} /></Pressable>{transcriptVisible ? <Text selectable style={styles.transcript}>{media.transcript}</Text> : null}</> : null}
    </View>
  );
}

export function HighlightMediaView({ media, compact = false }: HighlightMediaViewProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (media.kind === "video") return <VideoMedia media={media} compact={compact} />;
  if (media.kind === "audio") return <AudioMedia media={media} compact={compact} />;
  if (!media.uri) return <View style={[styles.missing, compact && styles.compact]}><Text style={styles.missingText}>Photo indisponible</Text></View>;
  return <Pressable accessibilityRole="imagebutton" accessibilityLabel="Ouvrir la photo" onPress={() => void openMedia(media.uri)}><Image source={{ uri: media.uri }} resizeMode="cover" style={[styles.media, compact && styles.compact]} /></Pressable>;
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  media: { width: "100%", height: 220, borderRadius: 17, backgroundColor: theme.surfaceStrong, overflow: "hidden" },
  compact: { height: 150 },
  missing: { width: "100%", height: 220, borderRadius: 17, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong, alignItems: "center", justifyContent: "center" },
  missingText: { color: theme.pageTextMuted, fontSize: 11, fontWeight: "800" },
  audioCard: { width: "100%", minHeight: 176, padding: 14, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.isLight ? theme.surface : theme.surfaceStrong, justifyContent: "center" },
  audioCompact: { minHeight: 142, padding: 11 },
  audioMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  audioPlay: { width: 52, height: 52, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  audioContent: { flex: 1, minWidth: 0 },
  audioTitle: { color: theme.pageText, fontSize: 14, fontWeight: "900" },
  waveform: { height: 32, marginTop: 6, flexDirection: "row", alignItems: "center", gap: 3, overflow: "hidden" },
  waveBar: { width: 3, borderRadius: 2, backgroundColor: theme.orange },
  audioMeta: { color: theme.pageTextMuted, fontSize: 11, marginTop: 3, fontWeight: "800" },
  transcriptPending: { minHeight: 42, marginTop: 10, borderTopWidth: 1, borderTopColor: theme.borderSoft, flexDirection: "row", alignItems: "center", gap: 8 },
  transcriptPendingText: { color: theme.pageTextMuted, fontSize: 11, fontWeight: "800" },
  transcriptToggle: { minHeight: 48, marginTop: 8, borderTopWidth: 1, borderTopColor: theme.borderSoft, flexDirection: "row", alignItems: "center", gap: 8 },
  transcriptToggleText: { flex: 1, color: theme.pageTextSecondary, fontSize: 11, fontWeight: "900" },
  transcript: { padding: 10, borderRadius: 13, borderWidth: 1, borderColor: theme.borderSoft, backgroundColor: theme.surfaceStrong, color: theme.pageTextSecondary, fontSize: 11, lineHeight: 17 }
});
