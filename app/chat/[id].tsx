import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MessageBubble } from "../../src/components/MessageBubble";
import { useExperience } from "../../src/providers/ExperienceProvider";
import { useGroupAdmin } from "../../src/providers/GroupAdminProvider";
import { useMessaging } from "../../src/providers/MessagingProvider";
import { useSession } from "../../src/providers/SessionProvider";
import { colors, gradients, radii, spacing, typography } from "../../src/theme";
import type {
  AttachmentKind,
  ChatMessage,
  Conversation
} from "../../src/types/messaging";

const SUBMIT_LOCK_MS = 320;
const QUICK_REACTIONS = ["❤️", "🔥", "👏", "💡", "🤝", "😂"];
const ATTACHMENTS: Array<{
  kind: AttachmentKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { kind: "photo", label: "Photo", icon: "image-outline" },
  { kind: "video", label: "Vidéo", icon: "videocam-outline" },
  { kind: "document", label: "Document", icon: "document-text-outline" },
  { kind: "file", label: "Fichier", icon: "folder-open-outline" },
  { kind: "location", label: "Localisation", icon: "location-outline" },
  { kind: "contact", label: "Contact", icon: "person-add-outline" }
];

function isPrivateConversation(conversation: Conversation): boolean {
  return conversation.type === "direct" || conversation.type === "small_group";
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { currentUser } = useSession();
  const conversationId = Array.isArray(params.id)
    ? (params.id[0] ?? "")
    : (params.id ?? "");
  const {
    getConversation: getServerConversation,
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
  const {
    members,
    getConversation: getLocalConversation,
    getConversationMessages,
    decorateConversation,
    sendLocalMessage,
    getMessageReactions,
    toggleMessageReaction
  } = useExperience();
  const {
    getCreatedGroup,
    getCreatedGroupMessages,
    sendCreatedGroupMessage
  } = useGroupAdmin();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [reactionMessage, setReactionMessage] = useState<ChatMessage | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ kind: AttachmentKind; label: string }>
  >([]);
  const lastMarkedReadMessageId = useRef<string | null>(null);
  const submitLockRef = useRef(false);
  const submitUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const serverConversation = useMemo(
    () => getServerConversation(conversationId),
    [conversationId, getServerConversation]
  );
  const localConversation = useMemo(
    () => getLocalConversation(conversationId),
    [conversationId, getLocalConversation]
  );
  const createdGroup = useMemo(
    () => getCreatedGroup(conversationId),
    [conversationId, getCreatedGroup]
  );
  const rawConversation = serverConversation ?? localConversation ?? createdGroup;
  const conversation = rawConversation
    ? decorateConversation(rawConversation)
    : undefined;
  const source: "server" | "private" | "admin" = createdGroup
    ? "admin"
    : localConversation
      ? "private"
      : "server";
  const localOnly = source !== "server";
  const messages = useMemo(() => {
    if (source === "admin") return getCreatedGroupMessages(conversationId);
    if (source === "private") return getConversationMessages(conversationId);
    return getMessages(conversationId);
  }, [
    conversationId,
    getConversationMessages,
    getCreatedGroupMessages,
    getMessages,
    source
  ]);
  const loading = !localOnly && loadingConversationIds.has(conversationId);
  const loadingMore = !localOnly && loadingMoreConversationIds.has(conversationId);
  const hasMore = !localOnly && hasMoreMessages(conversationId);
  const latestMessageId = messages[0]?.id;
  const canSubmit = Boolean(
    conversation?.canPost &&
      (draft.trim() || pendingAttachments.length > 0) &&
      !submitting
  );

  const mentionQuery = useMemo(() => {
    const match = draft.match(/(?:^|\s)@([^\s@]*)$/u);
    return match?.[1]?.toLocaleLowerCase("fr") ?? null;
  }, [draft]);
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const allowedMemberIds = conversation?.memberIds;
    return members
      .filter((member) => member.id !== currentUser.id)
      .filter((member) =>
        allowedMemberIds?.length ? allowedMemberIds.includes(member.id) : true
      )
      .filter((member) =>
        [member.name, member.company]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(mentionQuery)
      )
      .slice(0, 4);
  }, [conversation?.memberIds, currentUser.id, members, mentionQuery]);

  const directMemberId = useMemo(() => {
    if (!conversation || conversation.type !== "direct") return undefined;
    return conversation.memberIds?.find(
      (memberId) => memberId !== currentUser.id
    );
  }, [conversation, currentUser.id]);

  const goBackToDiscussions = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/messages");
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (submitUnlockTimerRef.current) {
        clearTimeout(submitUnlockTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!conversationId || localOnly) return;
    lastMarkedReadMessageId.current = null;
    void loadMessages(conversationId);
  }, [conversationId, loadMessages, localOnly]);

  useEffect(() => {
    if (!conversationId || !latestMessageId || localOnly) return;
    if (lastMarkedReadMessageId.current === latestMessageId) return;
    lastMarkedReadMessageId.current = latestMessageId;
    void markConversationRead(conversationId);
  }, [conversationId, latestMessageId, localOnly, markConversationRead]);

  if (!conversation) {
    return (
      <LinearGradient colors={gradients.screen} style={styles.missing}>
        <Text accessibilityRole="header" style={styles.missingTitle}>
          Conversation introuvable
        </Text>
        <Text style={styles.missingText}>
          Elle a peut-être été supprimée, masquée par votre statut ou vous avez quitté le groupe.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Revenir aux discussions"
          onPress={goBackToDiscussions}
          style={styles.missingButton}
        >
          <Text style={styles.backLink}>Retour aux messages</Text>
        </Pressable>
      </LinearGradient>
    );
  }

  const openConversationDetails = () => {
    if (conversation.type === "direct" && directMemberId) {
      router.push(`/profile/${encodeURIComponent(directMemberId)}`);
      return;
    }
    const route = isPrivateConversation(conversation)
      ? `/conversation/${encodeURIComponent(conversation.id)}`
      : `/group/${encodeURIComponent(conversation.id)}`;
    router.push(route);
  };

  const openMemberProfile = (memberId: string) => {
    if (!memberId || memberId === currentUser.id) return;
    router.push(`/profile/${encodeURIComponent(memberId)}`);
  };

  const insertMention = (name: string) => {
    setDraft((current) => current.replace(/@[^\s@]*$/u, `@${name.split(" ")[0]} `));
  };

  const submit = () => {
    if (submitLockRef.current) return;
    const attachmentFallback = pendingAttachments
      .map((attachment) => `${attachment.label} jointe`)
      .join(", ");
    const body =
      draft.trim() || (attachmentFallback ? `📎 ${attachmentFallback}` : "");
    if (!conversation.canPost || !body) return;

    submitLockRef.current = true;
    setSubmitting(true);
    setDraft("");
    setPendingAttachments([]);

    const operation =
      source === "admin"
        ? sendCreatedGroupMessage(
            conversation.id,
            body,
            replyingTo ?? undefined
          )
        : source === "private"
          ? sendLocalMessage(
              conversation.id,
              body,
              replyingTo ?? undefined
            )
          : sendMessage(conversation.id, body, replyingTo?.id);
    setReplyingTo(null);

    submitUnlockTimerRef.current = setTimeout(() => {
      submitLockRef.current = false;
      submitUnlockTimerRef.current = null;
      if (mountedRef.current) setSubmitting(false);
    }, SUBMIT_LOCK_MS);

    void operation
      .then((accepted) => {
        if (!accepted && mountedRef.current) {
          setDraft((currentDraft) => currentDraft || body);
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setDraft((currentDraft) => currentDraft || body);
        }
      });
  };

  const connectionLabel = localOnly
    ? `${conversation.memberCount} membre${conversation.memberCount > 1 ? "s" : ""}`
    : connectionState === "online"
      ? `${conversation.memberCount} membre${conversation.memberCount > 1 ? "s" : ""}`
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
      <LinearGradient
        colors={[colors.navyLight, colors.background]}
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, spacing.sm),
            paddingLeft: spacing.sm + insets.left,
            paddingRight: spacing.sm + insets.right
          }
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour aux discussions"
          hitSlop={4}
          onPress={goBackToDiscussions}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={25} color={colors.white} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir les informations de ${conversation.name}`}
          onPress={openConversationDetails}
          style={styles.headerContent}
        >
          <Text
            accessibilityRole="header"
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {conversation.name}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            numberOfLines={2}
            style={styles.headerSubtitle}
          >
            {connectionLabel}
          </Text>
        </Pressable>
        {conversation.type === "direct" ? (
          <View style={styles.callActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Appeler en audio"
              onPress={() =>
                Alert.alert(
                  "Appel audio",
                  "Écran prêt. Le développeur doit brancher WebRTC ou le fournisseur d’appel."
                )
              }
              style={styles.callButton}
            >
              <Ionicons name="call-outline" size={20} color={colors.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Appeler en vidéo"
              onPress={() =>
                Alert.alert(
                  "Appel vidéo",
                  "Écran prêt. Le développeur doit brancher WebRTC ou le fournisseur d’appel."
                )
              }
              style={styles.callButton}
            >
              <Ionicons name="videocam-outline" size={21} color={colors.text} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ouvrir les paramètres du groupe"
            onPress={openConversationDetails}
            style={styles.headerButton}
          >
            <Ionicons
              name="information-circle-outline"
              size={23}
              color={colors.text}
            />
          </Pressable>
        )}
      </LinearGradient>

      {conversation.pinnedMessage ? (
        <View
          style={styles.pinned}
          accessibilityLabel={`Message épinglé. ${conversation.pinnedMessage}`}
        >
          <Ionicons name="pin" size={16} color={colors.orange} />
          <Text style={styles.pinnedText} numberOfLines={2}>
            {conversation.pinnedMessage}
          </Text>
        </View>
      ) : null}

      {lastError && !localOnly ? (
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
          <ActivityIndicator color={colors.violet} />
        </View>
      ) : (
        <FlatList
          accessibilityLabel={`Messages de ${conversation.name}`}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              reactions={getMessageReactions(item)}
              onRetry={(clientMessageId) => void retryMessage(clientMessageId)}
              onReactionRequest={setReactionMessage}
              onReply={setReplyingTo}
              onOpenProfile={openMemberProfile}
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
                <ActivityIndicator size="small" color={colors.violet} />
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
        <View
          style={[
            styles.composerArea,
            {
              paddingLeft: spacing.sm + insets.left,
              paddingRight: spacing.sm + insets.right,
              paddingBottom: Math.max(insets.bottom, spacing.sm)
            }
          ]}
        >
          {mentionSuggestions.length > 0 ? (
            <View style={styles.mentionSuggestions}>
              {mentionSuggestions.map((member) => (
                <Pressable
                  key={member.id}
                  onPress={() => insertMention(member.name)}
                  style={styles.mentionRow}
                >
                  <View style={styles.mentionAvatar}>
                    <Text style={styles.mentionInitials}>{member.initials}</Text>
                  </View>
                  <View style={styles.mentionContent}>
                    <Text style={styles.mentionName}>{member.name}</Text>
                    <Text style={styles.mentionCompany} numberOfLines={1}>
                      {member.company}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {replyingTo ? (
            <View style={styles.replyComposer}>
              <View style={styles.replyComposerAccent} />
              <View style={styles.replyComposerContent}>
                <Text style={styles.replyComposerTitle}>
                  Réponse à {replyingTo.senderName}
                </Text>
                <Text style={styles.replyComposerText} numberOfLines={1}>
                  {replyingTo.body}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Annuler la réponse"
                onPress={() => setReplyingTo(null)}
                style={styles.smallButton}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          ) : null}

          {pendingAttachments.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pendingAttachments}
            >
              {pendingAttachments.map((attachment, index) => (
                <View key={`${attachment.kind}-${index}`} style={styles.pendingChip}>
                  <Ionicons
                    name={
                      ATTACHMENTS.find(
                        (item) => item.kind === attachment.kind
                      )?.icon ?? "attach"
                    }
                    size={16}
                    color={colors.orange}
                  />
                  <Text style={styles.pendingText}>{attachment.label}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer ${attachment.label}`}
                    onPress={() =>
                      setPendingAttachments((previous) =>
                        previous.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                  >
                    <Ionicons
                      name="close-circle"
                      size={17}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.composer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ajouter une pièce jointe"
              onPress={() => setAttachmentMenuOpen(true)}
              style={styles.attachButton}
            >
              <Ionicons name="add" size={24} color={colors.text} />
            </Pressable>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              accessibilityLabel="Écrire un message"
              accessibilityHint="Utilisez arobase pour mentionner un membre"
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
              accessibilityState={{ disabled: !canSubmit, busy: submitting }}
              onPress={submit}
              style={({ pressed }) => [
                styles.sendButton,
                pressed && canSubmit && styles.sendPressed,
                !canSubmit && styles.sendDisabled
              ]}
              disabled={!canSubmit}
            >
              <LinearGradient colors={gradients.primary} style={styles.sendGradient}>
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="send" size={19} color={colors.white} />
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          accessible
          accessibilityLabel="Conversation en lecture seule"
          style={[
            styles.readOnly,
            {
              paddingLeft: spacing.md + insets.left,
              paddingRight: spacing.md + insets.right,
              paddingBottom: Math.max(insets.bottom, spacing.sm)
            }
          ]}
        >
          <Ionicons name="lock-closed" size={17} color={colors.textMuted} />
          <Text style={styles.readOnlyText}>
            Lecture seule — seuls les responsables autorisés peuvent publier.
          </Text>
        </View>
      )}

      <Modal
        transparent
        visible={attachmentMenuOpen}
        animationType="fade"
        onRequestClose={() => setAttachmentMenuOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAttachmentMenuOpen(false)}
        >
          <Pressable style={styles.attachmentSheet} onPress={() => undefined}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Ajouter au message</Text>
            <View style={styles.attachmentGrid}>
              {ATTACHMENTS.map((attachment) => (
                <Pressable
                  key={attachment.kind}
                  accessibilityRole="button"
                  onPress={() => {
                    setPendingAttachments((previous) => [
                      ...previous,
                      { kind: attachment.kind, label: attachment.label }
                    ]);
                    setAttachmentMenuOpen(false);
                  }}
                  style={styles.attachmentChoice}
                >
                  <LinearGradient
                    colors={gradients.activeTab}
                    style={styles.attachmentChoiceIcon}
                  >
                    <Ionicons
                      name={attachment.icon}
                      size={23}
                      color={colors.text}
                    />
                  </LinearGradient>
                  <Text style={styles.attachmentChoiceText}>{attachment.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.backendHint}>
              Les pickers natifs, la compression, la progression et l’upload privé sont prêts à être branchés sur ces actions.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={Boolean(reactionMessage)}
        animationType="fade"
        onRequestClose={() => setReactionMessage(null)}
      >
        <Pressable
          style={styles.reactionBackdrop}
          onPress={() => setReactionMessage(null)}
        >
          <Pressable style={styles.reactionBar} onPress={() => undefined}>
            {QUICK_REACTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Réagir avec ${emoji}`}
                onPress={() => {
                  if (reactionMessage) {
                    toggleMessageReaction(reactionMessage, emoji);
                  }
                  setReactionMessage(null);
                }}
                style={styles.reactionButton}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </Pressable>
            ))}
          </Pressable>
          <Pressable
            style={styles.replyAction}
            onPress={() => {
              setReplyingTo(reactionMessage);
              setReactionMessage(null);
            }}
          >
            <Ionicons name="return-up-forward" size={20} color={colors.text} />
            <Text style={styles.replyActionText}>Répondre à ce message</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center", gap: 4, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  headerButton: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerContent: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: "center" },
  headerTitle: { ...typography.heading3, color: colors.white },
  headerSubtitle: { ...typography.caption, color: colors.whiteMuted, marginTop: 1 },
  callActions: { flexDirection: "row", flexShrink: 0 },
  callButton: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  pinned: { flexDirection: "row", gap: spacing.sm, alignItems: "center", backgroundColor: colors.surfaceStrong, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  pinnedText: { ...typography.caption, color: colors.textSecondary, flex: 1, minWidth: 0 },
  errorBanner: { ...typography.bodySmall, color: colors.danger, backgroundColor: colors.dangerSoft, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  historyLoader: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  messages: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  empty: { ...typography.body, color: colors.textMuted, textAlign: "center", marginTop: 64 },
  composerArea: { paddingTop: 6, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 7 },
  attachButton: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.borderSoft },
  input: { flex: 1, minWidth: 0, minHeight: 46, maxHeight: 126, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: 11, color: colors.text, backgroundColor: colors.surfaceStrong, borderWidth: 1, borderColor: colors.borderSoft, ...typography.body },
  sendButton: { width: 46, height: 46, borderRadius: 17, overflow: "hidden", flexShrink: 0 },
  sendGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  sendPressed: { transform: [{ scale: 0.95 }] },
  sendDisabled: { opacity: 0.4 },
  readOnly: { minHeight: 64, paddingTop: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderSoft, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  readOnlyText: { ...typography.bodySmall, color: colors.textMuted, textAlign: "center", flexShrink: 1 },
  mentionSuggestions: { marginBottom: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, overflow: "hidden" },
  mentionRow: { minHeight: 50, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  mentionAvatar: { width: 32, height: 32, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  mentionInitials: { color: colors.text, fontSize: 10, fontWeight: "900" },
  mentionContent: { flex: 1, minWidth: 0 },
  mentionName: { color: colors.text, fontSize: 12, fontWeight: "900" },
  mentionCompany: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  replyComposer: { marginBottom: 6, padding: 8, borderRadius: 13, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 8 },
  replyComposerAccent: { width: 3, alignSelf: "stretch", borderRadius: 2, backgroundColor: colors.orange },
  replyComposerContent: { flex: 1, minWidth: 0 },
  replyComposerTitle: { color: colors.orange, fontSize: 10, fontWeight: "900" },
  replyComposerText: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  smallButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pendingAttachments: { gap: 6, paddingBottom: 6 },
  pendingChip: { minHeight: 34, paddingHorizontal: 9, borderRadius: 17, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 6 },
  pendingText: { color: colors.textSecondary, fontSize: 11, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  attachmentSheet: { width: "100%", maxWidth: 640, alignSelf: "center", padding: spacing.md, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, alignSelf: "center", backgroundColor: colors.border, marginBottom: spacing.md },
  sheetTitle: { ...typography.heading2, color: colors.text, textAlign: "center", marginBottom: spacing.md },
  attachmentGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 18 },
  attachmentChoice: { width: "31%", minHeight: 86, alignItems: "center", justifyContent: "center", gap: 7 },
  attachmentChoiceIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  attachmentChoiceText: { color: colors.textSecondary, fontSize: 11, fontWeight: "800", textAlign: "center" },
  backendHint: { ...typography.caption, color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
  reactionBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.64)", alignItems: "center", justifyContent: "center", padding: spacing.md },
  reactionBar: { paddingHorizontal: 8, minHeight: 58, borderRadius: 29, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center" },
  reactionButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  reactionEmoji: { fontSize: 25 },
  replyAction: { marginTop: 12, minHeight: 50, paddingHorizontal: spacing.md, borderRadius: 17, backgroundColor: colors.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 10 },
  replyActionText: { color: colors.text, fontWeight: "800" },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  missingTitle: { ...typography.heading2, color: colors.text, textAlign: "center" },
  missingText: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 420 },
  missingButton: { minWidth: 150, minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 16, backgroundColor: colors.primarySoft },
  backLink: { color: colors.text, fontWeight: "800" }
});
