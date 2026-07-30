import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, gradients, radii, spacing, typography } from "../theme";
import type { Conversation } from "../types/messaging";
import { formatConversationTime } from "../utils/date";

interface ConversationRowProps {
  conversation: Conversation;
}

export function ConversationRow({ conversation }: ConversationRowProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const unreadLabel = conversation.unreadCount
    ? `${conversation.unreadCount} message${conversation.unreadCount > 1 ? "s" : ""} non lu${conversation.unreadCount > 1 ? "s" : ""}`
    : "Aucun message non lu";

  useEffect(() => {
    setAvatarFailed(false);
  }, [conversation.avatarUrl]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${conversation.name}. ${conversation.lastMessage ?? "Aucun message"}. ${unreadLabel}`}
      accessibilityHint="Ouvre la conversation"
      onPress={() => router.push(`/chat/${encodeURIComponent(conversation.id)}`)}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={gradients.glass}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.row}
      >
        <LinearGradient
          colors={gradients.primaryWarm}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarShell}
          accessibilityElementsHidden
        >
          <View style={styles.avatarInner}>
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
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.unread}
                accessibilityElementsHidden
              >
                <Text style={styles.unreadText} numberOfLines={1}>
                  {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
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
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%",
    marginBottom: spacing.sm,
    borderRadius: 21,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  row: {
    width: "100%",
    minHeight: 78,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: 11,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatarShell: {
    width: 50,
    height: 50,
    padding: 2,
    borderRadius: 17,
    flexShrink: 0,
    shadowColor: colors.violet,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 }
  },
  avatarInner: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 15,
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
    gap: spacing.sm
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
    marginTop: 5,
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
  unread: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  unreadText: { color: colors.white, fontSize: 10, fontWeight: "900" }
});
