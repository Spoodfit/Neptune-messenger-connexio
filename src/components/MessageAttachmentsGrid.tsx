import { Ionicons } from "@expo/vector-icons";
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

interface MessageAttachmentsGridProps {
  attachments: MessageAttachment[];
  isMine: boolean;
}

function resolvedUrl(attachment: MessageAttachment): string | undefined {
  if (attachment.kind === "location") {
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
  }
  return attachment.downloadUrl ?? attachment.uri;
}

async function openOrDownload(attachment: MessageAttachment): Promise<void> {
  const url = resolvedUrl(attachment);
  if (!url) {
    Alert.alert("Contenu indisponible", "Le fichier n’est plus accessible.");
    return;
  }

  if (Platform.OS === "web") {
    const documentRef = (globalThis as { document?: Document }).document;
    if (documentRef && attachment.kind !== "location") {
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
    Alert.alert("Ouverture impossible", "Aucune application ne peut ouvrir ce contenu.");
    return;
  }
  await Linking.openURL(url);
}

function formatSize(sizeBytes?: number): string {
  if (!sizeBytes) return "";
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(sizeBytes / 1024))} Ko`;
}

export function MessageAttachmentsGrid({
  attachments,
  isMine
}: MessageAttachmentsGridProps) {
  const media = attachments.filter(
    (attachment) => attachment.kind === "photo" || attachment.kind === "video"
  );
  const files = attachments.filter(
    (attachment) => attachment.kind !== "photo" && attachment.kind !== "video"
  );
  const visibleMedia = media.slice(0, 4);
  const overflow = Math.max(0, media.length - visibleMedia.length);

  return (
    <View style={styles.root}>
      {visibleMedia.length > 0 ? (
        <View
          style={[
            styles.mediaGrid,
            visibleMedia.length === 1 && styles.mediaGridSingle
          ]}
        >
          {visibleMedia.map((attachment, index) => {
            const single = visibleMedia.length === 1;
            return (
              <Pressable
                key={attachment.id}
                accessibilityRole="imagebutton"
                accessibilityLabel={`Ouvrir ou télécharger ${attachment.name}`}
                onPress={() => void openOrDownload(attachment)}
                style={[
                  styles.mediaTile,
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
                  <View style={styles.videoBadge}>
                    <Ionicons name="play" size={15} color={colors.white} />
                  </View>
                ) : null}
                {overflow > 0 && index === visibleMedia.length - 1 ? (
                  <View style={styles.overflow}>
                    <Text style={styles.overflowText}>+{overflow}</Text>
                  </View>
                ) : null}
                <View style={styles.downloadBadge}>
                  <Ionicons name="download-outline" size={15} color={colors.white} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {files.length > 0 ? (
        <View style={styles.fileList}>
          {files.map((attachment) => (
            <Pressable
              key={attachment.id}
              accessibilityRole="button"
              accessibilityLabel={`Télécharger ${attachment.name}`}
              onPress={() => void openOrDownload(attachment)}
              style={({ pressed }) => [styles.file, pressed && styles.pressed]}
            >
              <View style={styles.fileIcon}>
                <Ionicons
                  name={
                    attachment.kind === "location"
                      ? "location-outline"
                      : attachment.kind === "audio"
                        ? "mic-outline"
                        : attachment.kind === "contact"
                          ? "person-outline"
                          : "document-attach-outline"
                  }
                  size={20}
                  color={isMine ? colors.white : colors.orange}
                />
              </View>
              <View style={styles.fileContent}>
                <Text
                  numberOfLines={2}
                  style={[styles.fileName, isMine ? styles.mineText : styles.otherText]}
                >
                  {attachment.name}
                </Text>
                <Text style={[styles.fileMeta, isMine ? styles.mineMeta : styles.otherMeta]}>
                  {attachment.kind === "location"
                    ? `Position approximative · ±${Math.round(
                        attachment.accuracyRadiusMeters ?? 250
                      )} m`
                    : [attachment.mimeType, formatSize(attachment.sizeBytes)]
                        .filter(Boolean)
                        .join(" · ") || attachment.kind.toLocaleUpperCase("fr")}
                </Text>
              </View>
              <Ionicons
                name={attachment.kind === "location" ? "open-outline" : "download-outline"}
                size={19}
                color={isMine ? colors.whiteMuted : colors.textMuted}
              />
            </Pressable>
          ))}
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
    gap: 2,
    backgroundColor: colors.surfaceStrong
  },
  mediaGridSingle: { height: 210 },
  mediaTile: {
    width: "49.5%",
    height: "49.5%",
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.surfaceStrong
  },
  mediaTileSingle: { width: "100%", height: "100%" },
  mediaTileTall: { height: "100%" },
  media: { width: "100%", height: "100%" },
  videoBadge: { position: "absolute", left: "50%", top: "50%", width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(2,7,19,0.72)" },
  overflow: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(2,7,19,0.68)" },
  overflowText: { color: colors.white, fontSize: 24, fontWeight: "900" },
  downloadBadge: { position: "absolute", right: 6, bottom: 6, width: 29, height: 29, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(2,7,19,0.72)" },
  fileList: { gap: 8 },
  file: { minWidth: 210, maxWidth: 340, minHeight: 58, padding: 9, borderRadius: 14, backgroundColor: "rgba(2,7,19,0.23)", flexDirection: "row", alignItems: "center", gap: 9 },
  fileIcon: { width: 39, height: 39, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.09)" },
  fileContent: { flex: 1, minWidth: 0 },
  fileName: { fontSize: 11.5, lineHeight: 15, fontWeight: "800" },
  fileMeta: { fontSize: 11, marginTop: 3, fontWeight: "700" },
  mineText: { color: colors.white },
  otherText: { color: colors.text },
  mineMeta: { color: colors.whiteMuted },
  otherMeta: { color: colors.textMuted },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] }
});
