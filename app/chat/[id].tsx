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
import { env } from "../../src/config/env";
import { isPrivateConversation } from "../../src/domain/conversationFilter";
import { useExperience } from "../../src/providers/ExperienceProvider";
import { useGroupAdmin } from "../../src/providers/GroupAdminProvider";
import { useMessaging } from "../../src/providers/MessagingProvider";
import { useSession } from "../../src/providers/SessionProvider";
import { uploadMessageAttachment } from "../../src/services/api/uploadApi";
import { pickMessageAttachment } from "../../src/services/media/mediaPicker";
import { colors, gradients, radii, spacing, typography } from "../../src/theme";
import type {
  AttachmentKind,
  ChatMessage,
  Conversation,
  MessageAttachment
} from "../../src/types/messaging";

const QUICK_REACTIONS = ["❤️", "🔥", "👏", "💡", "🤝", "😂"];
const SUBMIT_LOCK_MS = 800;

const ATTACHMENTS: Array<{
  kind: AttachmentKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { kind: "photo", label: "Photo", icon: "image-outline" },
  { kind: "video", label: "Vidéo", icon: "videocam-outline" },
  { kind: "document", label: "Document", icon: "document-text-outline" },
  { kind: "file", label: "Fichier", icon: "folder-open-outline" },
  { kind: "location", label: "Localisation", icon: "location-outline" }
];

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const conversationId = Array.isArray(params.id)
    ? (params.id[0] ?? "")
    : (params.id ?? "");
  const { currentUser } = useSession();
  const {
    getConversation: getServerConversation,
    getMessages: getServerMessages,
    loadMessages,
    loadMoreMessages,
    hasMoreMessages,
    loadingConversationIds,
    loadingMoreConversationIds,
    sendMessage,
    retryMessage,
    markConversationRead,
    connectionState,
    lastError
  } = useMessaging();
  const {
    members,
    getConversation: getLocalConversation,
    getConversationMessages,
    sendLocalMessage,
    getMessageReactions,
    toggleMessageReaction
  } = useExperience();
  const {
    getCreatedGroup,
    getCreatedGroupMessages,
    sendCreatedGroupMessage
  } = useGroupAdmin();

  const serverConversation = getServerConversation(conversationId);
  const privateConversation = getLocalConversation(conversationId);
  const adminConversation = getCreatedGroup(conversationId);
  const conversation =
    serverConversation ?? privateConversation ?? adminConversation;
  const source = adminConversation
    ? "admin"
    : privateConversation
      ? "private"
      : "server";
  const localOnly = source !== "server";
  const messages =
    source === "admin"
      ? getCreatedGroupMessages(conversationId)
      : source === "private"
        ? getConversationMessages(conversationId)
        : getServerMessages(conversationId);
  const loading = loadingConversationIds.has(conversationId);
  const loadingMore = loadingMoreConversationIds.has(conversationId);
  const hasMore = hasMoreMessages(conversationId);
  const latestMessageId = messages[0]?.id;
  const directMemberId = conversation?.memberIds?.find(
    (memberId) => memberId !== currentUser.id
  );

  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [reactionMessage, setReactionMessage] = useState<ChatMessage | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    MessageAttachment[]
  >([]);
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const mountedRef = useRef(true);
  const submitUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarkedReadMessageId = useRef<string | null>(null);

  const mentionQuery = useMemo(() => {
    const match = draft.match(/(?:^|\s)@([^\s@]*)$/u);
    return match?.[1]?.toLocaleLowerCase("fr") ?? null;
  }, [draft]);
  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    return members
      .filter((member) => member.id !== currentUser.id)
      .filter((member) =>
        [member.name, member.company]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(mentionQuery)
      )
      .slice(0, 5);
  }, [currentUser.id, members, mentionQuery]);
  const canSubmit = Boolean(
    conversation?.canPost &&
      !submitting &&
      (draft.trim() || pendingAttachments.length > 0)
  );

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
          Elle a peut-être été supprimée, masquée par votre statut ou vous avez
          quitté le groupe.
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
    setDraft((current) =>
      current.replace(/@[^\s@]*$/u, `@${name.split(" ")[0]} `)
    );
  };

  const addAttachment = async (kind: AttachmentKind) => {
    setAttachmentMenuOpen(false);
    try {
      const picked = await pickMessageAttachment(kind);
      if (!picked) return;
      setPendingAttachments((previous) => {
        const maxAttachments = 10;
        if (previous.length >= maxAttachments) {
          Alert.alert(
            "Limite atteinte",
            `Un message accepte au maximum ${maxAttachments} pièces jointes.`
          );
          return previous;
        }
        return [...previous, picked];
      });
    } catch (error) {
      Alert.alert(
        "Pièce jointe indisponible",
        error instanceof Error
          ? error.message
          : "Le contenu sélectionné n’a pas pu être ajouté."
      );
    }
  };

  const resolveMentionedUserIds = (value: string): string[] => {
    const normalized = value.toLocaleLowerCase("fr");
    return members
      .filter((member) => {
        const firstName =
          member.name.split(" ")[0]?.toLocaleLowerCase("fr") ?? "";
        return (
          (firstName && normalized.includes(`@${firstName}`)) ||
          normalized.includes(`@${member.name.toLocaleLowerCase("fr")}`) ||
          (member.company &&
            normalized.includes(`@${member.company.toLocaleLowerCase("fr")}`))
        );
      })
      .map((member) => member.id);
  };

  const submit = () => {
    if (submitLockRef.current || submitting) return;
    const body = draft.trim();
    if (!conversation.canPost || (!body && pendingAttachments.length === 0)) return;

    submitLockRef.current = true;
    setSubmitting(true);
    const originalDraft = draft;
    const originalAttachments = pendingAttachments;
    const originalReply = replyingTo;
    const mentionedUserIds = resolveMentionedUserIds(body);

    void (async () => {
      try {
        const readyAttachments: MessageAttachment[] = [];
        for (let index = 0; index < originalAttachments.length; index += 1) {
          const attachment = originalAttachments[index]!;
          if (env.mockMode || localOnly || attachment.status === "ready") {
            readyAttachments.push({
              ...attachment,
              status: "ready",
              uploadProgress: 1
            });
            continue;
          }
          setPendingAttachments((previous) =>
            previous.map((item) =>
              item.id === attachment.id
                ? { ...item, status: "uploading", uploadProgress: 0 }
                : item
            )
          );
          const uploaded = await uploadMessageAttachment(
            attachment,
            undefined,
            (progress) =>
              setPendingAttachments((previous) =>
                previous.map((item) =>
                  item.id === attachment.id
                    ? { ...item, status: "uploading", uploadProgress: progress }
                    : item
                )
              )
          );
          readyAttachments.push(uploaded);
        }

        const fallbackBody =
          body ||
          (readyAttachments.length === 1
            ? `📎 ${readyAttachments[0]?.name ?? "Pièce jointe"}`
            : `📎 ${readyAttachments.length} pièces jointes`);
        const accepted =
          source === "admin"
            ? await sendCreatedGroupMessage(
                conversation.id,
                fallbackBody,
                originalReply ?? undefined,
                readyAttachments,
                mentionedUserIds
              )
            : source === "private"
              ? await sendLocalMessage(
                  conversation.id,
                  fallbackBody,
                  originalReply ?? undefined,
                  readyAttachments,
                  mentionedUserIds
                )
              : await sendMessage(
                  conversation.id,
                  fallbackBody,
                  originalReply?.id,
                  readyAttachments,
                  mentionedUserIds
                );
        if (!accepted) throw new Error("Le message a été refusé.");
        if (mountedRef.current) {
          setDraft("");
          setPendingAttachments([]);
          setReplyingTo(null);
        }
      } catch (error) {
        if (mountedRef.current) {
          setDraft((current) => current || originalDraft);
          setPendingAttachments((current) =>
            current.length > 0 ? current : originalAttachments
          );
          setReplyingTo(originalReply);
          Alert.alert(
            "Envoi impossible",
            error instanceof Error
              ? error.message
              : "Le message n’a pas pu être envoyé."
          );
        }
      } finally {
        submitLockRef.current = false;
        if (mountedRef.current) setSubmitting(false);
      }
    })();
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
                router.push({
                  pathname: "/call/[id]",
                  params: { id: conversation.id, mode: "audio" }
                })
              }
              style={styles.callButton}
            >
              <Ionicons name="call-outline" size={20} color={colors.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Appeler en vidéo"
              onPress={() =>
                router.push({
                  pathname: "/call/[id]",
                  params: { id: conversation.id, mode: "video" }
                })
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
                  <Text style={styles.pendingText} numberOfLines={1}>
                    {attachment.name}
                    {attachment.status === "uploading"
                      ? ` · ${Math.round((attachment.uploadProgress ?? 0) * 100)} %`
                      : ""}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer ${attachment.name}`}
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
                  onPress={() => void addAttachment(attachment.kind)}
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
              Les contenus sont sélectionnés depuis l’appareil puis envoyés vers le
              stockage privé Neptune avec progression et reprise en cas d’échec.
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
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 72,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft
  },
  headerButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  headerContent: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 5
  },
  headerTitle: { ...typography.heading3, color: colors.text },
  headerSubtitle: { color: colors.textMuted, fontSize: 9.5, marginTop: 2 },
  callActions: { flexDirection: "row", gap: 3 },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
  pinned: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  pinnedText: { ...typography.bodySmall, color: colors.textSecondary, flex: 1 },
  errorBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center"
  },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  messages: {
    flexGrow: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md
  },
  historyLoader: { minHeight: 52, alignItems: "center", justifyContent: "center" },
  empty: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: "center",
    marginVertical: spacing.xl
  },
  composerArea: {
    paddingTop: 6,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft
  },
  mentionSuggestions: {
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    overflow: "hidden"
  },
  mentionRow: {
    minHeight: 50,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center"
  },
  mentionInitials: { color: colors.text, fontSize: 10, fontWeight: "900" },
  mentionContent: { flex: 1, minWidth: 0 },
  mentionName: { color: colors.text, fontSize: 12, fontWeight: "900" },
  mentionCompany: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  replyComposer: {
    marginBottom: 6,
    padding: 8,
    borderRadius: 13,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  replyComposerAccent: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: colors.orange
  },
  replyComposerContent: { flex: 1, minWidth: 0 },
  replyComposerTitle: { color: colors.orange, fontSize: 10, fontWeight: "900" },
  replyComposerText: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  smallButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pendingAttachments: { gap: 7, paddingBottom: 6 },
  pendingChip: {
    maxWidth: 250,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  pendingText: { color: colors.textSecondary, fontSize: 10, flexShrink: 1 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 7 },
  attachButton: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: colors.surfaceStrong,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    alignItems: "center",
    justifyContent: "center"
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    maxHeight: 122,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong,
    color: colors.text,
    ...typography.bodySmall
  },
  sendButton: { width: 46, height: 46, borderRadius: 17, overflow: "hidden" },
  sendGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  sendDisabled: { opacity: 0.4 },
  sendPressed: { transform: [{ scale: 0.95 }] },
  readOnly: {
    minHeight: 56,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  readOnlyText: { ...typography.bodySmall, color: colors.textMuted, flexShrink: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end"
  },
  attachmentSheet: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: "center",
    marginBottom: 14
  },
  sheetTitle: { ...typography.heading3, color: colors.text, textAlign: "center" },
  attachmentGrid: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10
  },
  attachmentChoice: {
    width: "30%",
    minWidth: 86,
    minHeight: 86,
    alignItems: "center",
    justifyContent: "center",
    gap: 7
  },
  attachmentChoiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  attachmentChoiceText: { color: colors.textSecondary, fontSize: 10, fontWeight: "800" },
  backendHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md
  },
  reactionBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md
  },
  reactionBar: {
    minHeight: 58,
    paddingHorizontal: 7,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center"
  },
  reactionButton: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  reactionEmoji: { fontSize: 23 },
  missing: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.md
  },
  missingTitle: { ...typography.heading2, color: colors.text, textAlign: "center" },
  missingText: { ...typography.body, color: colors.textMuted, textAlign: "center", maxWidth: 430 },
  missingButton: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  backLink: { color: colors.white, fontWeight: "900" }
});
