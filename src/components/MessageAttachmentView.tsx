import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { AppAlert } from "@/services/ui/AppAlert";

import { colors } from "../theme";
import type { MessageAttachment } from "../types/messaging";
import { HighlightMediaView } from "./HighlightMediaView";
import InAppAttachmentViewer from "./InAppAttachmentViewer";

interface MessageAttachmentViewProps {
  attachment: MessageAttachment;
  isMine: boolean;
}

const attachmentIcon = (kind: MessageAttachment["kind"]) => {
  switch (kind) {
    case "photo": return "image-outline" as const;
    case "video": return "videocam-outline" as const;
    case "audio": return "mic-outline" as const;
    case "location": return "location-outline" as const;
    case "contact": return "person-outline" as const;
    default: return "document-attach-outline" as const;
  }
};

function resolveUri(attachment: MessageAttachment): string | undefined {
  return attachment.downloadUrl ?? attachment.uri;
}

function locationUrl(attachment: MessageAttachment): string | undefined {
  if (typeof attachment.latitude === "number" && typeof attachment.longitude === "number") {
    const coordinates = `${attachment.latitude},${attachment.longitude}`;
    return Platform.select({
      ios: `https://maps.apple.com/?ll=${coordinates}`,
      android: `geo:${coordinates}?q=${coordinates}`,
      default: `https://www.openstreetmap.org/?mlat=${attachment.latitude}&mlon=${attachment.longitude}#map=15/${attachment.latitude}/${attachment.longitude}`
    });
  }
  return resolveUri(attachment);
}

