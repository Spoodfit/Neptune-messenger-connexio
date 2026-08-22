import { Text } from "@/components/LocalizedText";
import {
  useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { createElement } from "react";
import { Image,
  Modal,
  Pressable,
  StyleSheet,
  View
} from "react-native";

import { colors, spacing, typography } from "../theme";
import type { InAppAttachmentViewerProps } from "./InAppAttachmentViewer.types";
import { HighlightMediaView } from "./HighlightMediaView";

function sourceUri({ attachment }: Pick<InAppAttachmentViewerProps, "attachment">): string {
  return attachment.downloadUrl ?? attachment.uri ?? "";
}

import { useAppTheme } from "@/providers/ThemeProvider";
export default function InAppAttachmentViewer({
  attachment,
  visible,
  onClose
}: InAppAttachmentViewerProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const uri = sourceUri({ attachment });
  const isImage = attachment.kind === "photo";
  const isVideo = attachment.kind === "video";

  return (
    <Modal
      animationType="fade"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer l’aperçu"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={25} color={theme.pageText} />
          </Pressable>
          <View style={styles.headerText}>
            <Text numberOfLines={1} style={styles.title}>
              {attachment.name}
            </Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              Aperçu sécurisé dans Connexio
            </Text>
          </View>
          <View style={styles.closeButton} />
        </View>

        <View style={styles.content}>
          {!uri ? (
            <Text style={styles.empty}>Ce fichier n’est plus accessible.</Text>
          ) : isImage ? (
            <Image source={{ uri }} resizeMode="contain" style={styles.image} />
          ) : isVideo ? (
            <View style={styles.videoWrap}>
              <HighlightMediaView
                media={{
                  id: attachment.id,
                  kind: "video",
                  uri,
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
            </View>
          ) : (
            createElement("iframe", {
              title: attachment.name,
              src: uri,
              style: {
                width: "100%",
                height: "100%",
                border: 0,
                background: "#FFFFFF"
              },
              sandbox: "allow-same-origin allow-scripts allow-forms allow-downloads"
            })
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.pageBackground },
  header: {
    minHeight: 68,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderSoft,
    backgroundColor: theme.border,
    flexDirection: "row",
    alignItems: "center"
  },
  closeButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1, minWidth: 0, alignItems: "center" },
  title: { ...typography.heading3, color: theme.pageText, maxWidth: "100%" },
  subtitle: { ...typography.caption, color: theme.pageTextMuted, marginTop: 2 },
  content: { flex: 1, minHeight: 0, padding: spacing.sm },
  image: { width: "100%", height: "100%" },
  videoWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { ...typography.body, color: theme.pageTextMuted, textAlign: "center", marginTop: spacing.xl }
});
