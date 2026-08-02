import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { colors } from "../theme";
import type { MessageAttachment } from "../types/messaging";
import { HighlightMediaView } from "./HighlightMediaView";

interface MessageAttachmentViewProps {
  attachment: MessageAttachment;
  isMine: boolean;
}

const attachmentIcon = (kind: MessageAttachment["kind"]) => {
  switch (kind) {
    case "photo":
      return "image-outline" as const;
    case "video":
      return "videocam-outline" as const;
    case "audio":
      return "mic-outline" as const;
    case "location":
      return "location-outline" as const;
    case "contact":
      return "person-outline" as const;
    default:
      return "document-attach-outline" as const;
  }
};

function locationUrl(attachment: MessageAttachment): string | undefined {
  if (
    typeof attachment.latitude === "number" &&
    typeof attachment.longitude === "number"
  ) {
    const coordinates = `${attachment.latitude},${attachment.longitude}`;
    return Platform.select({
      ios: `https://maps.apple.com/?ll=${coordinates}`,
      android: `geo:${coordinates}?q=${coordinates}`,
      default: `https://www.openstreetmap.org/?mlat=${attachment.latitude}&mlon=${attachment.longitude}#map=15/${attachment.latitude}/${attachment.longitude}`
    });
  }
  return attachment.uri;
}

