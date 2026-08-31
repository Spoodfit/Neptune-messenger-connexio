import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type TextStyle,
  type ViewStyle
} from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import { colors } from "../theme";
import type { MessageAttachment } from "../types/messaging";

interface VoiceMessagePlayerProps {
  attachment: MessageAttachment;
  isMine: boolean;
}

const BAR_HEIGHTS = [
  12, 21, 15, 28, 18, 32, 23, 14, 27, 19, 34, 25, 16, 29,
  20, 31, 17, 24, 14, 27, 19, 32, 22, 16, 28, 20, 25, 14
];

function formatSeconds(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function VoiceMessagePlayer({ attachment, isMine }: VoiceMessagePlayerProps) {
  const theme = useAppTheme();
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [waveWidth, setWaveWidth] = useState(1);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const source = attachment.downloadUrl ?? attachment.uri ?? null;
  const player = useAudioPlayer(source, { updateInterval: 120 });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration > 0
    ? status.duration
    : Math.max(0, attachment.durationSeconds ?? 0);
  const progress = duration > 0
    ? Math.min(1, Math.max(0, status.currentTime / duration))
    : 0;
  const transcript = attachment.transcript?.trim();
  const transcriptPending = attachment.transcriptStatus === "pending" && !transcript;
  const transcriptFailed = attachment.transcriptStatus === "failed" && !transcript;
  const foreground = isMine ? colors.white : theme.pageText;
  const muted = isMine ? "rgba(255,255,255,0.72)" : theme.pageTextMuted;
  const track = isMine ? "rgba(255,255,255,0.23)" : theme.surfaceMuted;
  const active = isMine ? colors.white : theme.violet;
  const wave = useMemo(() => BAR_HEIGHTS, []);

  const togglePlayback = () => {
    if (!source) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (duration > 0 && status.currentTime >= duration - 0.15) {
      void player.seekTo(0);
    }
    player.setPlaybackRate(playbackRate);
    player.play();
  };

  const cyclePlaybackRate = () => {
    const next = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    setPlaybackRate(next);
    player.setPlaybackRate(next);
  };

  const onWaveLayout = (event: LayoutChangeEvent) => {
    setWaveWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  const seek = (event: GestureResponderEvent) => {
    if (!source || duration <= 0) return;
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / waveWidth));
    void player.seekTo(duration * ratio);
  };

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: isMine ? "rgba(255,255,255,0.10)" : theme.surfaceStrong,
          borderColor: isMine ? "rgba(255,255,255,0.17)" : theme.borderSoft
        }
      ]}
    >
      <View style={styles.playerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? "Mettre le vocal en pause" : "Lire le message vocal"}
          onPress={togglePlayback}
          disabled={!source}
          style={[
            styles.playButton,
            { backgroundColor: isMine ? "rgba(255,255,255,0.18)" : theme.violetSoft },
            !source && styles.disabled
          ]}
        >
          <Ionicons
            name={status.playing ? "pause" : "play"}
            size={20}
            color={isMine ? colors.white : theme.violet}
          />
        </Pressable>

        <View style={styles.waveColumn}>
          <Pressable
            accessibilityRole="adjustable"
            accessibilityLabel="Progression du message vocal"
            onLayout={onWaveLayout}
            onPress={seek}
            style={styles.waveform}
          >
            {wave.map((height, index) => {
              const barProgress = (index + 1) / wave.length;
              return (
                <View
                  key={`${attachment.id}-wave-${index}`}
                  style={[
                    styles.waveBar,
                    {
                      height,
                      backgroundColor: barProgress <= progress ? active : track
                    }
                  ]}
                />
              );
            })}
          </Pressable>
          <View style={styles.timeRow}>
            <Text style={[styles.time, { color: muted }]}>{formatSeconds(status.currentTime)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Vitesse de lecture ${String(playbackRate).replace(".", ",")} fois`}
              hitSlop={9}
              onPress={cyclePlaybackRate}
              style={[
                styles.speedButton,
                { borderColor: isMine ? "rgba(255,255,255,0.22)" : theme.borderSoft }
              ]}
            >
              <Text style={[styles.speedText, { color: foreground }]}>{String(playbackRate).replace(".", ",")}×</Text>
            </Pressable>
            <View style={styles.voiceMeta}>
              <Ionicons name="mic-outline" size={12} color={muted} />
              <Text style={[styles.time, { color: muted }]}>{formatSeconds(duration)}</Text>
            </View>
          </View>
        </View>
      </View>

      {transcript ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={transcriptExpanded ? "Réduire la transcription" : "Lire toute la transcription"}
          onPress={() => setTranscriptExpanded((current) => !current)}
          style={[
            styles.transcript,
            { borderTopColor: isMine ? "rgba(255,255,255,0.14)" : theme.borderSoft }
          ]}
        >
          <View style={styles.transcriptHeading}>
            <Ionicons name="text-outline" size={14} color={muted} />
            <Text style={[styles.transcriptLabel, { color: muted }]}>Transcription</Text>
          </View>
          <Text
            numberOfLines={transcriptExpanded ? undefined : 3}
            style={[styles.transcriptText, { color: foreground }]}
          >
            {transcript}
          </Text>
          {transcript.length > 130 ? (
            <Text style={[styles.expandText, { color: isMine ? colors.white : theme.violet }]}>
              {transcriptExpanded ? "Réduire" : "Voir tout"}
            </Text>
          ) : null}
        </Pressable>
      ) : transcriptPending ? (
        <View
          style={[
            styles.transcriptState,
            { borderTopColor: isMine ? "rgba(255,255,255,0.14)" : theme.borderSoft }
          ]}
        >
          <Ionicons name="sparkles-outline" size={14} color={muted} />
          <Text style={[styles.transcriptStateText, { color: muted }]}>Transcription en cours…</Text>
        </View>
      ) : transcriptFailed ? (
        <View
          style={[
            styles.transcriptState,
            { borderTopColor: isMine ? "rgba(255,255,255,0.14)" : theme.borderSoft }
          ]}
        >
          <Ionicons name="text-outline" size={14} color={muted} />
          <Text style={[styles.transcriptStateText, { color: muted }]}>Transcription indisponible</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 286,
    maxWidth: "100%",
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    padding: 9,
    gap: 6
  } satisfies ViewStyle,
  playerRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 9 } satisfies ViewStyle,
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  } satisfies ViewStyle,
  disabled: { opacity: 0.42 } satisfies ViewStyle,
  waveColumn: { flex: 1, minWidth: 0 } satisfies ViewStyle,
  waveform: { height: 36, flexDirection: "row", alignItems: "center", gap: 2 } satisfies ViewStyle,
  waveBar: { flex: 1, minWidth: 2, maxWidth: 4, borderRadius: 3 } satisfies ViewStyle,
  timeRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  } satisfies ViewStyle,
  voiceMeta: { flexDirection: "row", alignItems: "center", gap: 3 } satisfies ViewStyle,
  time: { fontSize: 10, lineHeight: 13, fontWeight: "800" } satisfies TextStyle,
  speedButton: {
    minWidth: 38,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  } satisfies ViewStyle,
  speedText: { fontSize: 10, lineHeight: 13, fontWeight: "900" } satisfies TextStyle,
  transcript: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, gap: 4 } satisfies ViewStyle,
  transcriptHeading: { flexDirection: "row", alignItems: "center", gap: 5 } satisfies ViewStyle,
  transcriptLabel: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.45
  } satisfies TextStyle,
  transcriptText: { fontSize: 12, lineHeight: 17, fontWeight: "600" } satisfies TextStyle,
  expandText: { fontSize: 11, lineHeight: 14, fontWeight: "900", marginTop: 2 } satisfies TextStyle,
  transcriptState: {
    minHeight: 34,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  } satisfies ViewStyle,
  transcriptStateText: { fontSize: 11, fontWeight: "700" } satisfies TextStyle
});
