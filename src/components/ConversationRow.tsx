import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { colors, gradients, radii, spacing, typography } from "../theme";
import type { AppUser, Conversation } from "../types/messaging";
import { formatConversationTime } from "../utils/date";
import { MemberAvatarStack } from "./MemberAvatarStack";

interface ConversationRowProps {
  conversation: Conversation;
  members?: readonly AppUser[];
  mentioned?: boolean;
  muted?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function ConversationRow({
  conversation,
  members = [],
  mentioned = false,
  muted = false,
  onPress,
  onLongPress
}: ConversationRowProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const unreadLabel = conversation.unreadCount
    ? `${conversation.unreadCount} message${conversation.unreadCount > 1 ? "s" : ""} non lu${conversation.unreadCount > 1 ? "s" : ""}`
    : "Aucun message non lu";
  const privateConversation =
    conversation.type === "direct" || conversation.type === "small_group";
  const activeMemberIds =
    conversation.activeMemberIds?.length
      ? conversation.activeMemberIds
      : conversation.memberIds ?? [];
  const exactMemberCount = conversation.memberIds?.length ?? conversation.memberCount;
  const canSchedule = Boolean(conversation.canManage && !privateConversation);

  useEffect(() => {
    setAvatarFailed(false);
  }, [conversation.avatarUrl]);

  useEffect(() => {
    if (!mentioned) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1150,
          useNativeDriver: true
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1150,
          useNativeDriver: true
        })
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [mentioned, pulse]);

  const borderOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.62, 1]
  });
  const scale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.006]
  });

  return (
    <Animated.View
      style={[
        styles.animatedWrap,
        mentioned && { opacity: borderOpacity, transform: [{ scale }] }
      ]}
    >
      <LinearGradient
        colors={
          mentioned
            ? [colors.primary, colors.violet, colors.orange]
            : [colors.borderSoft, colors.borderSoft, colors.borderSoft]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.border}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${conversation.name}. ${conversation.lastMessage ?? "Aucun message"}. ${unreadLabel}${mentioned ? ". Vous avez été mentionné" : ""}${muted ? ". Conversation en sourdine" : ""}`}
          accessibilityHint={
            onLongPress
              ? "Ouvre la conversation. Maintenir pour les paramètres rapides."
              : "Ouvre la conversation"
          }
          onPress={
            onPress ??
            (() =>
              router.push(`/chat/${encodeURIComponent(conversation.id)}`))
          }
          onLongPress={onLongPress}
          delayLongPress={420}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <LinearGradient
            colors={gradients.primaryWarm}
            style={styles.avatarBorder}
            accessibilityElementsHidden
          >
            <View style={styles.avatar}>
              {conversation.avatarUrl && !avatarFailed ? (
                <Image
                  source={{ uri: conversation.avatarUrl }}
                  onError={() => setAvatarFailed(true)}
                  resizeMode="cover"
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons
                  name={
                    conversation.type === "announcement"
                      ? "megaphone"
                      : conversation.type === "support"
                        ? "construct"
                        : conversation.type === "direct"
                          ? "person"
                          : "people"
                  }
                  size={21}
                  color={colors.text}
                />
              )}
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.topLine}>
              <Text style={styles.name} numberOfLines={1}>
                {conversation.name}
              </Text>
              {mentioned ? (
                <View style={styles.mentionPill} accessibilityElementsHidden>
                  <Text style={styles.mentionText}>@</Text>
                </View>
              ) : null}
              {muted ? (
                <Ionicons
                  accessibilityElementsHidden
                  name="notifications-off-outline"
                  size={14}
                  color={colors.textMuted}
                />
              ) : null}
              <Text style={styles.time} numberOfLines={1}>
                {formatConversationTime(conversation.lastMessageAt)}
              </Text>
            </View>
            <View style={styles.bottomLine}>
              <Text style={styles.preview} numberOfLines={1}>
                {conversation.lastMessage ?? "Aucun message"}
              </Text>
              {conversation.unreadCount > 0 ? (
                <LinearGradient
                  colors={[colors.primary, colors.violet]}
                  style={styles.unread}
                  accessibilityElementsHidden
                >
                  <Text style={styles.unreadText} numberOfLines={1}>
                    {conversation.unreadCount > 99
                      ? "99+"
                      : conversation.unreadCount}
                  </Text>
                </LinearGradient>
              ) : conversation.restricted ? (
                <Ionicons
                  accessibilityElementsHidden
                  name="lock-closed"
                  size={14}
                  color={colors.textMuted}
                />
              ) : null}
            </View>
            {!privateConversation ? (
              <View style={styles.memberLine}>
                <MemberAvatarStack
                  memberIds={activeMemberIds}
                  members={members}
                  memberCount={exactMemberCount}
                  maxVisible={4}
                  size={22}
                />
                <Text style={styles.memberActivity} numberOfLines={1}>
                  actifs récemment
                </Text>
              </View>
            ) : null}
          </View>

          {canSchedule ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Programmer un message dans ${conversation.name}`}
              accessibilityHint="Ouvre la programmation des messages automatiques de ce groupe."
              onPress={(event) => {
                event.stopPropagation();
                router.push(
                  `/schedule-message/${encodeURIComponent(conversation.id)}`
                );
              }}
              style={({ pressed }) => [
                styles.scheduleButton,
                pressed && styles.schedulePressed
              ]}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.orange} />
            </Pressable>
          ) : null}
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedWrap: {
    width: "100%",
    marginBottom: spacing.sm,
    borderRadius: radii.xl,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  border: {
    width: "100%",
    padding: 1,
    borderRadius: radii.xl
  },
  row: {
    width: "100%",
    minHeight: 82,
    padding: 12,
    borderRadius: radii.xl - 1,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  avatarBorder: {
    width: 50,
    height: 50,
    padding: 2,
    borderRadius: 17,
    flexShrink: 0
  },
  avatar: {
    flex: 1,
    borderRadius: 15,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: { width: "100%", height: "100%" },
  content: { flex: 1, minWidth: 0 },
  topLine: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  name: {
    ...typography.heading3,
    color: colors.text,
    flex: 1,
    minWidth: 0,
    fontWeight: "900"
  },
  time: {
    ...typography.caption,
    color: colors.textMuted,
    flexShrink: 0,
    fontSize: 10
  },
  bottomLine: {
    minWidth: 0,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  preview: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
    minWidth: 0,
    fontSize: 12
  },
  memberLine: {
    minHeight: 25,
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  memberActivity: { flex: 1, color: colors.textMuted, fontSize: 8.5, fontWeight: "700" },
  mentionPill: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,177,131,0.16)",
    borderWidth: 1,
    borderColor: "rgba(244,177,131,0.52)"
  },
  mentionText: {
    color: colors.orange,
    fontSize: 12,
    fontWeight: "900"
  },
  unread: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  unreadText: { color: colors.white, fontSize: 10, fontWeight: "900" },
  scheduleButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(244,177,131,0.24)",
    backgroundColor: "rgba(244,177,131,0.10)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  schedulePressed: { opacity: 0.72, transform: [{ scale: 0.96 }] }
});
