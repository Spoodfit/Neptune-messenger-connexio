import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
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

import { EventVoteBanner } from "../../src/components/EventVoteBanner";
import { MemberAvatarStack } from "../../src/components/MemberAvatarStack";
import { MessageAttachmentsGrid } from "../../src/components/MessageAttachmentsGrid";
import { InlineVoiceRecorder } from "../../src/components/InlineVoiceRecorder";
import { MessageBubble } from "../../src/components/MessageBubble";
import { PollComposerModal } from "../../src/components/PollComposerModal";
import { env } from "../../src/config/env";
import { isPrivateConversation } from "../../src/domain/conversationFilter";
import {
  canInitiatePrivateInteraction,
  canPublishInConversation
} from "../../src/domain/accessPolicy";
import { buildSmartReplySuggestions } from "../../src/domain/smartReplies";
import { useExperience } from "../../src/providers/ExperienceProvider";
import { useGroupAdmin } from "../../src/providers/GroupAdminProvider";
import { useMessaging } from "../../src/providers/MessagingProvider";
import { useSession } from "../../src/providers/SessionProvider";
import { NeptuneMessagingApi } from "../../src/services/api/neptuneApi";
import { uploadMessageAttachment } from "../../src/services/api/uploadApi";
import {
  assertAttachmentBatch,
  MAX_MESSAGE_ATTACHMENTS,
  MAX_MESSAGE_BATCH_BYTES,
  pickMessageAttachments
} from "../../src/services/media/mediaPicker";
import { colors, gradients, radii, spacing, typography } from "../../src/theme";
import type {
  AttachmentKind,
  ChatMessage,
  CreatePollInput,
  MessageAttachment,
  MessagePoll
} from "../../src/types/messaging";

const SUBMIT_LOCK_MS = 800;
const ATTACHMENTS: Array<{
  kind: AttachmentKind;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { kind: "photo", label: "Photos", icon: "images-outline" },
  { kind: "video", label: "Vidéos", icon: "videocam-outline" },
  { kind: "document", label: "Documents", icon: "document-text-outline" },
  { kind: "file", label: "Fichiers", icon: "folder-open-outline" },
  { kind: "location", label: "Localisation", icon: "location-outline" }
];

