import * as Crypto from "expo-crypto";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { env } from "../config/env";
import { capabilitiesForBackendContract } from "../config/backendCapabilities";
import { members as initialMembers } from "../data/mockData";
import {
  callHistory as initialCallHistory,
  highlightPosts as initialPosts,
  mapMoments as initialMapMoments,
  privateConversations,
  privateMessages
} from "../data/experienceMock";
import { NeptuneExperienceApi } from "../services/api/experienceApi";
import type {
  GroupDraft,
  HighlightKind,
  HighlightMedia,
  HighlightPost,
  MapMemberMoment,
  PrivateConversationDraft,
  QuickReaction
} from "../types/experience";
import type {
  AppUser,
  ChatMessage,
  Conversation,
  MessageAttachment,
  MessageReactionSummary
} from "../types/messaging";
import { useSession } from "./SessionProvider";

export const MAX_PRIVATE_PARTICIPANTS = 4;
export const MAX_PRIVATE_CONTACTS = MAX_PRIVATE_PARTICIPANTS - 1;

interface CreatePostInput {
  kind: HighlightKind;
  body: string;
  media?: HighlightMedia;
  mentionedUserIds?: string[];
  coordinates?: HighlightPost["coordinates"];
}

interface ExperienceContextValue {
  members: AppUser[];
  localConversations: Conversation[];
  localMessagesByConversation: Record<string, ChatMessage[]>;
  posts: HighlightPost[];
  mapMoments: MapMemberMoment[];
  callHistory: typeof initialCallHistory;
  getConversation: (conversationId: string) => Conversation | undefined;
  getConversationMessages: (conversationId: string) => ChatMessage[];
  decorateConversation: (conversation: Conversation) => Conversation;
  isConversationVisible: (conversation: Conversation) => boolean;
  createPrivateConversation: (draft: PrivateConversationDraft) => Conversation;
  sendLocalMessage: (
    conversationId: string,
    body: string,
    replyToMessage?: ChatMessage,
    attachments?: MessageAttachment[],
    mentionedUserIds?: string[]
  ) => Promise<boolean>;
  toggleConversationMuted: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  joinConversation: (conversationId: string) => Promise<void>;
  updateGroup: (conversationId: string, draft: GroupDraft) => void;
  getMessageReactions: (message: ChatMessage) => MessageReactionSummary[];
  toggleMessageReaction: (message: ChatMessage, emoji: string) => void;
  createPost: (input: CreatePostInput) => HighlightPost;
  togglePostReaction: (postId: string, emoji: QuickReaction) => void;
  addComment: (
    postId: string,
    body: string,
    parentCommentId?: string,
    mentionedUserIds?: string[]
  ) => void;
  toggleCommentReaction: (
    postId: string,
    commentId: string,
    emoji: QuickReaction
  ) => void;
  refreshExperience: () => Promise<void>;
  getMember: (memberId: string) => AppUser | undefined;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);
const BACKEND_CAPABILITIES = capabilitiesForBackendContract(env.backendContract);

function toggleReaction(
  reactions: readonly MessageReactionSummary[],
  emoji: string,
  currentUserId: string
): MessageReactionSummary[] {
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (!existing) {
    return [
      ...reactions,
      {
        emoji,
        count: 1,
        reactedByCurrentUser: true,
        userIds: [currentUserId]
      }
    ];
  }
  const nextCount = Math.max(
    0,
    existing.count + (existing.reactedByCurrentUser ? -1 : 1)
  );
  return reactions
    .map((reaction) =>
      reaction.emoji === emoji
        ? {
            ...reaction,
            count: nextCount,
            reactedByCurrentUser: !reaction.reactedByCurrentUser,
            userIds: reaction.reactedByCurrentUser
              ? reaction.userIds?.filter((id) => id !== currentUserId)
              : [...new Set([...(reaction.userIds ?? []), currentUserId])]
          }
        : reaction
    )
    .filter((reaction) => reaction.count > 0);
}

