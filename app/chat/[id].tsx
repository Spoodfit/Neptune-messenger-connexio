import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useExperience } from "../../src/providers/ExperienceProvider";
import { useGroupAdmin } from "../../src/providers/GroupAdminProvider";
import { useMessaging } from "../../src/providers/MessagingProvider";
import { useSession } from "../../src/providers/SessionProvider";
import { colors, gradients, spacing, typography } from "../../src/theme";
import type { ChatMessage } from "../../src/types/messaging";
import ChatConversationScreen from "./ChatConversationScreen";

function first(value?: string | string[]): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function messageMentionsUser(message: ChatMessage, user: { id: string; name: string; company: string }): boolean {
  if (message.isMine) return false;
  if (message.mentionedUserIds?.includes(user.id)) return true;
  const body = message.body.toLocaleLowerCase("fr");
  const [firstName = "", ...rest] = user.name.toLocaleLowerCase("fr").trim().split(/\s+/);
  const aliases = [firstName, rest.join(" "), user.name.toLocaleLowerCase("fr"), user.company.toLocaleLowerCase("fr")].filter(Boolean);
  return aliases.some((alias) => body.includes(`@${alias}`));
}

export default function ChatRoute() {
  const params = useLocalSearchParams<{ id: string | string[]; focusMention?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const conversationId = first(params.id);
  const focusMention = first(params.focusMention) === "1";
  const { currentUser } = useSession();
  const {
    getConversation: getServerConversation,
    getMessages: getServerMessages,
    loadMessages,
    loadMoreMessages,
    hasMoreMessages,
    loadingConversationIds,
    loadingMoreConversationIds,
    markConversationRead
  } = useMessaging();
  const { getConversation: getLocalConversation, getConversationMessages } = useExperience();
  const { getCreatedGroup, getCreatedGroupMessages } = useGroupAdmin();

  const serverConversation = getServerConversation(conversationId);
  const privateConversation = getLocalConversation(conversationId);
  const adminConversation = getCreatedGroup(conversationId);
  const conversation = serverConversation ?? privateConversation ?? adminConversation;
  const source = adminConversation ? "admin" : privateConversation ? "private" : "server";
  const localOnly = source !== "server";
  const messages = source === "admin"
    ? getCreatedGroupMessages(conversationId)
    : source === "private"
      ? getConversationMessages(conversationId)
      : getServerMessages(conversationId);
  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    [messages]
  );
  const mentionIndex = useMemo(() => {
    for (let index = sortedMessages.length - 1; index >= 0; index -= 1) {
      if (messageMentionsUser(sortedMessages[index]!, currentUser)) return index;
    }
    return -1;
  }, [currentUser, sortedMessages]);
  const mentionMessage = mentionIndex >= 0 ? sortedMessages[mentionIndex] : undefined;
  const contextMessages = mentionIndex >= 0
    ? sortedMessages.slice(Math.max(0, mentionIndex - 2), Math.min(sortedMessages.length, mentionIndex + 3))
    : [];
  const loading = loadingConversationIds.has(conversationId);
  const loadingMore = loadingMoreConversationIds.has(conversationId);
  const hasMore = hasMoreMessages(conversationId);

  useEffect(() => {
    if (!focusMention || localOnly || !conversationId) return;
    if (messages.length === 0 && !loading) void loadMessages(conversationId);
  }, [conversationId, focusMention, loadMessages, loading, localOnly, messages.length]);

  useEffect(() => {
    if (!focusMention || localOnly || !conversationId || mentionMessage || loading || loadingMore || !hasMore) return;
    void loadMoreMessages(conversationId);
  }, [conversationId, focusMention, hasMore, loadMoreMessages, loading, loadingMore, localOnly, mentionMessage]);

  useEffect(() => {
    if (!focusMention || localOnly || !conversationId || messages.length === 0) return;
    void markConversationRead(conversationId);
  }, [conversationId, focusMention, localOnly, markConversationRead, messages.length]);

  if (!focusMention || (!mentionMessage && !loading && !loadingMore && !hasMore)) {
    return <ChatConversationScreen />;
  }

  const openRecentMessages = () => {
    router.replace({ pathname: "/chat/[id]", params: { id: conversationId } });
  };

  return (
    <LinearGradient colors={gradients.screen} style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm), paddingLeft: spacing.sm + insets.left, paddingRight: spacing.sm + insets.right }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour aux discussions" onPress={() => router.replace("/(tabs)/messages")} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>{conversation?.name ?? "Conversation"}</Text>
          <Text style={styles.headerSubtitle}>Mention retrouvée</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Afficher les messages récents" onPress={openRecentMessages} style={styles.headerButton}>
          <Ionicons name="arrow-down-circle-outline" size={24} color={colors.text} />
        </Pressable>
      </View>

      {!mentionMessage ? (
        <View style={styles.loadingStage}>
          <ActivityIndicator size="large" color={colors.violet} />
          <Text style={styles.loadingTitle}>Recherche de votre mention…</Text>
          <Text style={styles.loadingText}>Connexio remonte automatiquement dans l’historique.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]} showsVerticalScrollIndicator={false}>
          <View style={styles.focusIntro}>
            <View style={styles.mentionIcon}><Ionicons name="at" size={24} color={colors.orange} /></View>
            <View style={styles.focusCopy}>
              <Text style={styles.focusTitle}>Vous avez été mentionné ici</Text>
              <Text style={styles.focusSubtitle}>Le message est affiché avec son contexte immédiat, même s’il est ancien.</Text>
            </View>
          </View>

          <View style={styles.contextStack}>
            {contextMessages.map((message) => {
              const focused = message.id === mentionMessage.id;
              return (
                <View key={message.id} style={[styles.messageCard, focused && styles.focusedMessageCard]}>
                  <View style={styles.messageTop}>
                    <Text style={[styles.sender, focused && styles.focusedSender]}>{message.senderName}</Text>
                    <Text style={styles.date}>{new Date(message.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</Text>
                  </View>
                  <Text selectable style={styles.body}>{message.body}</Text>
                  {message.attachments?.length ? <View style={styles.attachmentHint}><Ionicons name="attach" size={14} color={colors.textMuted} /><Text style={styles.attachmentText}>{message.attachments.length} pièce{message.attachments.length > 1 ? "s" : ""} jointe{message.attachments.length > 1 ? "s" : ""}</Text></View> : null}
                  {focused ? <View style={styles.focusBadge}><Ionicons name="at" size={13} color={colors.orange} /><Text style={styles.focusBadgeText}>Votre mention</Text></View> : null}
                </View>
              );
            })}
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir la discussion et répondre" onPress={openRecentMessages} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.white} />
            <Text style={styles.primaryActionText}>Ouvrir la discussion et répondre</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Afficher les messages récents" onPress={openRecentMessages} style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}>
            <Ionicons name="arrow-down" size={18} color={colors.textSecondary} />
            <Text style={styles.secondaryActionText}>Revenir aux messages récents</Text>
          </Pressable>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 64, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", gap: 8 },
  headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1, minWidth: 0, alignItems: "center" },
  headerTitle: { ...typography.heading3, color: colors.text, textAlign: "center" },
  headerSubtitle: { color: colors.orange, fontSize: 10, fontWeight: "900", marginTop: 2 },
  loadingStage: { flex: 1, padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingTitle: { ...typography.heading3, color: colors.text, textAlign: "center" },
  loadingText: { ...typography.bodySmall, color: colors.textMuted, textAlign: "center" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: spacing.md },
  focusIntro: { minHeight: 76, padding: 13, borderRadius: 20, borderWidth: 1, borderColor: "rgba(244,177,131,0.30)", backgroundColor: "rgba(244,177,131,0.08)", flexDirection: "row", alignItems: "center", gap: 12 },
  mentionIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: "rgba(244,177,131,0.12)", alignItems: "center", justifyContent: "center" },
  focusCopy: { flex: 1 },
  focusTitle: { ...typography.heading3, color: colors.text },
  focusSubtitle: { ...typography.bodySmall, color: colors.textMuted, marginTop: 3 },
  contextStack: { marginTop: spacing.md, gap: 9 },
  messageCard: { padding: 13, borderRadius: 18, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  focusedMessageCard: { borderColor: colors.orange, backgroundColor: "rgba(244,177,131,0.09)", shadowColor: colors.orange, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  messageTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  sender: { flex: 1, color: colors.textSecondary, fontSize: 11, fontWeight: "900" },
  focusedSender: { color: colors.orange },
  date: { color: colors.textMuted, fontSize: 10 },
  body: { color: colors.text, fontSize: 15, lineHeight: 21, marginTop: 7 },
  attachmentHint: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 5 },
  attachmentText: { color: colors.textMuted, fontSize: 10 },
  focusBadge: { alignSelf: "flex-start", minHeight: 28, marginTop: 10, paddingHorizontal: 9, borderRadius: 14, backgroundColor: "rgba(244,177,131,0.12)", flexDirection: "row", alignItems: "center", gap: 5 },
  focusBadgeText: { color: colors.orange, fontSize: 10, fontWeight: "900" },
  primaryAction: { minHeight: 54, marginTop: spacing.lg, borderRadius: 18, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryActionText: { color: colors.white, fontSize: 13, fontWeight: "900" },
  secondaryAction: { minHeight: 50, marginTop: 8, borderRadius: 17, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryActionText: { color: colors.textSecondary, fontSize: 12, fontWeight: "800" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] }
});
