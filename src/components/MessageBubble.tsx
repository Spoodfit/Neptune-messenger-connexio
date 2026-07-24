import { StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "@/theme";
import type { ChatMessage } from "@/types/messaging";
import { formatMessageTime } from "@/utils/date";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  return (
    <View
      style={[
        styles.wrapper,
        message.isMine ? styles.mineWrapper : styles.otherWrapper
      ]}
    >
      {!message.isMine ? (
        <Text style={styles.sender}>{message.senderName}</Text>
      ) : null}
      <View style={[styles.bubble, message.isMine ? styles.mine : styles.other]}>
        <Text
          style={[
            styles.body,
            message.isMine ? styles.mineBody : styles.otherBody
          ]}
        >
          {message.body}
        </Text>
        <Text
          style={[
            styles.time,
            message.isMine ? styles.mineTime : styles.otherTime
          ]}
        >
          {formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: "84%"
  },
  mineWrapper: {
    alignSelf: "flex-end"
  },
  otherWrapper: {
    alignSelf: "flex-start"
  },
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
    gap: 4
  },
  mine: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 5
  },
  other: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 5
  },
  body: {
    ...typography.body
  },
  mineBody: {
    color: colors.white
  },
  otherBody: {
    color: colors.text
  },
  time: {
    ...typography.caption,
    alignSelf: "flex-end"
  },
  mineTime: {
    color: colors.whiteMuted
  },
  otherTime: {
    color: colors.textMuted
  }
});