function formatDuration(durationSeconds?: number): string {
  const total = Math.max(0, Math.round(durationSeconds ?? 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

async function openExternal(attachment: MessageAttachment): Promise<void> {
  const uri = attachment.kind === "location" ? locationUrl(attachment) : resolveUri(attachment);
  if (!uri) {
    AppAlert.alert("Contenu indisponible", "Ce fichier n’est plus accessible.");
    return;
  }
  const supported = await Linking.canOpenURL(uri);
  if (!supported) {
    AppAlert.alert("Ouverture impossible", "Aucune application ne peut ouvrir ce contenu.");
    return;
  }
  await Linking.openURL(uri);
}

function VoiceAttachment({ attachment, isMine }: MessageAttachmentViewProps) {
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const sourceUri = resolveUri(attachment) ?? null;
  const player = useAudioPlayer(sourceUri, { updateInterval: 180 });
  const playerStatus = useAudioPlayerStatus(player);
  const transcriptReady = Boolean(attachment.transcript?.trim());
  const waveform = [7, 13, 19, 10, 23, 15, 8, 18, 25, 12, 20, 9, 16, 22, 11, 17, 7];

  const togglePlayback = () => {
    if (!sourceUri) {
      AppAlert.alert("Vocal indisponible", "Ce message vocal n’est plus accessible.");
      return;
    }
    if (playerStatus.playing) {
      player.pause();
      return;
    }
    if (playerStatus.didJustFinish || (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration)) {
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

  return (
    <View
      accessible
      accessibilityLabel={`Message vocal de ${formatDuration(attachment.durationSeconds)}${transcriptReady ? ". Transcription disponible." : ""}`}
      style={[styles.voiceCard, isMine ? styles.voiceMine : styles.voiceOther]}
    >
      <View style={styles.voiceMain}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playerStatus.playing ? "Mettre le vocal en pause" : "Lire le message vocal"}
          onPress={togglePlayback}
          style={[styles.voicePlay, isMine ? styles.voicePlayMine : styles.voicePlayOther]}
        >
          <Ionicons name={playerStatus.playing ? "pause" : "play"} size={19} color={isMine ? colors.primary : colors.white} />
        </Pressable>
        <View style={styles.voiceContent}>
          <View style={styles.waveform} accessibilityElementsHidden>
            {waveform.map((height, index) => (
              <View
                key={`${attachment.id}-wave-${index}`}
                style={[styles.waveBar, { height }, isMine ? styles.waveBarMine : styles.waveBarOther]}
              />
            ))}
          </View>
          <View style={styles.voiceMetaRow}>
            <Text style={[styles.voiceDuration, isMine ? styles.mineMeta : styles.otherMeta]}>
              {attachment.status === "uploading"
                ? `${Math.round((attachment.uploadProgress ?? 0) * 100)} %`
                : playerStatus.playing
                  ? `${formatDuration(playerStatus.currentTime)} / ${formatDuration(playerStatus.duration || attachment.durationSeconds)}`
                  : formatDuration(attachment.durationSeconds)}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Vitesse de lecture ${playbackRate} fois`} onPress={cyclePlaybackRate} style={styles.speedButton}>
              <Text style={[styles.speedText, isMine ? styles.mineText : styles.otherText]}>{playbackRate}×</Text>
            </Pressable>
            <Text numberOfLines={1} style={[styles.voiceName, isMine ? styles.mineMeta : styles.otherMeta]}>Vocal Neptune</Text>
          </View>
        </View>
      </View>

      {attachment.transcriptStatus === "pending" ? (
        <View style={styles.transcriptPending}>
          <Ionicons name="sparkles-outline" size={14} color={isMine ? colors.whiteMuted : colors.orange} />
          <Text style={[styles.transcriptPendingText, isMine ? styles.mineMeta : styles.otherMeta]}>Transcription en cours…</Text>
        </View>
      ) : transcriptReady ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={transcriptVisible ? "Masquer la transcription" : "Afficher la transcription"}
            accessibilityState={{ expanded: transcriptVisible }}
            onPress={() => setTranscriptVisible((current) => !current)}
            style={styles.transcriptToggle}
          >
            <Ionicons name="document-text-outline" size={15} color={isMine ? colors.white : colors.orange} />
            <Text style={[styles.transcriptToggleText, isMine ? styles.mineText : styles.otherText]}>
              {transcriptVisible ? "Masquer la transcription" : "Afficher la transcription"}
            </Text>
            <Ionicons name={transcriptVisible ? "chevron-up" : "chevron-down"} size={15} color={isMine ? colors.whiteMuted : colors.textMuted} />
          </Pressable>
          {transcriptVisible ? (
            <Text selectable style={[styles.transcript, isMine ? styles.transcriptMine : styles.transcriptOther]}>{attachment.transcript}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export function MessageAttachmentView({ attachment, isMine }: MessageAttachmentViewProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const uri = resolveUri(attachment);

  if (attachment.kind === "audio") return <VoiceAttachment attachment={attachment} isMine={isMine} />;

  if (attachment.kind === "location") {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir la position ${attachment.name}`} onPress={() => void openExternal(attachment)} style={({ pressed }) => [styles.attachment, pressed && styles.pressed]}>
        <View style={styles.attachmentIcon}><Ionicons name="location-outline" size={21} color={isMine ? colors.white : colors.orange} /></View>
        <View style={styles.attachmentContent}>
          <Text numberOfLines={1} style={[styles.attachmentName, isMine ? styles.mineText : styles.otherText]}>{attachment.name}</Text>
          <Text style={[styles.attachmentMeta, isMine ? styles.mineMeta : styles.otherMeta]}>Position approximative · ±{Math.round(attachment.accuracyRadiusMeters ?? 250)} m</Text>
        </View>
        <Ionicons name="map-outline" size={18} color={isMine ? colors.whiteMuted : colors.textMuted} />
      </Pressable>
    );
  }

  if (attachment.kind === "photo" && uri) {
    return (
      <>
        <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Afficher ${attachment.name} dans Connexio`} onPress={() => setViewerOpen(true)} style={styles.visualWrap}>
          <Image source={{ uri }} resizeMode="cover" style={styles.photo} />
          <View style={styles.visualLabel}><Text style={styles.visualLabelText} numberOfLines={1}>{attachment.name}</Text><Ionicons name="expand-outline" size={16} color={colors.white} /></View>
        </Pressable>
        <InAppAttachmentViewer attachment={attachment} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
      </>
    );
  }

  if (attachment.kind === "video" && uri) {
    return (
      <>
        <View style={styles.visualWrap}>
          <HighlightMediaView compact media={{ id: attachment.id, kind: "video", uri, name: attachment.name, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, durationSeconds: attachment.durationSeconds, width: attachment.width, height: attachment.height, status: attachment.status, uploadProgress: attachment.uploadProgress }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir la vidéo en plein écran" onPress={() => setViewerOpen(true)} style={styles.expandVideo}><Ionicons name="expand-outline" size={17} color={colors.white} /></Pressable>
        </View>
        <InAppAttachmentViewer attachment={attachment} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
      </>
    );
  }

  return (
    <>
      <View style={styles.documentRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Lire ${attachment.name} dans Connexio`} onPress={() => setViewerOpen(true)} style={({ pressed }) => [styles.attachment, styles.documentMain, pressed && styles.pressed]}>
          <View style={styles.attachmentIcon}><Ionicons name={attachmentIcon(attachment.kind)} size={21} color={isMine ? colors.white : colors.orange} /></View>
          <View style={styles.attachmentContent}>
            <Text numberOfLines={1} style={[styles.attachmentName, isMine ? styles.mineText : styles.otherText]}>{attachment.name}</Text>
            <Text style={[styles.attachmentMeta, isMine ? styles.mineMeta : styles.otherMeta]}>{attachment.status === "uploading" ? `${Math.round((attachment.uploadProgress ?? 0) * 100)} %` : "Lire dans Connexio"}</Text>
          </View>
          <Ionicons name="eye-outline" size={18} color={isMine ? colors.whiteMuted : colors.textMuted} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${attachment.name} avec une autre application`} onPress={() => void openExternal(attachment)} style={styles.externalButton}><Ionicons name="open-outline" size={18} color={colors.textMuted} /></Pressable>
      </View>
      <InAppAttachmentViewer attachment={attachment} visible={viewerOpen} onClose={() => setViewerOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  visualWrap: { width: 250, maxWidth: "100%", borderRadius: 15, overflow: "hidden", position: "relative", backgroundColor: colors.surfaceStrong },
  photo: { width: "100%", height: 180 },
  visualLabel: { position: "absolute", left: 7, right: 7, bottom: 7, minHeight: 34, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "rgba(2,7,19,0.76)", flexDirection: "row", alignItems: "center", gap: 8 },
  visualLabelText: { flex: 1, color: colors.white, fontSize: 11, fontWeight: "800" },
  expandVideo: { position: "absolute", right: 8, top: 8, width: 48, height: 48, borderRadius: 15, backgroundColor: "rgba(2,7,19,0.76)", alignItems: "center", justifyContent: "center" },
  voiceCard: { minWidth: 224, maxWidth: "100%", padding: 9, borderRadius: 16, borderWidth: 1 },
  voiceMine: { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(2,7,19,0.16)" },
  voiceOther: { borderColor: colors.borderSoft, backgroundColor: "rgba(2,7,19,0.24)" },
  voiceMain: { flexDirection: "row", alignItems: "center", gap: 9 },
  voicePlay: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  voicePlayMine: { backgroundColor: colors.white },
  voicePlayOther: { backgroundColor: colors.primary },
  voiceContent: { flex: 1, minWidth: 0 },
  waveform: { height: 28, flexDirection: "row", alignItems: "center", gap: 2, overflow: "hidden" },
  waveBar: { width: 2.5, borderRadius: 2 },
  waveBarMine: { backgroundColor: colors.whiteMuted },
  waveBarOther: { backgroundColor: colors.orange },
  voiceMetaRow: { marginTop: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  voiceDuration: { fontSize: 11, fontWeight: "900" },
  speedButton: { minWidth: 48, minHeight: 48, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  speedText: { fontSize: 11, fontWeight: "900" },
  voiceName: { flex: 1, fontSize: 11, textAlign: "right", fontWeight: "700" },
  transcriptPending: { minHeight: 48, marginTop: 6, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)", flexDirection: "row", alignItems: "center", gap: 8 },
  transcriptPendingText: { fontSize: 11, fontWeight: "800" },
  transcriptToggle: { minHeight: 48, marginTop: 4, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.10)", flexDirection: "row", alignItems: "center", gap: 8 },
  transcriptToggleText: { flex: 1, fontSize: 11, fontWeight: "900" },
  transcript: { padding: 9, borderRadius: 12, fontSize: 11, lineHeight: 16 },
  transcriptMine: { color: colors.white, backgroundColor: "rgba(2,7,19,0.20)" },
  transcriptOther: { color: colors.textSecondary, backgroundColor: colors.surfaceStrong },
  documentRow: { maxWidth: "100%", flexDirection: "row", alignItems: "stretch", gap: 8 },
  documentMain: { flex: 1, minWidth: 0 },
  externalButton: { width: 48, minHeight: 56, borderRadius: 13, backgroundColor: "rgba(2,7,19,0.22)", alignItems: "center", justifyContent: "center" },
  attachment: { minWidth: 190, maxWidth: "100%", minHeight: 56, padding: 9, borderRadius: 13, backgroundColor: "rgba(2,7,19,0.22)", flexDirection: "row", alignItems: "center", gap: 10 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  attachmentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.10)" },
  attachmentContent: { flex: 1, minWidth: 0 },
  attachmentName: { fontSize: 11, fontWeight: "900" },
  attachmentMeta: { marginTop: 3, fontSize: 11, fontWeight: "700" },
  mineText: { color: colors.white },
  otherText: { color: colors.text },
  mineMeta: { color: colors.whiteMuted },
  otherMeta: { color: colors.textMuted }
});
