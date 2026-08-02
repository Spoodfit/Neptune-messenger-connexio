import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import { colors, gradients, spacing, typography } from "../theme";
import type {
  ChatMessage,
  MessageReactionSummary,
  MessageStatus
} from "../types/messaging";
import { formatMessageTime } from "../utils/date";
import { MessageAttachmentsGrid } from "./MessageAttachmentsGrid";
import { PollMessageCard } from "./PollMessageCard";

interface MessageBubbleProps {
  message: ChatMessage;
  reactions?: MessageReactionSummary[];
  onRetry?: (clientMessageId: string) => void;
  onReact?: (message: ChatMessage, emoji: string) => void | Promise<void>;
  onReply?: (message: ChatMessage) => void;
  onOpenProfile?: (memberId: string) => void;
  onVotePoll?: (message: ChatMessage, optionId: string) => void | Promise<void>;
}

const STATUS_LABELS: Record<MessageStatus, string> = {
  queued: "En attente",
  sending: "Envoi en cours",
  sent: "Envoyé",
  delivered: "Distribué",
  read: "Lu",
  failed: "Échec de l’envoi"
};

const QUICK_REACTIONS = ["❤️", "🔥", "👏", "💡", "🤝", "😂"];
const AVATAR_SIZE = 44;
const MAX_BUBBLE_WIDTH = 520;
const REPLY_THRESHOLD = 54;

