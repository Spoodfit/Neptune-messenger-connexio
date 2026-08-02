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
