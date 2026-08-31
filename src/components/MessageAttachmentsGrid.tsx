import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View
} from "react-native";

import { useAppTheme } from "../providers/ThemeProvider";
import { AppAlert } from "../services/ui/AppAlert";
import { colors } from "../theme";
import type { MessageAttachment } from "../types/messaging";
import { HighlightMediaView } from "./HighlightMediaView";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";

interface MessageAttachmentsGridProps {
  attachments: MessageAttachment[];
  isMine: boolean;
}

function resolvedUrl(attachment: MessageAttachment): string | undefined {
  if (
    attachment.kind === "location" &&
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
  return attachment.downloadUrl ?? attachment.uri;
}

async function openOrDownload(attachment: MessageAttachment): Promise<void> {
  const url = resolvedUrl(attachment);
  if (!url) {
    AppAlert.alert("Contenu indisponible", "Le contenu n’est plus accessible.");
    return;
  }
  if (Platform.OS === "web") {
    const documentRef = (globalThis as { document?: Document }).document;
    if (documentRef && attachment.kind !== "location" && attachment.kind !== "contact") {
      const anchor = documentRef.createElement("a");
      anchor.href = url;
      anchor.download = attachment.name;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      documentRef.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }
  }
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    AppAlert.alert("Ouverture impossible", "Aucune application ne peut ouvrir ce contenu.");
    return;
  }
  await Linking.openURL(url);
}

function formatSize(sizeBytes?: number): string {
  if (!sizeBytes) return "";
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(sizeBytes / 1024))} Ko`;
}

export function MessageAttachmentsGrid({ attachments, isMine }: MessageAttachmentsGridProps) {
  const theme = useAppTheme();
  const media = attachments.filter(
    (attachment) => attachment.kind === "photo" || attachment.kind === "video"
  );
  const audio = attachments.filter((attachment) => attachment.kind === "audio");
  const files = attachments.filter(
    (attachment) =>
      attachment.kind !== "photo" &&
      attachment.kind !== "video" &&
      attachment.kind !== "audio"
  );
  const visibleMedia = media.slice(0, 4);
  const overflow = Math.max(0, media.length - visibleMedia.length);

  return (
    <View style={styles.root}>
      {visibleMedia.length > 0 ? (
        <View
          style={[
            styles.mediaGrid,
            { backgroundColor: theme.surfaceStrong },
            visibleMedia.length === 1 && styles.mediaGridSingle
          ]}
        >
          {visibleMedia.map((attachment, index) => {
            const single = visibleMedia.length === 1;
            return (
              <Pressable
                key={attachment.id}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Ouvrir ${attachment.name}`}
                onPress={() => void openOrDownload(attachment)}
                style={[
                  styles.mediaTile,
                  { backgroundColor: theme.surfaceStrong },
                  single && styles.mediaTileSingle,
                  !single && visibleMedia.length === 3 && index === 0 && styles.mediaTileTall
                ]}
              >
                {attachment.kind === "photo" ? (
                  <Image
                    source={{ uri: attachment.thumbnailUrl ?? attachment.uri }}
                    resizeMode="cover"
                    style={styles.media}
                  />
                ) : (
                  <HighlightMediaView
                    compact={!single}
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
                )}
                {attachment.kind === "video" ? (
                  <View style={styles.darkBadge}>
                    <Ionicons name="play" size={15} color={colors.white} />
                  </View>
                ) : null}
                {overflow > 0 && index === visibleMedia.length - 1 ? (
                  <View style={styles.overflow}>
                    <Text style={styles.overflowText}>+{overflow}</Text>
                  </View>
                ) : null}
                <View style={styles.downloadBadge}>
                  <Ionicons name="open-outline" size={15} color={colors.white} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {audio.map((attachment) => (
        <VoiceMessagePlayer key={attachment.id} attachment={attachment} isMine={isMine} />
      ))}

      {files.length > 0 ? (
        <View style={styles.fileList}>
          {files.map((attachment) => {
            const contact = attachment.kind === "contact";
            const location = attachment.kind === "location";
            const meta = location
              ? `Position approximative · ±${Math.round(attachment.accuracyRadiusMeters ?? 250)} m`
              : contact
                ? attachment.mimeType || attachment.transcript || "Contact recommandé"
                : [attachment.mimeType, formatSize(attachment.sizeBytes)].filter(Boolean).join(" · ") || attachment.kind.toLocaleUpperCase("fr");
            return (
              <Pressable
                key={attachment.id}
                accessibilityRole="button"
                accessibilityLabel={contact ? `Ouvrir le contact ${attachment.name}` : `Ouvrir ${attachment.name}`}
                onPress={() => void openOrDownload(attachment)}
                style={({ pressed }) => [
                  styles.file,
                  {
                    backgroundColor: isMine ? "rgba(255,255,255,0.12)" : theme.surfaceStrong,
                    borderColor: isMine ? "rgba(255,255,255,0.18)" : theme.borderSoft
                  },
                  pressed && styles.pressed
                ]}
              >
                <View
                  style={[
                    styles.fileIcon,
                    {
                      backgroundColor: isMine
                        ? "rgba(255,255,255,0.10)"
                        : contact
                          ? theme.accentSoft
                          : theme.surfaceMuted
                    }
                  ]}
                >
                  <Ionicons
                    name={location ? "location-outline" : contact ? "person-outline" : "document-attach-outline"}
                    size={20}
                    color={isMine ? colors.white : contact ? theme.accent : theme.orange}
                  />
                </View>
                <View style={styles.fileContent}>
                  <Text
                    numberOfLines={2}
                    style={[styles.fileName, { color: isMine ? colors.white : theme.pageText }]}
                  >
                    {attachment.name}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.fileMeta,
                      { color: isMine ? "rgba(255,255,255,0.76)" : theme.pageTextMuted }
                    ]}
                  >
                    {meta}
                  </Text>
                </View>
                <Ionicons
                  name={contact || location ? "open-outline" : "download-outline"}
                  size={19}
                  color={isMine ? "rgba(255,255,255,0.78)" : theme.pageTextMuted}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { maxWidth: "100%", gap: 8 },
  mediaGrid: {
    width: 268,
    maxWidth: "100%",
    height: 216,
    overflow: "hidden",
    borderRadius: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2
  },
  mediaGridSingle: { height: 210 },
  mediaTile: { width: "49.5%", height: "49.5%", overflow: "hidden", position: "relative" },
  mediaTileSingle: { width: "100%", height: "100%" },
  mediaTileTall: { height: "100%" },
  media: { width: "100%", height: "100%" },
  darkBadge: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 34,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,7,19,0.72)"
  },
  overflow: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,7,19,0.68)"
  },
  overflowText: { color: colors.white, fontSize: 24, fontWeight: "900" },
  downloadBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 29,
    height: 29,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,7,19,0.72)"
  },
  fileList: { gap: 8 },
  file: {
    minWidth: 210,
    maxWidth: 340,
    minHeight: 62,
    padding: 9,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  fileIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  fileContent: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 12, lineHeight: 16, fontWeight: "900" },
  fileMeta: { fontSize: 11, lineHeight: 15, marginTop: 3, fontWeight: "700" },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] }
});
