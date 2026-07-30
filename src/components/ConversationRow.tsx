import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing, typography } from "../theme";
import type { Conversation } from "../types/messaging";
import { formatConversationTime } from "../utils/date";

interface ConversationRowProps {
  conversation: Conversation;
}

export function ConversationRow({ conversation }: ConversationRowProps) {
  const unreadLabel = conversation.unreadCount
    ? `${conversation.unreadCount} message${conversation.unreadCount > 1 ? "s" : ""} non lu${conversation.unreadCount > 1 ? "s" : ""}`
    : "Aucun message non lu";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${conversation.name}. ${conversation.lastMessage ?? "Aucun message"}. ${unreadLabel}`}
      accessibilityHint="Ouvre la conversation"
      onPress={() => router.push(`/chat/${conversation.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatar} accessibilityElementsHidden>
        {conversation.avatarUrl ? (
          <Image
            source={{ uri: conversation.avatarUrl }}
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
            size={22}
            color={colors.primary}
          />
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.name}
          </Text>
          <Text style={styles.time}>
            {formatConversationTime(conversation.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.bottomLine}>
          <Text style={styles.preview} numberOfLines={1}>
            {conversation.lastMessage ?? "Aucun message"}
          </Text>
          {conversation.unreadCount > 0 ? (
            <View style={styles.unread} accessibilityElementsHidden>
              <Text style={styles.unreadText}>
                {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
              </Text>
            </View>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 80,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarImage: { width: "100%", height: "100%" },
  content: { flex: 1, gap: 6 },
  topLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  name: { ...typography.heading3, color: colors.text, flex: 1 },
  time: { ...typography.caption, color: colors.textMuted },
  bottomLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  preview: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  unread: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  unreadText: { color: colors.white, fontSize: 11, fontWeight: "900" }
});
