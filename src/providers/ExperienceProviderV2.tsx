import * as Crypto from "expo-crypto";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

import {
  demoCallHistory,
  demoHighlightPosts,
  demoMapMoments,
  demoMembers,
  demoPrivateConversations,
  demoPrivateMessages
} from "../data/experienceMock";
import { canRoleSeeConversation, normalizeUserRole } from "../domain/roles";
import { useSession } from "./SessionProvider";
import type {
  GroupDraft,
  HighlightComment,
  HighlightDraft,
  HighlightPost,
  MapMemberMoment,
  PrivateConversationDraft,
  QuickReaction,
  UserCall
} from "../types/experience";
import type {
  ChatMessage,
  Conversation,
  MessageReactionSummary,
  AppUser
} from "../types/messaging";

export const MAX_PRIVATE_PARTICIPANTS = 4;
export const MAX_PRIVATE_CONTACTS = MAX_PRIVATE_PARTICIPANTS - 1;

interface ExperienceContextValue {
  members: AppUser[];
  localConversations: Conversation[];
  localMessagesByConversation: Record<string, ChatMessage[]>;
  posts: HighlightPost[];
  mapMoments: MapMemberMoment[];
  callHistory: UserCall[];
  mutedConversationIds: Set<string>;
  leftConversationIds: Set<string>;
  groupOverrides: Record<string, Partial<Conversation>>;
  getMember: (memberId: string) => AppUser | undefined;
  getConversation: (conversationId: string) => Conversation | undefined;
  getConversationMessages: (conversationId: string) => ChatMessage[];
  decorateConversation: (conversation: Conversation) => Conversation;
  isConversationVisible: (conversation: Conversation) => boolean;
  createPrivateConversation: (draft: PrivateConversationDraft) => Conversation;
  sendLocalMessage: (
    conversationId: string,
    body: string,
    replyTo?: ChatMessage
  ) => Promise<boolean>;
  toggleConversationMuted: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  updateGroup: (conversationId: string, draft: GroupDraft) => void;
  toggleMessageReaction: (message: ChatMessage, emoji: string) => void;
  getMessageReactions: (message: ChatMessage) => MessageReactionSummary[];
  createPost: (draft: HighlightDraft) => HighlightPost;
  togglePostReaction: (postId: string, emoji: QuickReaction) => void;
  addComment: (
    postId: string,
    body: string,
    parentCommentId?: string,
    mentionedUserIds?: string[]
  ) => HighlightComment;
  toggleCommentReaction: (
    postId: string,
    commentId: string,
    emoji: QuickReaction
  ) => void;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function toggleReaction(
  reactions: readonly MessageReactionSummary[],
  emoji: string
): MessageReactionSummary[] {
  const current = reactions.find((reaction) => reaction.emoji === emoji);
  if (!current) {
    return [...reactions, { emoji, count: 1, reactedByCurrentUser: true }];
  }
  const nextCount = current.reactedByCurrentUser
    ? Math.max(0, current.count - 1)
    : current.count + 1;
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

function uniqueContactIds(memberIds: string[], currentUserId: string): string[] {
  return [...new Set(memberIds.map((id) => id.trim()).filter(Boolean))].filter(
    (id) => id !== currentUserId
  );
}

function sameParticipants(
  conversation: Conversation,
  participants: string[]
): boolean {
  if (!conversation.memberIds) return false;
  const first = [...conversation.memberIds].sort();
  const second = [...participants].sort();
  return first.length === second.length && first.every((id, index) => id === second[index]);
}

export function ExperienceProviderV2({ children }: PropsWithChildren) {
  const { currentUser } = useSession();
  const [localConversations, setLocalConversations] = useState<Conversation[]>(
    demoPrivateConversations
  );
  const [localMessagesByConversation, setLocalMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >(demoPrivateMessages);
  const [posts, setPosts] = useState<HighlightPost[]>(demoHighlightPosts);
  const [mutedConversationIds, setMutedConversationIds] = useState<Set<string>>(
    new Set()
  );
  const [leftConversationIds, setLeftConversationIds] = useState<Set<string>>(
    new Set()
  );
  const [groupOverrides, setGroupOverrides] = useState<
    Record<string, Partial<Conversation>>
  >({});
  const [messageReactionOverrides, setMessageReactionOverrides] = useState<
    Record<string, MessageReactionSummary[]>
  >({});

  const members = useMemo(() => {
    const currentExists = demoMembers.some((member) => member.id === currentUser.id);
    return currentExists ? demoMembers : [currentUser, ...demoMembers];
  }, [currentUser]);

  const getMember = useCallback(
    (memberId: string) => members.find((member) => member.id === memberId),
    [members]
  );

  const getConversation = useCallback(
    (conversationId: string) =>
      localConversations.find((conversation) => conversation.id === conversationId),
    [localConversations]
  );

  const getConversationMessages = useCallback(
    (conversationId: string) => localMessagesByConversation[conversationId] ?? [],
    [localMessagesByConversation]
  );

  const decorateConversation = useCallback(
    (conversation: Conversation): Conversation => ({
      ...conversation,
      ...(groupOverrides[conversation.id] ?? {}),
      muted: mutedConversationIds.has(conversation.id),
      left: leftConversationIds.has(conversation.id)
    }),
    [groupOverrides, leftConversationIds, mutedConversationIds]
  );

  const isConversationVisible = useCallback(
    (conversation: Conversation): boolean => {
      if (leftConversationIds.has(conversation.id)) return false;
      const allowedRoles = groupOverrides[conversation.id]?.allowedRoles ?? conversation.allowedRoles;
      return canRoleSeeConversation(currentUser.role, allowedRoles);
    },
    [currentUser.role, groupOverrides, leftConversationIds]
  );

  const createPrivateConversation = useCallback(
    (draft: PrivateConversationDraft): Conversation => {
      const selected = uniqueContactIds(draft.memberIds, currentUser.id);
      if (selected.length < 1) {
        throw new Error("Sélectionnez au moins un contact.");
      }
      if (selected.length > MAX_PRIVATE_CONTACTS) {
        throw new Error(
          `Un mini-groupe privé accepte ${MAX_PRIVATE_PARTICIPANTS} participants au total, vous compris.`
        );
      }
      const allParticipantIds = [currentUser.id, ...selected];
      const existing = localConversations.find(
        (conversation) =>
          (conversation.type === "direct" || conversation.type === "small_group") &&
          sameParticipants(conversation, allParticipantIds)
      );
      if (existing) return existing;

      const selectedMembers = selected
        .map((memberId) => members.find((member) => member.id === memberId))
        .filter((member): member is AppUser => Boolean(member));
      if (selectedMembers.length !== selected.length) {
        throw new Error("Un des contacts n’est plus disponible.");
      }
      const type = selectedMembers.length === 1 ? "direct" : "small_group";
      const name =
        type === "direct"
          ? selectedMembers[0]?.name ?? "Discussion privée"
          : draft.name?.trim() ||
            selectedMembers.map((member) => member.name.split(" ")[0]).join(", ");
      const conversation: Conversation = {
        id: `local-private-${Crypto.randomUUID()}`,
        name,
        description:
          type === "direct"
            ? selectedMembers[0]?.company
            : `Mini-groupe privé · ${allParticipantIds.length}/${MAX_PRIVATE_PARTICIPANTS}`,
        categoryLabel: type === "direct" ? "Privé" : "Mini-groupe privé",
        type,
        memberCount: allParticipantIds.length,
        unreadCount: 0,
        mentionCount: 0,
        restricted: false,
        canPost: true,
        canManage: true,
        memberIds: allParticipantIds,
        ownerId: currentUser.id,
        adminIds: [currentUser.id],
        avatarUrl: type === "direct" ? selectedMembers[0]?.avatarUrl : undefined,
        lastMessage: "Nouvelle conversation",
        lastMessageAt: new Date().toISOString()
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
      replyTo?: ChatMessage
    ): Promise<boolean> => {
      const cleanBody = body.trim();
      const conversation = localConversations.find(
        (item) => item.id === conversationId
      );
      if (!conversation?.canPost || !cleanBody || cleanBody.length > 4_000) {
        return false;
      }
      const now = new Date().toISOString();
      const message: ChatMessage = {
        id: `local-message-${Crypto.randomUUID()}`,
        clientMessageId: Crypto.randomUUID(),
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderInitials: currentUser.initials,
        senderAvatarUrl: currentUser.avatarUrl,
        body: cleanBody,
        createdAt: now,
        status: "sent",
        isMine: true,
        replyToMessageId: replyTo?.id,
        replyPreview: replyTo
          ? {
              messageId: replyTo.id,
              senderName: replyTo.senderName,
              body: replyTo.body
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
            ? { ...item, lastMessage: cleanBody, lastMessageAt: now }
            : item
        )
      );
      return true;
    },
    [currentUser, localConversations]
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
      setGroupOverrides((previous) => ({
        ...previous,
        [conversationId]: {
          name: draft.name.trim(),
          description: draft.description.trim(),
          avatarUrl: draft.avatarUrl,
          iconName: draft.iconName,
          allowedRoles: draft.allowedRoles,
          canPost: draft.canMembersPost
        }
      }));
    },
    []
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

  const getMessageReactions = useCallback(
    (message: ChatMessage) =>
      messageReactionOverrides[message.id] ?? message.reactions ?? [],
    [messageReactionOverrides]
  );

  const createPost = useCallback(
    (draft: HighlightDraft): HighlightPost => {
      const post: HighlightPost = {
        id: `local-highlight-${Crypto.randomUUID()}`,
        author: currentUser,
        kind: draft.kind,
        body: draft.body.trim(),
        createdAt: new Date().toISOString(),
        media: draft.media,
        mentionedUserIds: draft.mentionedUserIds,
        reactions: [],
        comments: [],
        shareCount: 0,
        syncedWithBusinessApp: draft.kind === "besoin",
        latitude: draft.coordinates?.latitude,
        longitude: draft.coordinates?.longitude,
        accuracyRadiusMeters: draft.coordinates?.accuracyRadiusMeters
      };
      setPosts((previous) => [post, ...previous]);
      return post;
    },
    [currentUser]
  );

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
    ): HighlightComment => {
      const comment: HighlightComment = {
        id: `local-comment-${Crypto.randomUUID()}`,
        author: currentUser,
        body: body.trim(),
        createdAt: new Date().toISOString(),
        parentCommentId,
        mentionedUserIds,
        reactions: []
      };
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, comment] }
            : post
        )
      );
      return comment;
    },
    [currentUser]
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
      localConversations,
      localMessagesByConversation,
      posts,
      mapMoments: demoMapMoments,
      callHistory: demoCallHistory,
      mutedConversationIds,
      leftConversationIds,
      groupOverrides,
      getMember,
      getConversation,
      getConversationMessages,
      decorateConversation,
      isConversationVisible,
      createPrivateConversation,
      sendLocalMessage,
      toggleConversationMuted,
      leaveConversation,
      updateGroup,
      toggleMessageReaction,
      getMessageReactions,
      createPost,
      togglePostReaction,
      addComment,
      toggleCommentReaction
    }),
    [
      addComment,
      createPost,
      createPrivateConversation,
      decorateConversation,
      getConversation,
      getConversationMessages,
      getMember,
      getMessageReactions,
      groupOverrides,
      isConversationVisible,
      leftConversationIds,
      localConversations,
      localMessagesByConversation,
      members,
      mutedConversationIds,
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

export function useExperienceV2(): ExperienceContextValue {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error("useExperience doit être utilisé dans ExperienceProvider.");
  }
  return context;
}