function sameParticipants(
  conversation: Conversation,
  participantIds: string[]
): boolean {
  if (!conversation.memberIds) return false;
  const existingIds = [...conversation.memberIds].sort();
  const requestedIds = [...participantIds].sort();
  return (
    existingIds.length === requestedIds.length &&
    existingIds.every((id, index) => id === requestedIds[index])
  );
}

function isLocalId(id: string): boolean {
  return id.startsWith("local-") || id.startsWith("mock-");
}

export function ExperienceProvider({ children }: PropsWithChildren) {
  const { currentUser, accessToken } = useSession();
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneExperienceApi(accessToken)),
    [accessToken]
  );
  const [members, setMembers] = useState<AppUser[]>(initialMembers);
  const [localConversations, setLocalConversations] = useState<Conversation[]>(
    env.mockMode ? privateConversations : []
  );
  const [localMessagesByConversation, setLocalMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >(env.mockMode ? privateMessages : {});
  const [mutedConversationIds, setMutedConversationIds] = useState<Set<string>>(
    new Set()
  );
  const [leftConversationIds, setLeftConversationIds] = useState<Set<string>>(
    new Set()
  );
  const [conversationOverrides, setConversationOverrides] = useState<
    Record<string, Partial<Conversation>>
  >({});
  const [messageReactionOverrides, setMessageReactionOverrides] = useState<
    Record<string, MessageReactionSummary[]>
  >({});
  const [posts, setPosts] = useState<HighlightPost[]>(
    env.mockMode ? initialPosts : []
  );
  const [mapMoments, setMapMoments] = useState<MapMemberMoment[]>(
    env.mockMode ? initialMapMoments : []
  );

  const refreshExperience = useCallback(async () => {
    if (!api) return;
    const [memberResult, highlightResult, mapResult] = await Promise.allSettled([
      api.listMembers(),
      api.listHighlights(),
      BACKEND_CAPABILITIES.highlightsCommunity
        ? api.listMapMoments()
        : Promise.resolve([])
    ]);
    if (memberResult.status === "fulfilled") {
      setMembers(memberResult.value);
    }
    if (highlightResult.status === "fulfilled") {
      setPosts(highlightResult.value.items);
    }
    if (mapResult.status === "fulfilled") {
      setMapMoments(mapResult.value);
    }
  }, [api]);

  useEffect(() => {
    void refreshExperience();
  }, [refreshExperience]);

  const decorateConversation = useCallback(
    (conversation: Conversation): Conversation => ({
      ...conversation,
      ...(conversationOverrides[conversation.id] ?? {}),
      muted: mutedConversationIds.has(conversation.id),
      left: leftConversationIds.has(conversation.id)
    }),
    [conversationOverrides, leftConversationIds, mutedConversationIds]
  );

  const isConversationVisible = useCallback(
    (conversation: Conversation) => {
      if (!leftConversationIds.has(conversation.id)) return true;
      return conversation.type !== "direct" && conversation.type !== "small_group";
    },
    [leftConversationIds]
  );

  const getConversation = useCallback(
    (conversationId: string) => {
      const conversation = localConversations.find(
        (item) => item.id === conversationId
      );
      return conversation ? decorateConversation(conversation) : undefined;
    },
    [decorateConversation, localConversations]
  );

  const getConversationMessages = useCallback(
    (conversationId: string) => localMessagesByConversation[conversationId] ?? [],
    [localMessagesByConversation]
  );

  const createPrivateConversation = useCallback(
    (draft: PrivateConversationDraft): Conversation => {
      const uniqueIds = [
        ...new Set(draft.memberIds.map((id) => id.trim()).filter(Boolean))
      ].filter((id) => id !== currentUser.id);
      if (uniqueIds.length < 1 || uniqueIds.length > MAX_PRIVATE_CONTACTS) {
        throw new Error(
          `Une conversation privée accepte ${MAX_PRIVATE_PARTICIPANTS} participants au total, vous compris.`
        );
      }
      const participantIds = [currentUser.id, ...uniqueIds];
      const existingConversation = localConversations.find(
        (conversation) =>
          (conversation.type === "direct" ||
            conversation.type === "small_group") &&
          sameParticipants(conversation, participantIds)
      );
      if (existingConversation) return existingConversation;
      const selectedMembers = uniqueIds
        .map((id) => members.find((member) => member.id === id))
        .filter((member): member is AppUser => Boolean(member));
      if (selectedMembers.length !== uniqueIds.length) {
        throw new Error("Un membre sélectionné est introuvable.");
      }
      const type = selectedMembers.length === 1 ? "direct" : "small_group";
      const conversation: Conversation = {
        id: `local-${Crypto.randomUUID()}`,
        name:
          draft.name?.trim() ||
          selectedMembers.map((member) => member.name.split(" ")[0]).join(", "),
        description:
          type === "direct"
            ? "Conversation privée"
            : `Mini-groupe privé · ${participantIds.length}/${MAX_PRIVATE_PARTICIPANTS} participants`,
        categoryLabel: type === "direct" ? "Privé" : "Mini-groupe",
        type,
        memberCount: participantIds.length,
        unreadCount: 0,
        restricted: false,
        canPost: true,
        canManage: true,
        ownerId: currentUser.id,
        adminIds: [currentUser.id],
        memberIds: participantIds
      };
      setLocalConversations((previous) => [conversation, ...previous]);
      setLocalMessagesByConversation((previous) => ({
        ...previous,
        [conversation.id]: []
      }));
      return conversation;
    },
    [currentUser.id, localConversations, members]
  );

  const sendLocalMessage = useCallback(
    async (
      conversationId: string,
      body: string,
      replyToMessage?: ChatMessage,
      attachments: MessageAttachment[] = [],
      mentionedUserIds: string[] = []
    ): Promise<boolean> => {
      const cleanBody = body.trim();
      const conversation = localConversations.find(
        (item) => item.id === conversationId
      );
      if (
        !conversation ||
        (!cleanBody && attachments.length === 0) ||
        cleanBody.length > 4_000
      ) {
        return false;
      }
      const createdAt = new Date().toISOString();
      const message: ChatMessage = {
        id: `local-message-${Crypto.randomUUID()}`,
        clientMessageId: Crypto.randomUUID(),
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderInitials: currentUser.initials,
        senderAvatarUrl: currentUser.avatarUrl,
        body: cleanBody,
        createdAt,
        status: "sent",
        isMine: true,
        replyToMessageId: replyToMessage?.id,
        attachments,
        mentionedUserIds,
        replyPreview: replyToMessage
          ? {
              messageId: replyToMessage.id,
              senderName: replyToMessage.senderName,
              body: replyToMessage.body
            }
          : undefined
      };
      setLocalMessagesByConversation((previous) => ({
        ...previous,
        [conversationId]: [message, ...(previous[conversationId] ?? [])]
      }));
      setLocalConversations((previous) =>
        previous.map((item) =>
          item.id === conversationId
            ? {
                ...item,
                lastMessage:
                  cleanBody ||
                  (attachments.length === 1
                    ? `📎 ${attachments[0]?.name ?? "Pièce jointe"}`
                    : `📎 ${attachments.length} pièces jointes`),
                lastMessageAt: createdAt
              }
            : item
        )
      );
      return true;
    },
    [currentUser, localConversations]
  );

  const toggleConversationMuted = useCallback(
    (conversationId: string) => {
      let nextMuted = false;
      setMutedConversationIds((previous) => {
        const next = new Set(previous);
        if (next.has(conversationId)) next.delete(conversationId);
        else {
          next.add(conversationId);
          nextMuted = true;
        }
        return next;
      });
      if (api && !isLocalId(conversationId)) {
        void api
          .setConversationMuted(conversationId, nextMuted)
          .catch(() => undefined);
      }
    },
    [api]
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      setLeftConversationIds((previous) => new Set(previous).add(conversationId));
      if (api && !isLocalId(conversationId)) {
        void api.leaveGroup(conversationId).catch(() =>
          setLeftConversationIds((previous) => {
            const next = new Set(previous);
            next.delete(conversationId);
            return next;
          })
        );
      }
    },
    [api]
  );

  const joinConversation = useCallback(
    async (conversationId: string) => {
      const wasLeft = leftConversationIds.has(conversationId);
      setLeftConversationIds((previous) => {
        const next = new Set(previous);
        next.delete(conversationId);
        return next;
      });
      if (api && !isLocalId(conversationId)) {
        try {
          await api.joinGroup(conversationId);
        } catch (error) {
          if (wasLeft) setLeftConversationIds((previous) => new Set(previous).add(conversationId));
          throw error;
        }
      }
    },
    [api, leftConversationIds]
  );

  const updateGroup = useCallback(
    (conversationId: string, draft: GroupDraft) => {
      const override: Partial<Conversation> = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        avatarUrl: draft.avatarUrl,
        iconName: draft.iconName,
        allowedRoles: draft.allowedRoles,
        restricted: true,
        canPost: draft.canMembersPost
      };
      setConversationOverrides((previous) => ({
        ...previous,
        [conversationId]: override
      }));
      setLocalConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, ...override }
            : conversation
        )
      );
      if (api && !isLocalId(conversationId)) {
        void api.updateGroup(conversationId, draft).catch(() => undefined);
      }
    },
    [api]
  );

  const getMessageReactions = useCallback(
    (message: ChatMessage) =>
      messageReactionOverrides[message.id] ?? message.reactions ?? [],
    [messageReactionOverrides]
  );

  const toggleMessageReaction = useCallback(
    (message: ChatMessage, emoji: string) => {
      const current = messageReactionOverrides[message.id] ?? message.reactions ?? [];
      const active =
        current.find((reaction) => reaction.emoji === emoji)
          ?.reactedByCurrentUser ?? false;
      setMessageReactionOverrides((previous) => ({
        ...previous,
        [message.id]: toggleReaction(
          previous[message.id] ?? message.reactions ?? [],
          emoji,
          currentUser.id
        )
      }));
      if (api && !isLocalId(message.id)) {
        void api.reactToMessage(message.id, emoji, !active).catch(() => undefined);
      }
    },
    [api, currentUser.id, messageReactionOverrides]
  );

  const createPost = useCallback(
    (input: CreatePostInput): HighlightPost => {
      const post: HighlightPost = {
        id: `post-${Crypto.randomUUID()}`,
        author: currentUser,
        kind: input.kind,
        body: input.body.trim(),
        createdAt: new Date().toISOString(),
        media: input.media,
        mentionedUserIds: input.mentionedUserIds,
        reactions: [],
        comments: [],
        shareCount: 0,
        coordinates: input.coordinates,
        syncedWithBusinessApp: input.kind === "besoin"
      };
      setPosts((previous) => [post, ...previous]);
      return post;
    },
    [currentUser]
  );

  const togglePostReaction = useCallback(
    (postId: string, emoji: QuickReaction) => {
      const post = posts.find((item) => item.id === postId);
      const active =
        post?.reactions.find((reaction) => reaction.emoji === emoji)
          ?.reactedByCurrentUser ?? false;
      setPosts((previous) =>
        previous.map((item) =>
          item.id === postId
            ? {
                ...item,
                reactions: toggleReaction(
                  item.reactions,
                  emoji,
                  currentUser.id
                ).map((reaction) => ({
                  emoji: reaction.emoji as QuickReaction,
                  count: reaction.count,
                  reactedByCurrentUser: reaction.reactedByCurrentUser
                }))
              }
            : item
        )
      );
      if (api && !isLocalId(postId) && !postId.startsWith("post-")) {
        void api.reactToHighlight(postId, emoji, !active).catch(() => undefined);
      }
    },
    [api, currentUser.id, posts]
  );

  const addComment = useCallback(
    (
      postId: string,
      body: string,
      parentCommentId?: string,
      mentionedUserIds?: string[]
    ) => {
      const cleanBody = body.trim();
      if (!cleanBody) return;
      const localCommentId = `comment-${Crypto.randomUUID()}`;
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: [
                  ...post.comments,
                  {
                    id: localCommentId,
                    postId,
                    author: currentUser,
                    body: cleanBody,
                    createdAt: new Date().toISOString(),
                    parentCommentId,
                    mentionedUserIds,
                    reactions: []
                  }
                ]
              }
            : post
        )
      );
      if (api && !isLocalId(postId) && !postId.startsWith("post-")) {
        void api
          .addComment(
            postId,
            cleanBody,
            parentCommentId,
            mentionedUserIds ?? []
          )
          .then((updatedPost) =>
            setPosts((previous) =>
              previous.map((post) =>
                post.id === postId ? updatedPost : post
              )
            )
          )
          .catch(() =>
            setPosts((previous) =>
              previous.map((post) =>
                post.id === postId
                  ? {
                      ...post,
                      comments: post.comments.filter(
                        (comment) => comment.id !== localCommentId
                      )
                    }
                  : post
              )
            )
          );
      }
    },
    [api, currentUser]
  );

  const toggleCommentReaction = useCallback(
    (postId: string, commentId: string, emoji: QuickReaction) => {
      const comment = posts
        .find((post) => post.id === postId)
        ?.comments.find((item) => item.id === commentId);
      const active =
        comment?.reactions.find((reaction) => reaction.emoji === emoji)
          ?.reactedByCurrentUser ?? false;
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.map((item) =>
                  item.id === commentId
                    ? {
                        ...item,
                        reactions: toggleReaction(
                          item.reactions,
                          emoji,
                          currentUser.id
                        ).map((reaction) => ({
                          emoji: reaction.emoji as QuickReaction,
                          count: reaction.count,
                          reactedByCurrentUser: reaction.reactedByCurrentUser
                        }))
                      }
                    : item
                )
              }
            : post
        )
      );
      if (api && !isLocalId(commentId) && !commentId.startsWith("comment-")) {
        void api.reactToComment(commentId, emoji, !active).catch(() => undefined);
      }
    },
    [api, currentUser.id, posts]
  );

  const value = useMemo<ExperienceContextValue>(
    () => ({
      members,
      localConversations: localConversations.map(decorateConversation),
      localMessagesByConversation,
      posts,
      mapMoments,
      callHistory: initialCallHistory,
      getConversation,
      getConversationMessages,
      decorateConversation,
      isConversationVisible,
      createPrivateConversation,
      sendLocalMessage,
      toggleConversationMuted,
      leaveConversation,
      joinConversation,
      updateGroup,
      getMessageReactions,
      toggleMessageReaction,
      createPost,
      togglePostReaction,
      addComment,
      toggleCommentReaction,
      refreshExperience,
      getMember: (memberId: string) =>
        members.find((member) => member.id === memberId)
    }),
    [
      addComment,
      createPost,
      createPrivateConversation,
      decorateConversation,
      getConversation,
      getConversationMessages,
      getMessageReactions,
      isConversationVisible,
      joinConversation,
      localConversations,
      localMessagesByConversation,
      mapMoments,
      members,
      posts,
      refreshExperience,
      sendLocalMessage,
      toggleCommentReaction,
      toggleConversationMuted,
      toggleMessageReaction,
      togglePostReaction,
      updateGroup
    ]
  );

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience(): ExperienceContextValue {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error("useExperience doit être utilisé dans ExperienceProvider.");
  }
  return context;
}
