import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { MessageBubble } from "../../src/components/MessageBubble";
import { useMessaging } from "../../src/providers/MessagingProvider";
import { colors, radii, spacing, typography } from "../../src/theme";

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const conversationId = Array.isArray(params.id)
    ? (params.id[0] ?? "")
    : (params.id ?? "");
  const {
    getConversation,
    getMessages,
    loadMessages,
    loadMoreMessages,
    hasMoreMessages,
    sendMessage,
    retryMessage,
    markConversationRead,
    loadingConversationIds,
    loadingMoreConversationIds,
    connectionState,
    lastError
  } = useMessaging();
  const [draft, setDraft] = useState("");
  const lastMarkedReadMessageId = useRef<string | null>(null);

  const conversation = useMemo(
    () => getConversation(conversationId),
    [conversationId, getConversation]
  );
  const messages = useMemo(
    () => getMessages(conversationId),
    [conversationId, getMessages]
  );
  const loading = loadingConversationIds.has(conversationId);
  const loadingMore = loadingMoreConversationIds.has(conversationId);
  const hasMore = hasMoreMessages(conversationId);
  const latestMessageId = messages[0]?.id;

  useEffect(() => {
    if (!conversationId) return;
    lastMarkedReadMessageId.current = null;
    void loadMessages(conversationId);
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (!conversationId || !latestMessageId) return;
    if (lastMarkedReadMessageId.current === latestMessageId) return;
    lastMarkedReadMessageId.current = latestMessageId;
    void markConversationRead(conversationId);
  }, [conversationId, latestMessageId, markConversationRead]);

  if (!conversation) {
    return (
      <View style={styles.missing}>
        <Text accessibilityRole="header" style={styles.missingTitle}>
          Conversation introuvable
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir aux discussions"
          onPress={() => router.back()}
          style={styles.missingButton}
        >
          <Text style={styles.backLink}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const submit = async () => {
    const body = draft.trim();
    if (!conversation.canPost || !body) return;
    setDraft("");
    const accepted = await sendMessage(conversation.id, body);
    if (!accepted) setDraft(body);
  };

  const connectionLabel =
    connectionState === "online"
      ? `${conversation.memberCount} membres`
      : connectionState === "connecting"
        ? "Connexion…"
        : conversation.canPost
          ? "Hors ligne — envois mis en attente"
          : "Hors ligne";

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour aux discussions"
          hitSlop={4}
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color={colors.white} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text accessibilityRole="header" style={styles.headerTitle} numberOfLines={1}>
            {conversation.name}
          </Text>
          <Text accessibilityLiveRegion="polite" style={styles.headerSubtitle}>
            {connectionLabel}
          </Text>
        </View>
      </View>

      {conversation.pinnedMessage ? (
        <View
          style={styles.pinned}
          accessibilityLabel={`Message épinglé. ${conversation.pinnedMessage}`}
        >
          <Ionicons name="pin" size={16} color={colors.primary} />
          <Text style={styles.pinnedText} numberOfLines={2}>
            {conversation.pinnedMessage}
          </Text>
        </View>
      ) : null}

      {lastError ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={styles.errorBanner}
        >
          {lastError}
        </Text>
      ) : null}

      {loading && messages.length === 0 ? (
        <View style={styles.loader} accessibilityLabel="Chargement des messages">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          accessibilityLabel={`Messages de ${conversation.name}`}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              onRetry={(clientMessageId) => void retryMessage(clientMessageId)}
            />
          )}
          contentContainerStyle={styles.messages}
          inverted
          keyboardShouldPersistTaps="handled"
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onEndReachedThreshold={0.25}
          onEndReached={() => {
            if (hasMore && !loadingMore) void loadMoreMessages(conversationId);
          }}
          ListFooterComponent={
            loadingMore ? (
              <View
                style={styles.historyLoader}
                accessibilityLabel="Chargement des messages précédents"
              >
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {conversation.canPost
                ? "Aucun message. Lancez la discussion."
                : "Aucun message publié dans cet espace."}
            </Text>
          }
        />
      )}

      {conversation.canPost ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            accessibilityLabel="Écrire un message"
            accessibilityHint="Le message sera placé en attente si la connexion est indisponible"
            placeholder="Écrire un message…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.input}
            maxLength={4_000}
            returnKeyType="default"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Envoyer le message"
            accessibilityState={{ disabled: !draft.trim() }}
            onPress={() => void submit()}
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendPressed,
              !draft.trim() && styles.sendDisabled
            ]}
            disabled={!draft.trim()}
          >
            <Ionicons name="send" size={19} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        <View
          accessible
          accessibilityLabel="Conversation en lecture seule"
          style={styles.readOnly}
        >
          <Ionicons name="lock-closed" size={17} color={colors.textMuted} />
          <Text style={styles.readOnlyText}>
            Lecture seule — seuls les responsables autorisés peuvent publier.
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: Platform.OS === "ios" ? 54 : 22,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.navy,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  headerContent: { flex: 1 },
  headerTitle: { ...typography.heading2, color: colors.white },
  headerSubtitle: { ...typography.caption, color: colors.whiteMuted, marginTop: 2 },
  pinned: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  pinnedText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  errorBanner: {
    ...typography.bodySmall,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  historyLoader: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  messages: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  empty: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 64
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.sm,
    paddingBottom: Platform.OS === "ios" ? 24 : spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 132,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.surfaceMuted,
    ...typography.body
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  sendPressed: { transform: [{ scale: 0.96 }] },
  sendDisabled: { opacity: 0.45 },
  readOnly: {
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingBottom: Platform.OS === "ios" ? 22 : spacing.sm,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  readOnlyText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    flexShrink: 1
  },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    backgroundColor: colors.background
  },
  missingTitle: { ...typography.heading2, color: colors.text },
  missingButton: {
    minWidth: 88,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  backLink: { color: colors.primary, fontWeight: "800" }
});
