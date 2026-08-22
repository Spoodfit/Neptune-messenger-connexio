import { Text } from "@/components/LocalizedText";
import {
  Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect,
  useMemo,
  useRef,
  useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";

import { getRoleAppearance } from "../domain/roleAppearance";
import { colors, gradients, spacing, typography } from "../theme";
import type {
  ChatMessage,
  MessageReactionSummary,
  MessageStatus
} from "../types/messaging";
import { formatMessageTime } from "../utils/date";
import { MessageAttachmentsGrid } from "./MessageAttachmentsGrid";
import { PollMessageCard } from "./PollMessageCard";
import { StatusAvatar } from "./StatusAvatar";

interface MessageBubbleProps {
  message: ChatMessage;
  reactions?: MessageReactionSummary[];
  onRetry?: (clientMessageId: string) => void;
  onReact?: (message: ChatMessage, emoji: string) => void | Promise<void>;
  onReply?: (message: ChatMessage) => void;
  onOpenProfile?: (memberId: string) => void;
  onVotePoll?: (message: ChatMessage, optionId: string) => void | Promise<void>;
  centered?: boolean;
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

import { useAppTheme } from "@/providers/ThemeProvider";
export function MessageBubble({
  message,
  reactions = message.reactions ?? [],
  onRetry,
  onReact,
  onReply,
  onOpenProfile,
  onVotePoll,
  centered = false
}: MessageBubbleProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width: viewportWidth } = useWindowDimensions();
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
  const canReactWithLongPress = Boolean(onReact) && !message.isMine;
  const senderRoleAppearance = getRoleAppearance(message.senderRole ?? "triton", theme.isLight);

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
          !centered &&
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
        <Ionicons name="return-up-forward" size={19} color={theme.orange} />
      </Animated.View>

      <Animated.View
        {...panResponder.panHandlers}
        accessibilityLabel={`${message.senderName}. ${message.body}. ${formatMessageTime(
          message.createdAt
        )}${message.isMine ? `. ${statusLabel}` : ""}. Glisser vers la droite pour répondre.`}
        style={[
          styles.row,
          message.isMine ? styles.mineRow : styles.otherRow,
          centered && styles.centerRow,
          { transform: [{ translateX }] }
        ]}
      >
        {!message.isMine && !centered ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ouvrir le profil de ${message.senderName}`}
            onPress={() => onOpenProfile?.(message.senderId)}
            style={styles.avatarPressable}
          >
            <StatusAvatar
              user={{
                name: message.senderName,
                initials: message.senderInitials,
                avatarUrl: message.senderAvatarUrl,
                role: message.senderRole
              }}
              size={AVATAR_SIZE}
              accessible={false}
            />
          </Pressable>
        ) : null}

        <View
          style={[
            styles.wrapper,
            { maxWidth: maxBubbleWidth },
            message.isMine ? styles.mineWrapper : styles.otherWrapper,
            centered && styles.centerWrapper
          ]}
        >
          {!message.isMine && !centered ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Ouvrir le profil de ${message.senderName}`}
              onPress={() => onOpenProfile?.(message.senderId)}
              style={styles.senderPressable}
            >
              <View style={styles.senderLine}>
                <Text numberOfLines={1} style={styles.sender}>
                  {message.senderName}
                </Text>
                <Text
                  accessibilityLabel={`Statut ${senderRoleAppearance.label}`}
                  numberOfLines={1}
                  style={[
                    styles.senderRole,
                    {
                      color: senderRoleAppearance.foreground,
                      borderColor: senderRoleAppearance.border,
                      backgroundColor: senderRoleAppearance.background
                    }
                  ]}
                >
                  {senderRoleAppearance.shortLabel}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <View style={styles.bubbleStage}>
            <Pressable
              accessible={false}
              onLongPress={
                canReactWithLongPress
                  ? () => setReactionOpen(true)
                  : undefined
              }
              delayLongPress={320}
            >
              {message.isMine ? (
                <LinearGradient
                  colors={[colors.primary, theme.violet]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bubble, styles.mine]}
                >
                  {bubbleContent}
                </LinearGradient>
              ) : (
                <LinearGradient
                  colors={theme.isLight ? [theme.surface, theme.surfaceStrong] as const : gradients.glass}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.85, y: 1 }}
                  style={[
                    styles.bubble,
                    styles.other,
                    centered && styles.centeredBubble
                  ]}
                >
                  {bubbleContent}
                </LinearGradient>
              )}
            </Pressable>

            {reactionOpen ? (
              <View style={styles.reactionAnchor} pointerEvents="box-none">
                {reactionOpen ? (
                  <Animated.View
                    style={[
                      styles.reactionPicker,
                      styles.reactionPickerLeft,
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
              </View>
            ) : null}
          </View>

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

const createStyles = (theme: ReturnType<typeof useAppTheme>) => StyleSheet.create({
  gestureStage: {
    width: "100%",
    position: "relative",
    marginBottom: spacing.md
  },
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
    backgroundColor: theme.surfaceStrong,
    borderWidth: 1,
    borderColor: theme.border
  },
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm
  },
  mineRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },
  centerRow: { justifyContent: "center" },
  avatarPressable: {
    width: 48,
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "flex-end"
  },
  avatarShell: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    padding: 2,
    borderRadius: 12,
    borderWidth: 2,
    flexShrink: 0,
    shadowColor: theme.violet,
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
    backgroundColor: theme.surfaceStrong,
    borderWidth: 1,
    borderColor: theme.surface
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: theme.pageText, fontSize: 11, fontWeight: "900" },
  wrapper: { minWidth: 0, flexShrink: 1, position: "relative", overflow: "visible" },
  mineWrapper: { alignItems: "flex-end" },
  otherWrapper: { alignItems: "flex-start" },
  centerWrapper: { alignItems: "center", maxWidth: "92%" },
  senderPressable: { minWidth: 48, minHeight: 48, justifyContent: "flex-end" },
  senderLine: {
    minHeight: 28,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: spacing.sm
  },
  senderRole: {
    maxWidth: 92,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 11,
    lineHeight: 11,
    fontWeight: "900"
  },
  sender: {
    ...typography.caption,
    maxWidth: "100%",
    minHeight: 24,
    color: theme.pageTextMuted,
    fontSize: 11,
    fontWeight: "800",
    textAlignVertical: "center"
  },
  bubbleStage: { maxWidth: "100%", position: "relative", overflow: "visible" },
  bubble: {
    maxWidth: "100%",
    borderRadius: 17,
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 8
  },
  mine: {
    borderBottomRightRadius: 5,
    shadowColor: theme.violet,
    shadowOpacity: theme.isLight ? 0 : 0.18,
    shadowRadius: theme.isLight ? 0 : 12,
    shadowOffset: { width: 0, height: theme.isLight ? 0 : 8 },
    elevation: theme.isLight ? 0 : 3
  },
  other: {
    borderWidth: 1,
    borderColor: theme.borderSoft,
    borderBottomLeftRadius: 5
  },
  centeredBubble: {
    borderBottomLeftRadius: 17,
    alignItems: "center"
  },
  replyPreview: {
    minWidth: 130,
    maxWidth: "100%",
    padding: 8,
    borderRadius: 11,
    backgroundColor: theme.isLight ? theme.surfaceMuted : "rgba(2,7,19,0.28)",
    flexDirection: "row",
    gap: 8
  },
  replyAccent: { width: 3, borderRadius: 2, backgroundColor: theme.orange },
  replyContent: { flex: 1, minWidth: 0 },
  replyAuthor: { color: theme.orange, fontSize: 11, fontWeight: "900" },
  replyBody: { color: theme.pageTextSecondary, fontSize: 11, marginTop: 2 },
  body: { ...typography.body, flexShrink: 1, fontSize: 14, lineHeight: 19 },
  mineBody: { color: colors.white },
  otherBody: { color: theme.pageText },
  metadata: {
    maxWidth: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    columnGap: 8,
    rowGap: 2
  },
  time: { fontSize: 11, lineHeight: 12, fontWeight: "600", flexShrink: 0 },
  mineTime: { color: colors.whiteMuted },
  otherTime: { color: theme.pageTextMuted },
  status: {
    color: colors.whiteMuted,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right"
  },
  reactionAnchor: {
    position: "absolute",
    right: -8,
    bottom: -22,
    width: 48,
    height: 48,
    zIndex: 40,
    elevation: 18,
    overflow: "visible"
  },
  reactionPicker: {
    position: "absolute",
    top: 1,
    height: 42,
    paddingHorizontal: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.shellBackground,
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
  reactionPickerLeft: { right: 38 },
  reactionPickerRight: { left: 38 },
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
    borderColor: theme.violet,
    backgroundColor: theme.violetSoft
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
    borderColor: theme.borderSoft,
    backgroundColor: theme.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  reactionPillActive: {
    borderColor: theme.violet,
    backgroundColor: theme.violetSoft
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { color: theme.pageTextSecondary, fontSize: 11, fontWeight: "800" },
  reactionAdd: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 12,
    elevation: 9
  },
  reactionAddVisual: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.shellBackground,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  retry: { minHeight: 48, justifyContent: "center", paddingHorizontal: 8 },
  retryText: { color: theme.danger, fontSize: 14, fontWeight: "900" }
});
