import { Pressable, StyleSheet, Text, View } from "react-native";

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

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const statusLabel = STATUS_LABELS[message.status];
  const retryable =
    message.isMine && message.status === "failed" && message.clientMessageId;

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
          <Text style={styles.avatarText}>{message.senderInitials}</Text>
        </View>
      ) : null}
      <View
        style={[
          styles.wrapper,
          message.isMine ? styles.mineWrapper : styles.otherWrapper
        ]}
      >
        {!message.isMine ? (
          <Text style={styles.sender}>{message.senderName}</Text>
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
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  mineRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border
  },
  avatarText: { color: colors.primary, fontSize: 11, fontWeight: "900" },
  wrapper: { maxWidth: "82%" },
  mineWrapper: { alignItems: "flex-end" },
  otherWrapper: { alignItems: "flex-start" },
  sender: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    marginBottom: 4
  },
  bubble: {
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
  body: { ...typography.body },
  mineBody: { color: colors.white },
  otherBody: { color: colors.text },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6
  },
  time: { ...typography.caption },
  mineTime: { color: colors.whiteMuted },
  otherTime: { color: colors.textMuted },
  status: { color: colors.whiteMuted, fontSize: 10, fontWeight: "700" },
  failedStatus: { color: "#FFE1E4" },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  retryText: { color: colors.danger, fontSize: 12, fontWeight: "900" }
});
