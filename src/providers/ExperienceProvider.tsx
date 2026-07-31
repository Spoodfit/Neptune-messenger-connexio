import * as Crypto from "expo-crypto";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

import { currentUser, members } from "../data/mockData";
import {
  callHistory as initialCallHistory,
  highlightPosts as initialPosts,
  mapMoments,
  privateConversations,
  privateMessages
} from "../data/experienceMock";
import type {
  GroupDraft,
  HighlightKind,
  HighlightMedia,
  HighlightPost,
  PrivateConversationDraft,
  QuickReaction
} from "../types/experience";
import type {
  AppUser,
  ChatMessage,
  Conversation,
  MessageReactionSummary
} from "../types/messaging";

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
  mapMoments: typeof mapMoments;
  callHistory: typeof initialCallHistory;
  getConversation: (conversationId: string) => Conversation | undefined;
  getConversationMessages: (conversationId: string) => ChatMessage[];
  decorateConversation: (conversation: Conversation) => Conversation;
  isConversationVisible: (conversation: Conversation) => boolean;
  createPrivateConversation: (draft: PrivateConversationDraft) => Conversation;
  sendLocalMessage: (
    conversationId: string,
    body: string,
    replyToMessage?: ChatMessage
  ) => Promise<boolean>;
  toggleConversationMuted: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
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
  getMember: (memberId: string) => AppUser | undefined;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function toggleReaction(
  reactions: readonly MessageReactionSummary[],
  emoji: string
): MessageReactionSummary[] {
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (!existing) {
    return [
      ...reactions,
      { emoji, count: 1, reactedByCurrentUser: true, userIds: [currentUser.id] }
    ];
  }
  const nextCount = Math.max(
    0,
    existing.count + (existing.reactedByCurrentUser ? -1 : 1)
  );
  const next = reactions
    .map((reaction) =>
      reaction.emoji === emoji
        ? {
            ...reaction,
            count: nextCount,
            reactedByCurrentUser: !reaction.reactedByCurrentUser
          }
        : reaction
    )
    .filter((reaction) => reaction.count > 0);
  return next;
}

export function ExperienceProvider({ children }: PropsWithChildren) {
  const [localConversations, setLocalConversations] = useState<Conversation[]>(
    privateConversations
  );
  const [localMessagesByConversation, setLocalMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >(privateMessages);
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
  const [posts, setPosts] = useState<HighlightPost[]>(initialPosts);

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
    (conversation: Conversation) => !leftConversationIds.has(conversation.id),
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
      const uniqueIds = [...new Set(draft.memberIds)].filter(
        (id) => id !== currentUser.id
      );
      if (uniqueIds.length < 1 || uniqueIds.length > 4) {
        throw new Error("Une conversation privée accepte entre 1 et 4 contacts.");
      }
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
            : `Mini-groupe privé · ${selectedMembers.length + 1} membres`,
        categoryLabel: type === "direct" ? "Privé" : "Mini-groupe",
        type,
        memberCount: selectedMembers.length + 1,
        unreadCount: 0,
        restricted: false,
        canPost: true,
        canManage: true,
        ownerId: currentUser.id,
        adminIds: [currentUser.id],
        memberIds: [currentUser.id, ...selectedMembers.map((member) => member.id)]
      };
      setLocalConversations((previous) => [conversation, ...previous]);
      setLocalMessagesByConversation((previous) => ({
        ...previous,
        [conversation.id]: []
      }));
      return conversation;
    },
    []
  );

  const sendLocalMessage = useCallback(
    async (
      conversationId: string,
      body: string,
      replyToMessage?: ChatMessage
    ): Promise<boolean> => {
      const cleanBody = body.trim();
      const conversation = localConversations.find(
        (item) => item.id === conversationId
      );
      if (!conversation || !cleanBody || cleanBody.length > 4_000) return false;
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
            ? { ...item, lastMessage: cleanBody, lastMessageAt: createdAt }
            : item
        )
      );
      return true;
    },
    [localConversations]
  );

  const toggleConversationMuted = useCallback((conversationId: string) => {
    setMutedConversationIds((previous) => {
      const next = new Set(previous);
      if (next.has(conversationId)) next.delete(conversationId);
      else next.add(conversationId);
      return next;
    });
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    setLeftConversationIds((previous) => new Set(previous).add(conversationId));
  }, []);

  const updateGroup = useCallback(
    (conversationId: string, draft: GroupDraft) => {
      setConversationOverrides((previous) => ({
        ...previous,
        [conversationId]: {
          name: draft.name.trim(),
          description: draft.description.trim(),
          avatarUrl: draft.avatarUrl,
          iconName: draft.iconName,
          allowedRoles: draft.allowedRoles,
          restricted: true,
          canPost: draft.canMembersPost
        }
      }));
      setLocalConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                name: draft.name.trim(),
                description: draft.description.trim(),
                avatarUrl: draft.avatarUrl,
                iconName: draft.iconName,
                allowedRoles: draft.allowedRoles,
                restricted: true,
                canPost: draft.canMembersPost
              }
            : conversation
        )
      );
    },
    []
  );

  const getMessageReactions = useCallback(
    (message: ChatMessage) =>
      messageReactionOverrides[message.id] ?? message.reactions ?? [],
    [messageReactionOverrides]
  );

  const toggleMessageReaction = useCallback(
    (message: ChatMessage, emoji: string) => {
      setMessageReactionOverrides((previous) => ({
        ...previous,
        [message.id]: toggleReaction(
          previous[message.id] ?? message.reactions ?? [],
          emoji
        )
      }));
    },
    []
  );

  const createPost = useCallback((input: CreatePostInput): HighlightPost => {
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
  }, []);

  const togglePostReaction = useCallback(
    (postId: string, emoji: QuickReaction) => {
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? {
                ...post,
                reactions: toggleReaction(post.reactions, emoji).map(
                  (reaction) => ({
                    emoji: reaction.emoji as QuickReaction,
                    count: reaction.count,
                    reactedByCurrentUser: reaction.reactedByCurrentUser
                  })
                )
              }
            : post
        )
      );
    },
    []
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
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: [
                  ...post.comments,
                  {
                    id: `comment-${Crypto.randomUUID()}`,
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
    },
    []
  );

  const toggleCommentReaction = useCallback(
    (postId: string, commentId: string, emoji: QuickReaction) => {
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: post.comments.map((comment) =>
                  comment.id === commentId
                    ? {
                        ...comment,
                        reactions: toggleReaction(comment.reactions, emoji).map(
                          (reaction) => ({
                            emoji: reaction.emoji as QuickReaction,
                            count: reaction.count,
                            reactedByCurrentUser: reaction.reactedByCurrentUser
                          })
                        )
                      }
                    : comment
                )
              }
            : post
        )
      );
    },
    []
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
      updateGroup,
      getMessageReactions,
      toggleMessageReaction,
      createPost,
      togglePostReaction,
      addComment,
      toggleCommentReaction,
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
      localConversations,
      localMessagesByConversation,
      posts,
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
