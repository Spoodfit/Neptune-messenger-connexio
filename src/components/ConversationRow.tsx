import { Text } from "@/components/LocalizedText";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";

import { env } from "../config/env";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { contentTranslationTargetsViewer, translatedContentField } from "../i18n/contentTranslation";
import { mockContentTranslation } from "../i18n/mockContentLookup";
import { useSession } from "../providers/SessionProvider";
import { useAppTheme } from "../providers/ThemeProvider";
import { colors, gradients, radii, spacing, typography } from "../theme";
import type { AppUser, Conversation } from "../types/messaging";
import { formatConversationTime } from "../utils/date";
import { MemberAvatarStack } from "./MemberAvatarStack";
import { PrivateConversationAvatar } from "./PrivateConversationAvatar";

interface ConversationRowProps {
  conversation: Conversation;
  members?: readonly AppUser[];
  mentioned?: boolean;
  muted?: boolean;
  pinned?: boolean;
  compact?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function ConversationRow({ conversation, members = [], mentioned = false, muted = false, pinned = false, compact = false, onPress, onLongPress }: ConversationRowProps) {
  const { currentUser } = useSession();
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const previewTranslation = contentTranslationTargetsViewer(conversation.translation)
    ? conversation.translation
    : env.mockMode
      ? mockContentTranslation(conversation.lastMessage, "lastMessage", conversation.sourceLanguage ?? "fr")
      : conversation.translation;
  const translatedLastMessage = translatedContentField(conversation.lastMessage, previewTranslation, "lastMessage") ?? conversation.lastMessage;
  const unreadLabel = conversation.unreadCount ? `${conversation.unreadCount} message${conversation.unreadCount > 1 ? "s" : ""} non lu${conversation.unreadCount > 1 ? "s" : ""}` : "Aucun message non lu";
  const privateConversation = conversation.type === "direct" || conversation.type === "small_group";
  const activeMemberIds = conversation.activeMemberIds?.length ? conversation.activeMemberIds : conversation.memberIds ?? [];
  const exactMemberCount = conversation.memberIds?.length ?? conversation.memberCount;
  const canSchedule = Boolean(conversation.canManage && !privateConversation);

  useEffect(() => setAvatarFailed(false), [conversation.avatarUrl]);
  useEffect(() => {
    if (!mentioned || reducedMotion) { pulse.stopAnimation(); pulse.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1150, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1150, useNativeDriver: true })
    ]));
    animation.start();
    return () => animation.stop();
  }, [mentioned, pulse, reducedMotion]);

  const borderOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.006] });
  const neutralBorder: readonly [string, string, string] = theme.isLight
    ? [theme.borderSoft, theme.borderSoft, theme.borderSoft]
    : [colors.borderSoft, colors.borderSoft, colors.borderSoft];
  const rowBorder: readonly [string, string, string] = mentioned
    ? [colors.primary, theme.violet, theme.orange]
    : neutralBorder;

  return (
    <Animated.View style={[styles.animatedWrap, compact && styles.compactWrap, { shadowColor: theme.shadow }, mentioned && { opacity: borderOpacity, transform: [{ scale }] }]}>
      <LinearGradient colors={rowBorder} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.border}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${conversation.name}. ${translatedLastMessage ?? "Aucun message"}. ${unreadLabel}${mentioned ? ". Vous avez été mentionné" : ""}${muted ? ". Conversation en sourdine" : ""}${pinned ? ". Conversation épinglée" : ""}`}
          accessibilityHint={onLongPress ? "Ouvre la conversation. Maintenir pour les paramètres rapides." : "Ouvre la conversation"}
          onPress={onPress ?? (() => router.push(`/chat/${encodeURIComponent(conversation.id)}`))}
          onLongPress={onLongPress}
          delayLongPress={420}
          style={({ pressed }) => [styles.row, compact && styles.compactRow, { backgroundColor: theme.surface }, pressed && styles.pressed]}
        >
          {privateConversation ? (
            <PrivateConversationAvatar conversation={conversation} members={members} currentUserId={currentUser.id} size={compact ? 44 : 50} />
          ) : (
            <LinearGradient colors={gradients.primaryWarm} style={[styles.avatarBorder, compact && styles.compactAvatarBorder]} accessibilityElementsHidden>
              <View style={[styles.avatar, { borderColor: theme.surface, backgroundColor: theme.surfaceStrong }]}>
                {conversation.avatarUrl && !avatarFailed ? <Image source={{ uri: conversation.avatarUrl }} onError={() => setAvatarFailed(true)} resizeMode="cover" style={styles.avatarImage} /> : <Ionicons name={conversation.type === "announcement" ? "megaphone" : conversation.type === "city" ? "location" : conversation.type === "role" ? "shield-checkmark" : conversation.type === "support" ? "construct" : "people"} size={compact ? 18 : 21} color={theme.pageText} />}
              </View>
            </LinearGradient>
          )}
          <View style={styles.content}>
            <View style={styles.topLine}>
              <Text style={[styles.name, compact && styles.compactName, { color: theme.pageText }]} numberOfLines={1}>{conversation.name}</Text>
              {pinned ? <Ionicons accessibilityElementsHidden name="pin" size={13} color={theme.violet} /> : null}
              {mentioned ? <View style={[styles.mentionPill, { backgroundColor: theme.orangeSoft, borderColor: theme.orange }]} accessibilityElementsHidden><Text style={[styles.mentionText, { color: theme.orange }]}>@</Text></View> : null}
              {muted ? <Ionicons accessibilityElementsHidden name="notifications-off-outline" size={14} color={theme.pageTextMuted} /> : null}
              <Text style={[styles.time, { color: theme.pageTextMuted }]} numberOfLines={1}>{formatConversationTime(conversation.lastMessageAt)}</Text>
            </View>
            <View style={styles.bottomLine}>
              <Text style={[styles.preview, compact && styles.compactPreview, { color: theme.pageTextMuted }]} numberOfLines={1}>{translatedLastMessage ?? "Aucun message"}</Text>
              {conversation.unreadCount > 0 ? <LinearGradient colors={[colors.primary, theme.violet]} style={styles.unread} accessibilityElementsHidden><Text style={styles.unreadText}>{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</Text></LinearGradient> : conversation.restricted ? <Ionicons accessibilityElementsHidden name="lock-closed" size={14} color={theme.pageTextMuted} /> : null}
            </View>
            {!privateConversation ? (
              <View style={styles.memberLine}>
                <MemberAvatarStack
                  memberIds={activeMemberIds}
                  members={members}
                  memberCount={exactMemberCount}
                  maxVisible={32}
                  size={compact ? 20 : 22}
                  showCount={false}
                  showOverflow={false}
                  activityFirst
                />
              </View>
            ) : null}
          </View>
          {canSchedule && !compact ? <Pressable accessibilityRole="button" accessibilityLabel={`Programmer un message dans ${conversation.name}`} onPress={(event) => { event.stopPropagation(); router.push(`/schedule-message/${encodeURIComponent(conversation.id)}`); }} style={({ pressed }) => [styles.scheduleButton, { borderColor: theme.orange, backgroundColor: theme.orangeSoft }, pressed && styles.schedulePressed]}><Ionicons name="calendar-outline" size={18} color={theme.orange} /></Pressable> : null}
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedWrap: { width: "100%", marginBottom: spacing.sm, borderRadius: radii.xl, shadowOpacity: 0.13, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  compactWrap: { marginBottom: 5, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  border: { width: "100%", padding: 1, borderRadius: radii.xl },
  row: { width: "100%", minHeight: 82, padding: 12, borderRadius: radii.xl - 1, flexDirection: "row", alignItems: "center", gap: 12 },
  compactRow: { minHeight: 68, paddingVertical: 7, paddingHorizontal: 9, gap: 9 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  avatarBorder: { width: 50, height: 50, padding: 2, borderRadius: 17, flexShrink: 0 },
  compactAvatarBorder: { width: 44, height: 44, borderRadius: 15 },
  avatar: { flex: 1, borderRadius: 15, overflow: "hidden", borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: "100%", height: "100%" },
  content: { flex: 1, minWidth: 0 },
  topLine: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 7 },
  name: { ...typography.heading3, flex: 1, minWidth: 0, fontWeight: "900" },
  compactName: { fontSize: 14, lineHeight: 17 },
  time: { ...typography.caption, flexShrink: 0, fontSize: 11 },
  bottomLine: { minWidth: 0, marginTop: 2, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  preview: { ...typography.bodySmall, flex: 1, minWidth: 0, fontSize: 14 },
  compactPreview: { fontSize: 14, lineHeight: 18 },
  memberLine: { minHeight: 22, marginTop: 3, flexDirection: "row", alignItems: "center", overflow: "hidden" },
  mentionPill: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  mentionText: { fontSize: 14, fontWeight: "900" },
  unread: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  unreadText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  scheduleButton: { width: 48, height: 48, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  schedulePressed: { opacity: 0.72, transform: [{ scale: 0.96 }] }
});