export function MessageBubble({
  message,
  reactions = message.reactions ?? [],
  onRetry,
  onReact,
  onReply,
  onOpenProfile,
  onVotePoll
}: MessageBubbleProps) {
  const { width: viewportWidth } = useWindowDimensions();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const reactionProgress = useRef(new Animated.Value(0)).current;
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
  const currentReaction = reactions.find(
    (reaction) => reaction.reactedByCurrentUser
  )?.emoji;
  const showDetachedReactionButton = Boolean(onReact);

  useEffect(() => {
    setAvatarFailed(false);
  }, [message.senderAvatarUrl]);

  useEffect(() => {
    Animated.spring(reactionProgress, {
      toValue: reactionOpen ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 235,
      mass: 0.7
    }).start();
  }, [reactionOpen, reactionProgress]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Boolean(onReply) &&
          gesture.dx > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.25,
        onPanResponderMove: (_, gesture) => {
          translateX.setValue(Math.min(72, Math.max(0, gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx >= REPLY_THRESHOLD) onReply?.(message);
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 220,
            mass: 0.65
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true
          }).start();
        }
      }),
    [message, onReply, translateX]
  );

  const replyOpacity = translateX.interpolate({
    inputRange: [0, REPLY_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: "clamp"
  });
  const reactionStyle = {
    opacity: reactionProgress,
    transform: [
      {
        translateY: reactionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [8, 0]
        })
      },
      {
        scale: reactionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1]
        })
      }
    ]
  };

  const chooseReaction = (emoji: string) => {
    void onReact?.(message, emoji);
    setReactionOpen(false);
  };

  const bubbleContent = (
    <>
      {message.replyPreview ? (
        <View style={styles.replyPreview}>
          <View style={styles.replyAccent} />
          <View style={styles.replyContent}>
            <Text style={styles.replyAuthor} numberOfLines={1}>
              {message.replyPreview.senderName}
            </Text>
            <Text style={styles.replyBody} numberOfLines={2}>
              {message.replyPreview.body}
            </Text>
          </View>
        </View>
      ) : null}

      {message.attachments?.length ? (
        <MessageAttachmentsGrid
          attachments={message.attachments}
          isMine={message.isMine}
        />
      ) : null}

      {message.poll ? (
        <PollMessageCard
          poll={message.poll}
          onVote={(optionId) => onVotePoll?.(message, optionId)}
        />
      ) : null}

      {message.body ? (
        <Text
          selectable
          style={[
            styles.body,
            message.isMine ? styles.mineBody : styles.otherBody
          ]}
        >
          {message.body}
        </Text>
      ) : null}

      <View style={styles.metadata}>
        <Text
          style={[
            styles.time,
            message.isMine ? styles.mineTime : styles.otherTime
          ]}
        >
          {formatMessageTime(message.createdAt)}
          {message.updatedAt ? " · modifié" : ""}
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
    <View style={styles.gestureStage}>
      <Animated.View
        pointerEvents="none"
        style={[styles.replyIndicator, { opacity: replyOpacity }]}
      >
        <Ionicons name="return-up-forward" size={19} color={colors.orange} />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        accessibilityLabel={`${message.senderName}. ${message.body}. ${formatMessageTime(
          message.createdAt
        )}${message.isMine ? `. ${statusLabel}` : ""}. Glisser vers la droite pour répondre.`}
        style={[
          styles.row,
          message.isMine ? styles.mineRow : styles.otherRow,
          { transform: [{ translateX }] }
        ]}
      >
        {!message.isMine ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir le profil de ${message.senderName}`}
            onPress={() => onOpenProfile?.(message.senderId)}
            style={styles.avatarPressable}
          >
            <LinearGradient colors={gradients.primaryWarm} style={styles.avatarShell}>
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
          </Pressable>
        ) : null}

        <View
          style={[
            styles.wrapper,
            { maxWidth: maxBubbleWidth },
            message.isMine ? styles.mineWrapper : styles.otherWrapper
          ]}
        >
          {!message.isMine ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir le profil de ${message.senderName}`}
              onPress={() => onOpenProfile?.(message.senderId)}
              style={styles.senderPressable}
            >
              <Text numberOfLines={1} style={styles.sender}>
                {message.senderName}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.bubbleStage}>
            <Pressable
    accessible={false}
    onLongPress={() => setReactionOpen(true)}
              delayLongPress={320}
            >
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
            </Pressable>

            {showDetachedReactionButton ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ajouter une réaction"
                onPress={() => setReactionOpen((value) => !value)}
                style={[
                  styles.reactionAdd,
                  message.isMine
                    ? styles.reactionAddMine
                    : styles.reactionAddOther
                ]}
              >
                <View style={styles.reactionAddVisual}>
                  <Ionicons name="add" size={10} color={colors.textMuted} />
                </View>
              </Pressable>
            ) : null}
          </View>

          {reactionOpen ? (
            <Animated.View
              style={[
                styles.reactionPicker,
                message.isMine && styles.reactionPickerMine,
                reactionStyle
              ]}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  accessibilityRole="button"
                  accessibilityLabel={`Réagir avec ${emoji}`}
                  accessibilityState={{ selected: currentReaction === emoji }}
                  onPress={() => chooseReaction(emoji)}
                  style={styles.reactionChoiceTarget}
                >
                  <View
                    style={[
                      styles.reactionChoiceVisual,
                      currentReaction === emoji && styles.reactionChoiceActive
                    ]}
                  >
                    <Text style={styles.reactionChoiceEmoji}>{emoji}</Text>
                  </View>
                </Pressable>
              ))}
            </Animated.View>
          ) : null}

          {reactions.length > 0 ? (
            <View
              style={[
                styles.reactionLine,
                message.isMine ? styles.reactionLineMine : styles.reactionLineOther
              ]}
            >
              <View style={styles.reactions}>
                {reactions.map((reaction) => (
                  <Pressable
                    key={reaction.emoji}
                    accessibilityRole="button"
                    accessibilityLabel={`${reaction.emoji}, ${reaction.count} réaction${reaction.count > 1 ? "s" : ""}`}
                    accessibilityState={{ selected: reaction.reactedByCurrentUser }}
                    onPress={() => chooseReaction(reaction.emoji)}
                    style={styles.reactionPillTarget}
                  >
                    <View
                      style={[
                        styles.reactionPillVisual,
                        reaction.reactedByCurrentUser && styles.reactionPillActive
                      ]}
                    >
                      <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                      <Text style={styles.reactionCount}>{reaction.count}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {retryable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Réessayer l’envoi de ce message"
              onPress={() => onRetry?.(message.clientMessageId!)}
              style={styles.retry}
            >
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  gestureStage: { width: "100%", position: "relative" },
  replyIndicator: {
    position: "absolute",
    left: 8,
    top: "50%",
    width: 34,
    height: 34,
    marginTop: -17,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.border
  },
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm
  },
  mineRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },
  avatarPressable: {
    width: AVATAR_SIZE,
    minHeight: 44,
    justifyContent: "flex-end"
  },
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
  wrapper: { minWidth: 0, flexShrink: 1, position: "relative", overflow: "visible" },
  mineWrapper: { alignItems: "flex-end" },
  otherWrapper: { alignItems: "flex-start" },
  senderPressable: { minWidth: 44, minHeight: 44, justifyContent: "flex-end" },
  sender: {
    ...typography.caption,
    maxWidth: "100%",
    minHeight: 24,
    color: colors.textMuted,
    marginLeft: spacing.sm,
    fontSize: 10,
    fontWeight: "800",
    textAlignVertical: "center"
  },
  bubbleStage: { maxWidth: "100%", position: "relative" },
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
  replyPreview: {
    minWidth: 130,
    maxWidth: "100%",
    padding: 8,
    borderRadius: 11,
    backgroundColor: "rgba(2,7,19,0.28)",
    flexDirection: "row",
    gap: 8
  },
  replyAccent: { width: 3, borderRadius: 2, backgroundColor: colors.orange },
  replyContent: { flex: 1, minWidth: 0 },
  replyAuthor: { color: colors.orange, fontSize: 10, fontWeight: "900" },
  replyBody: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
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
  reactionPicker: {
    position: "absolute",
    left: 0,
    bottom: "100%",
    marginBottom: 7,
    height: 42,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(8,18,38,0.98)",
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    zIndex: 40,
    elevation: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 }
  },
  reactionPickerMine: { left: undefined, right: 0 },
  reactionChoiceTarget: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  reactionChoiceVisual: {
    width: 30,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  reactionChoiceActive: {
    borderWidth: 1,
    borderColor: colors.violet,
    backgroundColor: "rgba(107,79,234,0.22)"
  },
  reactionChoiceEmoji: { fontSize: 19 },
  reactionLine: {
    minHeight: 29,
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center"
  },
  reactionLineMine: { justifyContent: "flex-end" },
  reactionLineOther: { justifyContent: "flex-start" },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 3, flexShrink: 1 },
  reactionPillTarget: {
    minWidth: 34,
    minHeight: 29,
    alignItems: "center",
    justifyContent: "center"
  },
  reactionPillVisual: {
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  reactionPillActive: {
    borderColor: colors.violet,
    backgroundColor: "rgba(107,79,234,0.22)"
  },
  reactionEmoji: { fontSize: 12 },
  reactionCount: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  reactionAdd: {
    position: "absolute",
    right: -16,
    bottom: -22,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 12,
    elevation: 9
  },
  reactionAddMine: { right: -16 },
  reactionAddOther: { right: -16 },
  reactionAddVisual: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(174,184,210,0.32)",
    backgroundColor: "rgba(8,18,38,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    transform: [{ translateX: 6 }]
  },
  retry: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  retryText: { color: colors.danger, fontSize: 12, fontWeight: "900" }
});
