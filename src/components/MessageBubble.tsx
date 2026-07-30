import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import { colors, gradients, radii, spacing, typography } from "../theme";
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

  const bubbleContent = (
    <>
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
          <Text accessibilityLiveRegion="polite" style={styles.status}>
            {statusLabel}
          </Text>
        ) : null}
      </View>
    </>
  );

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
        <LinearGradient
          colors={gradients.primaryWarm}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarShell}
          accessibilityElementsHidden
        >
          <View style={styles.avatar}>
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
        </LinearGradient>
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

        {message.isMine ? (
          <LinearGradient
            colors={[colors.primary, colors.violet]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, styles.mine]}
          >
            {bubbleContent}
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={gradients.glass}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={[styles.bubble, styles.other]}
          >
            {bubbleContent}
          </LinearGradient>
        )}

        {retryable ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Réessayer l’envoi de ce message"
            hitSlop={8}
            onPress={() => onRetry?.(message.clientMessageId!)}
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
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
  avatarShell: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    padding: 2,
    borderRadius: 12,
    flexShrink: 0,
    shadowColor: colors.violet,
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }
  },
  avatar: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.surface
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: colors.text, fontSize: 10, fontWeight: "900" },
  wrapper: { minWidth: 0, flexShrink: 1 },
  mineWrapper: { alignItems: "flex-end" },
  otherWrapper: { alignItems: "flex-start" },
  sender: {
    ...typography.caption,
    maxWidth: "100%",
    color: colors.textMuted,
    marginLeft: spacing.sm,
    marginBottom: 4,
    fontSize: 10,
    fontWeight: "800"
  },
  bubble: {
    maxWidth: "100%",
    borderRadius: 17,
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 6
  },
  mine: {
    borderBottomRightRadius: 5,
    shadowColor: colors.violet,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 }
  },
  other: {
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderBottomLeftRadius: 5
  },
  body: { ...typography.body, flexShrink: 1, fontSize: 13, lineHeight: 19 },
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
  time: { fontSize: 9, lineHeight: 12, fontWeight: "600", flexShrink: 0 },
  mineTime: { color: colors.whiteMuted },
  otherTime: { color: colors.textMuted },
  status: {
    color: colors.whiteMuted,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right"
  },
  retry: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8
  },
  retryPressed: { opacity: 0.72 },
  retryText: { color: colors.danger, fontSize: 12, fontWeight: "900" }
});