function updateLocalPoll(
  poll: MessagePoll,
  optionId: string
): MessagePoll {
  const target = poll.options.find((option) => option.id === optionId);
  if (!target) return poll;
  const activating = !target.votedByCurrentUser;
  const options = poll.options.map((option) => {
    if (option.id === optionId) {
      return {
        ...option,
        votedByCurrentUser: activating,
        voteCount: Math.max(0, option.voteCount + (activating ? 1 : -1))
      };
    }
    if (!poll.allowMultiple && activating && option.votedByCurrentUser) {
      return {
        ...option,
        votedByCurrentUser: false,
        voteCount: Math.max(0, option.voteCount - 1)
      };
    }
    return option;
  });
  return {
    ...poll,
    options,
    totalVotes: options.reduce((sum, option) => sum + option.voteCount, 0)
  };
}

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const conversationId = Array.isArray(params.id)
    ? (params.id[0] ?? "")
    : (params.id ?? "");
  const { currentUser, accessToken } = useSession();
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
  const baseMessages =
    source === "admin"
      ? getCreatedGroupMessages(conversationId)
      : source === "private"
        ? getConversationMessages(conversationId)
        : getServerMessages(conversationId);
  const messagingApi = useMemo(
    () =>
      env.mockMode || localOnly
        ? null
        : new NeptuneMessagingApi(accessToken),
    [accessToken, localOnly]
  );
  const loading = loadingConversationIds.has(conversationId);
  const loadingMore = loadingMoreConversationIds.has(conversationId);
  const hasMore = hasMoreMessages(conversationId);
  const directMemberId = conversation?.memberIds?.find(
    (memberId) => memberId !== currentUser.id
  );
  const canPost = conversation
    ? canPublishInConversation(currentUser, conversation)
    : false;
  const canInitiateCalls = canInitiatePrivateInteraction(currentUser.role);
  const announcement = conversation?.type === "announcement";

  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [pollComposerOpen, setPollComposerOpen] = useState(false);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<
    MessageAttachment[]
  >([]);
  const [ephemeralMessages, setEphemeralMessages] = useState<ChatMessage[]>([]);
  const [pollOverrides, setPollOverrides] = useState<Record<string, MessagePoll>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const composerInputRef = useRef<TextInput>(null);
  const mountedRef = useRef(true);
  const submitUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMarkedReadMessageId = useRef<string | null>(null);

  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const message of [...ephemeralMessages, ...baseMessages]) {
      byId.set(message.id, {
        ...message,
        poll: pollOverrides[message.id] ?? message.poll
      });
    }
    return [...byId.values()].sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt)
    );
  }, [baseMessages, ephemeralMessages, pollOverrides]);
  const latestMessageId = messages[0]?.id;
  const memberCount =
    conversation?.memberIds?.length ?? conversation?.memberCount ?? 0;
  const activeMemberIds =
    conversation?.activeMemberIds?.length
      ? conversation.activeMemberIds
      : conversation?.memberIds ?? [];
  const pendingBytes = pendingAttachments.reduce(
    (sum, attachment) => sum + (attachment.sizeBytes ?? 0),
    0
  );

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
  const latestIncomingMessage = messages.find((message) => !message.isMine);
  const smartReplies = useMemo(
    () => buildSmartReplySuggestions(latestIncomingMessage, currentUser),
    [currentUser, latestIncomingMessage]
  );
  const canSubmit = Boolean(
    canPost &&
      !submitting &&
      (draft.trim() || pendingAttachments.length > 0)
  );
  const showSendButton = Boolean(
    submitting || draft.trim() || pendingAttachments.length > 0
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

  const useSmartReply = (reply: string) => {
    setDraft(reply);
    requestAnimationFrame(() => composerInputRef.current?.focus());
  };

  const appendPendingAttachment = (attachment: MessageAttachment) => {
    try {
      const next = [...pendingAttachments, attachment];
      assertAttachmentBatch(next);
      setPendingAttachments(next);
    } catch (error) {
      Alert.alert(
        "Vocal indisponible",
        error instanceof Error
          ? error.message
          : "Le message vocal ne peut pas être ajouté à cet envoi."
      );
    }
  };

  const sendRecordedVoice = async (attachment: MessageAttachment) => {
    setVoiceRecorderOpen(false);
    setSubmitting(true);
    const originalReply = replyingTo;
    try {
      const readyAttachment =
        env.mockMode || localOnly
? { ...attachment, status: "ready" as const, uploadProgress: 1 }
: await uploadMessageAttachment(attachment);
      const accepted =
        source === "admin"
? await sendCreatedGroupMessage(
    conversation.id,
    "🎙️ Message vocal",
    originalReply ?? undefined,
    [readyAttachment],
    []
  )
: source === "private"
  ? await sendLocalMessage(
      conversation.id,
      "🎙️ Message vocal",
      originalReply ?? undefined,
      [readyAttachment],
      []
    )
  : await sendMessage(
      conversation.id,
      "🎙️ Message vocal",
      originalReply?.id,
      [readyAttachment],
      []
    );
      if (!accepted) throw new Error("Le vocal a été refusé.");
      setReplyingTo(null);
    } catch (error) {
      appendPendingAttachment({ ...attachment, status: "failed" });
      Alert.alert(
        "Envoi du vocal impossible",
        `${error instanceof Error ? error.message : "Le vocal n’a pas été envoyé."} Il reste disponible dans le brouillon.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const addAttachment = async (kind: AttachmentKind) => {
    setAttachmentMenuOpen(false);
    try {
      const remaining = MAX_MESSAGE_ATTACHMENTS - pendingAttachments.length;
      if (remaining <= 0) {
        Alert.alert(
          "Limite atteinte",
          `${MAX_MESSAGE_ATTACHMENTS} contenus maximum par message.`
        );
        return;
      }
      const picked = await pickMessageAttachments(kind, remaining);
      if (picked.length === 0) return;
      const next = [...pendingAttachments, ...picked];
      assertAttachmentBatch(next);
      setPendingAttachments(next);
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
    if (!canPost || (!body && pendingAttachments.length === 0)) return;

    submitLockRef.current = true;
    setSubmitting(true);
    const originalDraft = draft;
    const originalAttachments = pendingAttachments;
    const originalReply = replyingTo;
    const mentionedUserIds = resolveMentionedUserIds(body);

    void (async () => {
      try {
        const readyAttachments: MessageAttachment[] = [];
        for (const attachment of originalAttachments) {
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
            ? readyAttachments[0]?.kind === "audio"
              ? "🎙️ Message vocal"
              : `📎 ${readyAttachments[0]?.name ?? "Pièce jointe"}`
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
        submitUnlockTimerRef.current = setTimeout(() => {
          submitLockRef.current = false;
        }, SUBMIT_LOCK_MS);
      }
    })();
  };

  const createPoll = async (input: CreatePollInput) => {
    try {
      let message: ChatMessage;
      if (messagingApi) {
        message = await messagingApi.createPoll(conversation.id, input);
      } else {
        const pollId = `local-poll-${Crypto.randomUUID()}`;
        message = {
          id: `local-poll-message-${Crypto.randomUUID()}`,
          conversationId: conversation.id,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderInitials: currentUser.initials,
          senderAvatarUrl: currentUser.avatarUrl,
          body: "",
          createdAt: new Date().toISOString(),
          status: "sent",
          isMine: true,
          poll: {
            id: pollId,
            question: input.question,
            options: input.options.map((label) => ({
              id: `${pollId}-${Crypto.randomUUID()}`,
              label,
              voteCount: 0,
              votedByCurrentUser: false
            })),
            allowMultiple: input.allowMultiple,
            anonymous: input.anonymous,
            totalVotes: 0,
            closesAt: input.closesAt
          }
        };
      }
      setEphemeralMessages((previous) => [message, ...previous]);
      if (!localOnly && !env.mockMode) void loadMessages(conversation.id);
    } catch (error) {
      Alert.alert(
        "Sondage impossible",
        error instanceof Error ? error.message : "Le sondage n’a pas été publié."
      );
      throw error;
    }
  };

  const votePoll = async (message: ChatMessage, optionId: string) => {
    if (!message.poll) return;
    const currentPoll = pollOverrides[message.id] ?? message.poll;
    const optimisticPoll = updateLocalPoll(currentPoll, optionId);
    const active = Boolean(
      optimisticPoll.options.find((option) => option.id === optionId)
        ?.votedByCurrentUser
    );

    setPollOverrides((previous) => ({
      ...previous,
      [message.id]: optimisticPoll
    }));

    if (!messagingApi || message.id.startsWith("local-")) return;

    try {
      const updatedMessage = await messagingApi.votePoll(
        message.id,
        optionId,
        active
      );
      if (!updatedMessage.poll) return;

      setPollOverrides((previous) => {
        if (previous[message.id] !== optimisticPoll) return previous;
        const serverPoll = updatedMessage.poll!;
        const optimisticById = new Map(
          optimisticPoll.options.map((option) => [option.id, option])
        );
        const options = serverPoll.options.map((serverOption) => {
          const optimisticOption = optimisticById.get(serverOption.id);
          if (!optimisticOption) return serverOption;
          const selected = optimisticOption.votedByCurrentUser;
          const serverSelected = serverOption.votedByCurrentUser;
          return {
            ...serverOption,
            votedByCurrentUser: selected,
            voteCount: Math.max(
              0,
              serverOption.voteCount +
                (selected && !serverSelected
                  ? 1
                  : !selected && serverSelected
                    ? -1
                    : 0)
            )
          };
        });
        const mergedPoll: MessagePoll = {
          ...serverPoll,
          allowMultiple: currentPoll.allowMultiple,
          options,
          totalVotes: options.reduce((sum, option) => sum + option.voteCount, 0)
        };
        return { ...previous, [message.id]: mergedPoll };
      });
    } catch (error) {
      setPollOverrides((previous) =>
        previous[message.id] === optimisticPoll
          ? { ...previous, [message.id]: currentPoll }
          : previous
      );
      Alert.alert(
        "Vote impossible",
        error instanceof Error
          ? error.message
          : "Le vote n’a pas été enregistré."
      );
    }
  };

  const connectionLabel = localOnly
    ? `${memberCount} membre${memberCount > 1 ? "s" : ""}`
    : connectionState === "online"
      ? `${memberCount} membre${memberCount > 1 ? "s" : ""}`
      : connectionState === "connecting"
        ? "Connexion…"
        : canPost
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
          {conversation.type === "direct" && canInitiateCalls ? (
            <Text numberOfLines={1} style={styles.headerSubtitle}>
              {connectionLabel}
            </Text>
          ) : (
            <View style={styles.headerMembers}>
              <MemberAvatarStack
                memberIds={activeMemberIds}
                members={members}
                memberCount={memberCount}
                maxVisible={4}
                size={20}
              />
              {connectionState !== "online" && !localOnly ? (
                <Text numberOfLines={1} style={styles.headerSubtitle}>
                  {connectionLabel}
                </Text>
              ) : null}
            </View>
          )}
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

      {conversation.eventVoteAlert ? (
        <EventVoteBanner alert={conversation.eventVoteAlert} />
      ) : null}

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
              onReact={(message, emoji) => toggleMessageReaction(message, emoji)}
              onReply={announcement ? undefined : setReplyingTo}
              centered={announcement}
              onOpenProfile={openMemberProfile}
              onVotePoll={votePoll}
            />
          )}
          style={styles.messageList}
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
              {canPost
                ? "Aucun message. Lancez la discussion."
                : "Aucun message publié dans cet espace."}
            </Text>
          }
        />
      )}

      {canPost ? (
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

          {smartReplies.length > 0 && !draft.trim() && !voiceRecorderOpen ? (
  <View style={styles.smartReplyPanel}>
    <View style={styles.smartReplyHeading}>
      <Ionicons name="sparkles" size={14} color={colors.orange} />
      <Text style={styles.smartReplyLabel}>Réponses suggérées</Text>
    </View>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.smartReplyRow}
    >
      {smartReplies.map((reply) => (
        <Pressable
          key={reply}
          accessibilityRole="button"
          accessibilityLabel={`Insérer la réponse : ${reply}`}
          onPress={() => useSmartReply(reply)}
          style={styles.smartReplyChip}
        >
          <Text style={styles.smartReplyText}>{reply}</Text>
        </Pressable>
      ))}
    </ScrollView>
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
            <View style={styles.pendingPreview}>
              <MessageAttachmentsGrid
                attachments={pendingAttachments}
                isMine
              />
              <View style={styles.pendingHeader}>
                <Text style={styles.pendingSummary}>
                  {pendingAttachments.length}/{MAX_MESSAGE_ATTACHMENTS} · {(
                    pendingBytes /
                    1024 /
                    1024
                  ).toFixed(1)} Mo / {Math.round(MAX_MESSAGE_BATCH_BYTES / 1024 / 1024)} Mo
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retirer toutes les pièces jointes"
                  onPress={() => setPendingAttachments([])}
                  style={styles.clearAttachments}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.danger} />
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pendingAttachments}
              >
                {pendingAttachments.map((attachment) => (
                  <Pressable
                    key={attachment.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Retirer ${attachment.name}`}
                    onPress={() =>
                      setPendingAttachments((previous) =>
                        previous.filter((item) => item.id !== attachment.id)
                      )
                    }
                    style={styles.pendingChip}
                  >
                    <Text style={styles.pendingText} numberOfLines={1}>
                      {attachment.kind === "audio" ? "Message vocal" : attachment.name}
                      {attachment.status === "uploading"
                        ? ` · ${Math.round((attachment.uploadProgress ?? 0) * 100)} %`
                        : ""}
                    </Text>
                    <Ionicons
                      name="close-circle"
                      size={17}
                      color={colors.textMuted}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {voiceRecorderOpen ? (
  <InlineVoiceRecorder
    onCancel={() => setVoiceRecorderOpen(false)}
    onRecorded={sendRecordedVoice}
  />
) : (
  <View style={styles.composer}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ajouter une pièce jointe ou un sondage"
      onPress={() => setAttachmentMenuOpen(true)}
      style={styles.attachButton}
    >
      <Ionicons name="add" size={24} color={colors.text} />
    </Pressable>
    <TextInput
      ref={composerInputRef}
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
    {showSendButton ? (
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
    ) : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enregistrer un message vocal"
        onPress={() => setVoiceRecorderOpen(true)}
        style={styles.voiceButton}
      >
        <LinearGradient colors={gradients.activeTab} style={styles.sendGradient}>
          <Ionicons name="mic" size={21} color={colors.text} />
        </LinearGradient>
      </Pressable>
    )}
  </View>
)}
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
        animationType="slide"
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
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enregistrer un message vocal"
                onPress={() => {
                  setAttachmentMenuOpen(false);
                  setVoiceRecorderOpen(true);
                }}
                style={styles.attachmentChoice}
              >
                <LinearGradient
                  colors={gradients.activeTab}
                  style={styles.attachmentChoiceIcon}
                >
                  <Ionicons name="mic-outline" size={23} color={colors.text} />
                </LinearGradient>
                <Text style={styles.attachmentChoiceText}>Vocal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Créer un sondage"
                onPress={() => {
                  setAttachmentMenuOpen(false);
                  setPollComposerOpen(true);
                }}
                style={styles.attachmentChoice}
              >
                <LinearGradient
                  colors={gradients.activeTab}
                  style={styles.attachmentChoiceIcon}
                >
                  <Ionicons name="stats-chart" size={23} color={colors.text} />
                </LinearGradient>
                <Text style={styles.attachmentChoiceText}>Sondage</Text>
              </Pressable>
            </View>
            <Text style={styles.backendHint}>
              Jusqu’à 10 contenus et 120 Mo par message. Les médias sont regroupés
              dans une grille compacte et restent téléchargeables.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>

      <PollComposerModal
        visible={pollComposerOpen}
        onClose={() => setPollComposerOpen(false)}
        onCreate={createPoll}
      />

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
  headerMembers: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: 6 },
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
  messageList: { flex: 1 },
  messages: {
    flexGrow: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    gap: 3
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
  smartReplyPanel: { marginBottom: 7 },
  smartReplyHeading: { minHeight: 24, flexDirection: "row", alignItems: "center", gap: 6 },
  smartReplyLabel: { color: colors.textSecondary, fontSize: 9.5, fontWeight: "900" },
  smartReplyRow: { gap: 7, paddingRight: 10 },
  smartReplyChip: {
    minHeight: 38,
    maxWidth: 260,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(107,79,234,0.34)",
    backgroundColor: colors.surfaceStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  smartReplyText: { color: colors.text, fontSize: 10.5, fontWeight: "800" },
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
  pendingPreview: {
    maxHeight: 270,
    marginBottom: 7,
    padding: 7,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    backgroundColor: colors.surfaceStrong
  },
  pendingHeader: {
    minHeight: 34,
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  pendingSummary: { flex: 1, color: colors.textMuted, fontSize: 9, fontWeight: "800" },
  clearAttachments: { width: 36, height: 34, alignItems: "center", justifyContent: "center" },
  pendingAttachments: { gap: 7, paddingTop: 4 },
  pendingChip: {
    maxWidth: 230,
    minHeight: 34,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  pendingText: { color: colors.textSecondary, fontSize: 9, flexShrink: 1 },
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
  voiceButton: {
    width: 46,
    height: 46,
    borderRadius: 17,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft
  },
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
