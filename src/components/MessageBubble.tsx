import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import { colors, radii, spacing, typography } from "../theme";
import type { ChatMessage, MessageStatus } from "../types/messaging";
import { formatMessageTime } from "../utils/date";

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (clientMessageId: string) => void;
}

const STATUS_LABELS: Record<MessageStatus, string> = {
  queued: "En attente",
  sending: "Envoi en cours",
  sent: "Envoyé",
  delivered: "Distribué",
  read: "Lu",
  failed: "Échec de l’envoi"
};

const AVATAR_SIZE = 34;
const MAX_BUBBLE_WIDTH = 520;

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const statusLabel = STATUS_LABELS[message.status];
  const retryable =
    message.isMine && message.status === "failed" && message.clientMessageId;
  const availableRowWidth = Math.max(180, viewportWidth - spacing.md * 2);
  const maxBubbleWidth = Math.min(
    message.isMine
      ? availableRowWidth * 0.82
      : availableRowWidth - AVATAR_SIZE - spacing.sm,
    MAX_BUBBLE_WIDTH
  );

  useEffect(() => {
    setAvatarFailed(false);
  }, [message.senderAvatarUrl]);

  return (
    <View
      accessibilityLabel={`${message.senderName}. ${message.body}. ${formatMessageTime(
        message.createdAt
      )}${message.isMine ? `. ${statusLabel}` : ""}`}
      style={[
        styles.row,
        message.isMine ? styles.mineRow : styles.otherRow
      ]}
    >
      {!message.isMine ? (
        <View style={styles.avatar} accessibilityElementsHidden>
          {message.senderAvatarUrl && !avatarFailed ? (
            <Image
              source={{ uri: message.senderAvatarUrl }}
              onError={() => setAvatarFailed(true)}
              resizeMode="cover"
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{message.senderInitials}</Text>
          )}
        </View>
      ) : null}
      <View
        style={[
          styles.wrapper,
          { maxWidth: maxBubbleWidth },
          message.isMine ? styles.mineWrapper : styles.otherWrapper
        ]}
      >
        {!message.isMine ? (
          <Text numberOfLines={1} style={styles.sender}>
            {message.senderName}
          </Text>
        ) : null}
        <View
          style={[styles.bubble, message.isMine ? styles.mine : styles.other]}
        >
          <Text
            selectable
            style={[
              styles.body,
              message.isMine ? styles.mineBody : styles.otherBody
            ]}
          >
            {message.body}
          </Text>
          <View style={styles.metadata}>
            <Text
              style={[
                styles.time,
                message.isMine ? styles.mineTime : styles.otherTime
              ]}
            >
              {formatMessageTime(message.createdAt)}
            </Text>
            {message.isMine ? (
              <Text
                accessibilityLiveRegion="polite"
                style={[
                  styles.status,
                  message.status === "failed" && styles.failedStatus
                ]}
              >
                {statusLabel}
              </Text>
            ) : null}
          </View>
        </View>
        {retryable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Réessayer l’envoi de ce message"
            hitSlop={8}
            onPress={() => onRetry?.(message.clientMessageId!)}
            style={styles.retry}
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm
  },
  mineRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  wrapper: { minWidth: 0, flexShrink: 1 },
  mineWrapper: { alignItems: "flex-end" },
  otherWrapper: { alignItems: "flex-start" },
  sender: {
    ...typography.caption,
    maxWidth: "100%",
    color: colors.textMuted,
    marginLeft: spacing.sm,
    marginBottom: 4
  },
  bubble: {
    maxWidth: "100%",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6
  },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 5 },
  other: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 5
  },
  body: { ...typography.body, flexShrink: 1 },
  mineBody: { color: colors.white },
  otherBody: { color: colors.text },
  metadata: {
    maxWidth: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    columnGap: 6,
    rowGap: 2
  },
  time: { ...typography.caption, flexShrink: 0 },
  mineTime: { color: colors.whiteMuted },
  otherTime: { color: colors.textMuted },
  status: {
    color: colors.whiteMuted,
    fontSize: 10,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right"
  },
  failedStatus: { color: "#FFE1E4" },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  retryText: { color: colors.danger, fontSize: 12, fontWeight: "900" }
});