function formatDuration(durationSeconds?: number): string {
  const total = Math.max(0, Math.round(durationSeconds ?? 0));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function openAttachment(attachment: MessageAttachment): Promise<void> {
  const uri =
    attachment.kind === "location" ? locationUrl(attachment) : attachment.uri;
  if (!uri) {
    Alert.alert("Contenu indisponible", "Ce fichier n’est plus accessible.");
    return;
  }
  const supported = await Linking.canOpenURL(uri);
  if (!supported) {
    Alert.alert("Ouverture impossible", "Aucune application ne peut ouvrir ce contenu.");
    return;
  }
  await Linking.openURL(uri);
}

function VoiceAttachment({
  attachment,
  isMine
}: MessageAttachmentViewProps) {
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const transcriptReady = Boolean(attachment.transcript?.trim());
  const waveform = [7, 13, 19, 10, 23, 15, 8, 18, 25, 12, 20, 9, 16, 22, 11, 17, 7];

  return (
    <View
      accessible
      accessibilityLabel={`Message vocal de ${formatDuration(
        attachment.durationSeconds
      )}${transcriptReady ? ". Transcription disponible." : ""}`}
      style={[
        styles.voiceCard,
        isMine ? styles.voiceMine : styles.voiceOther
      ]}
    >
      <View style={styles.voiceMain}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Lire le message vocal"
          onPress={() => void openAttachment(attachment)}
          style={[
            styles.voicePlay,
            isMine ? styles.voicePlayMine : styles.voicePlayOther
          ]}
        >
          <Ionicons
            name="play"
            size={19}
            color={isMine ? colors.primary : colors.white}
          />
        </Pressable>
        <View style={styles.voiceContent}>
          <View style={styles.waveform} accessibilityElementsHidden>
            {waveform.map((height, index) => (
              <View
                key={`${attachment.id}-wave-${index}`}
                style={[
                  styles.waveBar,
                  { height },
                  isMine ? styles.waveBarMine : styles.waveBarOther
                ]}
              />
            ))}
          </View>
          <View style={styles.voiceMetaRow}>
            <Text
              style={[
                styles.voiceDuration,
                isMine ? styles.mineMeta : styles.otherMeta
              ]}
            >
              {attachment.status === "uploading"
                ? `${Math.round((attachment.uploadProgress ?? 0) * 100)} %`
                : formatDuration(attachment.durationSeconds)}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.voiceName,
                isMine ? styles.mineMeta : styles.otherMeta
              ]}
            >
              Vocal Neptune
            </Text>
          </View>
        </View>
      </View>

      {attachment.transcriptStatus === "pending" ? (
        <View style={styles.transcriptPending}>
          <Ionicons
            name="sparkles-outline"
            size={14}
            color={isMine ? colors.whiteMuted : colors.orange}
          />
          <Text
            style={[
              styles.transcriptPendingText,
              isMine ? styles.mineMeta : styles.otherMeta
            ]}
          >
            Transcription en cours…
          </Text>
        </View>
      ) : transcriptReady ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              transcriptVisible
                ? "Masquer la transcription"
                : "Afficher la transcription"
            }
            accessibilityState={{ expanded: transcriptVisible }}
            onPress={() => setTranscriptVisible((current) => !current)}
            style={styles.transcriptToggle}
          >
            <Ionicons
              name="document-text-outline"
              size={15}
              color={isMine ? colors.white : colors.orange}
            />
            <Text
              style={[
                styles.transcriptToggleText,
                isMine ? styles.mineText : styles.otherText
              ]}
            >
              {transcriptVisible
                ? "Masquer la transcription"
                : "Afficher la transcription"}
            </Text>
            <Ionicons
              name={transcriptVisible ? "chevron-up" : "chevron-down"}
              size={15}
              color={isMine ? colors.whiteMuted : colors.textMuted}
            />
          </Pressable>
          {transcriptVisible ? (
            <Text
              selectable
              style={[
                styles.transcript,
                isMine ? styles.transcriptMine : styles.transcriptOther
              ]}
            >
              {attachment.transcript}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export function MessageAttachmentView({
  attachment,
  isMine
}: MessageAttachmentViewProps) {
  if (attachment.kind === "photo" && attachment.uri) {
    return (
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`Ouvrir ${attachment.name}`}
        onPress={() => void openAttachment(attachment)}
        style={styles.visualWrap}
      >
        <Image
          source={{ uri: attachment.uri }}
          resizeMode="cover"
          style={styles.photo}
        />
        <View style={styles.visualLabel}>
          <Text style={styles.visualLabelText} numberOfLines={1}>
            {attachment.name}
          </Text>
        </View>
      </Pressable>
    );
  }

  if (attachment.kind === "video" && attachment.uri) {
    return (
      <View style={styles.visualWrap}>
        <HighlightMediaView
          compact
          media={{
            id: attachment.id,
            kind: "video",
            uri: attachment.uri,
            name: attachment.name,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            durationSeconds: attachment.durationSeconds,
            width: attachment.width,
            height: attachment.height,
            status: attachment.status,
            uploadProgress: attachment.uploadProgress
          }}
        />
        <View style={styles.visualLabel}>
          <Text style={styles.visualLabelText} numberOfLines={1}>
            {attachment.name}
          </Text>
        </View>
      </View>
    );
  }

  if (attachment.kind === "audio") {
    return <VoiceAttachment attachment={attachment} isMine={isMine} />;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir ${attachment.name}`}
      onPress={() => void openAttachment(attachment)}
      style={({ pressed }) => [styles.attachment, pressed && styles.pressed]}
    >
      <View style={styles.attachmentIcon}>
        <Ionicons
          name={attachmentIcon(attachment.kind)}
          size={21}
          color={isMine ? colors.white : colors.orange}
        />
      </View>
      <View style={styles.attachmentContent}>
        <Text
          numberOfLines={1}
          style={[
            styles.attachmentName,
            isMine ? styles.mineText : styles.otherText
          ]}
        >
          {attachment.name}
        </Text>
        <Text
          style={[
            styles.attachmentMeta,
            isMine ? styles.mineMeta : styles.otherMeta
          ]}
        >
          {attachment.status === "uploading"
            ? `${Math.round((attachment.uploadProgress ?? 0) * 100)} %`
            : attachment.kind === "location"
              ? `Position approximative · ±${Math.round(
                  attachment.accuracyRadiusMeters ?? 250
                )} m`
              : attachment.kind.toLocaleUpperCase("fr")}
        </Text>
      </View>
      <Ionicons
        name="open-outline"
        size={18}
        color={isMine ? colors.whiteMuted : colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  visualWrap: {
    width: 250,
    maxWidth: "100%",
    borderRadius: 15,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.surfaceStrong
  },
  photo: { width: "100%", height: 180 },
  visualLabel: {
    position: "absolute",
    left: 7,
    right: 7,
    bottom: 7,
    minHeight: 30,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "rgba(2,7,19,0.72)",
    justifyContent: "center"
  },
  visualLabelText: { color: colors.white, fontSize: 9, fontWeight: "800" },
  voiceCard: {
    minWidth: 224,
    maxWidth: "100%",
    padding: 9,
    borderRadius: 16,
    borderWidth: 1
  },
  voiceMine: {
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(2,7,19,0.16)"
  },
  voiceOther: {
    borderColor: colors.borderSoft,
    backgroundColor: "rgba(2,7,19,0.24)"
  },
  voiceMain: { flexDirection: "row", alignItems: "center", gap: 9 },
  voicePlay: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  voicePlayMine: { backgroundColor: colors.white },
  voicePlayOther: { backgroundColor: colors.primary },
  voiceContent: { flex: 1, minWidth: 0 },
  waveform: {
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    overflow: "hidden"
  },
  waveBar: { width: 2.5, borderRadius: 2 },
  waveBarMine: { backgroundColor: colors.whiteMuted },
  waveBarOther: { backgroundColor: colors.orange },
  voiceMetaRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  voiceDuration: { fontSize: 9, fontWeight: "900" },
  voiceName: { flex: 1, fontSize: 8.5, textAlign: "right", fontWeight: "700" },
  transcriptPending: {
    minHeight: 34,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  transcriptPendingText: { fontSize: 9, fontWeight: "800" },
  transcriptToggle: {
    minHeight: 44,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  transcriptToggleText: { flex: 1, fontSize: 9.5, fontWeight: "900" },
  transcript: {
    padding: 9,
    borderRadius: 12,
    fontSize: 11,
    lineHeight: 16
  },
  transcriptMine: {
    color: colors.white,
    backgroundColor: "rgba(2,7,19,0.20)"
  },
  transcriptOther: {
    color: colors.textSecondary,
    backgroundColor: colors.surfaceStrong
  },
  attachment: {
    minWidth: 190,
    maxWidth: "100%",
    minHeight: 56,
    padding: 9,
    borderRadius: 13,
    backgroundColor: "rgba(2,7,19,0.22)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  attachmentIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.09)"
  },
  attachmentContent: { flex: 1, minWidth: 0 },
  attachmentName: { fontSize: 12, fontWeight: "800" },
  attachmentMeta: { fontSize: 9, marginTop: 2, fontWeight: "700" },
  mineText: { color: colors.white },
  otherText: { color: colors.text },
  mineMeta: { color: colors.whiteMuted },
  otherMeta: { color: colors.textMuted }
});
