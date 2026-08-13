import { useEffect, useMemo, useRef, useState } from "react";

import { env } from "../config/env";
import { useExperience } from "../providers/ExperienceProvider";
import { useGroupAdmin } from "../providers/GroupAdminProvider";
import { useMessaging } from "../providers/MessagingProvider";
import { useSession } from "../providers/SessionProvider";
import { createStandaloneStateStore } from "../storage/standaloneStore";
import type {
  GroupDraft,
  HighlightKind,
  HighlightMedia,
  QuickReaction
} from "../types/experience";
import type { MessageAttachment } from "../types/messaging";

interface SavedMessage {
  body: string;
  attachments?: MessageAttachment[];
  mentionedUserIds?: string[];
}

interface SavedPrivateConversation {
  memberIds: string[];
  name?: string;
  messages: SavedMessage[];
  muted?: boolean;
  left?: boolean;
}

interface SavedSeedPrivateMessages {
  conversationId: string;
  messages: SavedMessage[];
  muted?: boolean;
  left?: boolean;
}

interface SavedComment {
  body: string;
  mentionedUserIds?: string[];
}

interface SavedPost {
  kind: HighlightKind;
  body: string;
  media?: HighlightMedia;
  mentionedUserIds?: string[];
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracyRadiusMeters: number;
  };
  reactions: QuickReaction[];
  comments: SavedComment[];
}

interface SavedSeedPostComments {
  postId: string;
  comments: SavedComment[];
}

interface SavedGroup {
  draft: GroupDraft;
  messages: SavedMessage[];
}

interface StandaloneSnapshot {
  version: 1;
  groupMessages: Array<SavedMessage & { conversationId: string }>;
  privateConversations: SavedPrivateConversation[];
  seedPrivateMessages: SavedSeedPrivateMessages[];
  posts: SavedPost[];
  seedPostComments: SavedSeedPostComments[];
  groups: SavedGroup[];
  savedAt: string;
}

const restoredUsers = new Set<string>();

function chronological<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}

function nextProviderRender(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function savedMessage(message: {
  body: string;
  attachments?: MessageAttachment[];
  mentionedUserIds?: string[];
}): SavedMessage {
  return {
    body: message.body,
    attachments: message.attachments,
    mentionedUserIds: message.mentionedUserIds
  };
}

export function StandalonePersistenceBridge() {
  const { currentUser } = useSession();
  const messaging = useMessaging();
  const experience = useExperience();
  const groupAdmin = useGroupAdmin();
  const messagingRef = useRef(messaging);
  const experienceRef = useRef(experience);
  const groupAdminRef = useRef(groupAdmin);
  messagingRef.current = messaging;
  experienceRef.current = experience;
  groupAdminRef.current = groupAdmin;

  const store = useRef(createStandaloneStateStore()).current;
  const [restored, setRestored] = useState(!env.mockMode);
  const restoring = useRef(false);

  const snapshot = useMemo<StandaloneSnapshot>(() => {
    const groupMessages = messaging.visibleConversations.flatMap((conversation) =>
      messaging
        .getMessages(conversation.id)
        .filter(
          (message) =>
            message.senderId === currentUser.id && message.id.startsWith("mock-")
        )
        .map((message) => ({
          conversationId: conversation.id,
          ...savedMessage(message)
        }))
    );

    const privateConversations = experience.localConversations
      .filter((conversation) => conversation.id.startsWith("local-"))
      .map((conversation) => ({
        memberIds: (conversation.memberIds ?? []).filter(
          (memberId) => memberId !== currentUser.id
        ),
        name: conversation.name,
        messages: experience
          .getConversationMessages(conversation.id)
          .filter(
            (message) =>
              message.senderId === currentUser.id &&
              message.id.startsWith("local-message-")
          )
          .map(savedMessage),
        muted: conversation.muted,
        left: conversation.left
      }));

    const seedPrivateMessages = experience.localConversations
      .filter((conversation) => !conversation.id.startsWith("local-"))
      .map((conversation) => ({
        conversationId: conversation.id,
        messages: experience
          .getConversationMessages(conversation.id)
          .filter(
            (message) =>
              message.senderId === currentUser.id &&
              message.id.startsWith("local-message-")
          )
          .map(savedMessage),
        muted: conversation.muted,
        left: conversation.left
      }))
      .filter(
        (entry) => entry.messages.length > 0 || entry.muted === true || entry.left === true
      );

    const posts = experience.posts
      .filter((post) => post.author.id === currentUser.id)
      .map((post) => ({
        kind: post.kind,
        body: post.body,
        media: post.media,
        mentionedUserIds: post.mentionedUserIds,
        coordinates: post.coordinates,
        reactions: post.reactions
          .filter((reaction) => reaction.reactedByCurrentUser)
          .map((reaction) => reaction.emoji),
        comments: post.comments
          .filter((comment) => comment.author.id === currentUser.id)
          .map((comment) => ({
            body: comment.body,
            mentionedUserIds: comment.mentionedUserIds
          }))
      }));

    const seedPostComments = experience.posts
      .filter((post) => post.author.id !== currentUser.id)
      .map((post) => ({
        postId: post.id,
        comments: post.comments
          .filter(
            (comment) =>
              comment.author.id === currentUser.id &&
              comment.id.startsWith("comment-") &&
              !["comment-1", "comment-2"].includes(comment.id)
          )
          .map((comment) => ({
            body: comment.body,
            mentionedUserIds: comment.mentionedUserIds
          }))
      }))
      .filter((entry) => entry.comments.length > 0);

    const groups = groupAdmin.createdGroups.map((group) => ({
      draft: {
        name: group.name,
        description: group.description ?? "",
        avatarUrl: group.avatarUrl,
        iconName: group.iconName,
        allowedRoles: group.allowedRoles ?? [],
        canMembersPost: group.canPost === true,
        adminIds: group.adminIds,
        announcementPublisherIds: group.announcementPublisherIds,
        allowFreeDiscovery: group.allowFreeDiscovery
      },
      messages: groupAdmin
        .getCreatedGroupMessages(group.id)
        .filter((message) => message.senderId === currentUser.id)
        .map(savedMessage)
    }));

    return {
      version: 1,
      groupMessages,
      privateConversations,
      seedPrivateMessages,
      posts,
      seedPostComments,
      groups,
      savedAt: new Date().toISOString()
    };
  }, [currentUser.id, experience, groupAdmin, messaging]);

  useEffect(() => {
    if (!env.mockMode || !currentUser.id || restoredUsers.has(currentUser.id)) {
      setRestored(true);
      return;
    }

    let cancelled = false;
    restoring.current = true;

    void store
      .load<StandaloneSnapshot>("experience")
      .then(async (saved) => {
        if (cancelled || !saved || saved.version !== 1) return;

        for (const item of chronological(saved.groupMessages ?? [])) {
          if (cancelled) return;
          await messagingRef.current.sendMessage(
            item.conversationId,
            item.body,
            undefined,
            item.attachments,
            item.mentionedUserIds
          );
        }

        for (const item of saved.privateConversations ?? []) {
          if (cancelled || item.memberIds.length === 0) continue;
          try {
            const conversation = experienceRef.current.createPrivateConversation({
              memberIds: item.memberIds,
              name: item.name
            });
            await nextProviderRender();
            for (const message of chronological(item.messages ?? [])) {
              await experienceRef.current.sendLocalMessage(
                conversation.id,
                message.body,
                undefined,
                message.attachments,
                message.mentionedUserIds
              );
            }
            if (item.muted) {
              experienceRef.current.toggleConversationMuted(conversation.id);
            }
            if (item.left) experienceRef.current.leaveConversation(conversation.id);
          } catch {
            // Un contact retiré du jeu de données ne doit pas bloquer le démarrage.
          }
        }

        for (const item of saved.seedPrivateMessages ?? []) {
          if (cancelled) return;
          for (const message of chronological(item.messages ?? [])) {
            await experienceRef.current.sendLocalMessage(
              item.conversationId,
              message.body,
              undefined,
              message.attachments,
              message.mentionedUserIds
            );
          }
          if (item.muted) {
            experienceRef.current.toggleConversationMuted(item.conversationId);
          }
          if (item.left) experienceRef.current.leaveConversation(item.conversationId);
        }

        for (const item of chronological(saved.posts ?? [])) {
          if (cancelled) return;
          const post = experienceRef.current.createPost({
            kind: item.kind,
            body: item.body,
            media: item.media,
            mentionedUserIds: item.mentionedUserIds,
            coordinates: item.coordinates
          });
          for (const emoji of item.reactions ?? []) {
            experienceRef.current.togglePostReaction(post.id, emoji);
          }
          for (const comment of item.comments ?? []) {
            experienceRef.current.addComment(
              post.id,
              comment.body,
              undefined,
              comment.mentionedUserIds
            );
          }
        }

        for (const item of saved.seedPostComments ?? []) {
          if (cancelled) return;
          for (const comment of item.comments ?? []) {
            experienceRef.current.addComment(
              item.postId,
              comment.body,
              undefined,
              comment.mentionedUserIds
            );
          }
        }

        for (const item of saved.groups ?? []) {
          if (cancelled) return;
          try {
            const group = groupAdminRef.current.createGroup(item.draft);
            await nextProviderRender();
            for (const message of chronological(item.messages ?? [])) {
              await groupAdminRef.current.sendCreatedGroupMessage(
                group.id,
                message.body,
                undefined,
                message.attachments,
                message.mentionedUserIds
              );
            }
          } catch {
            // Un groupe local invalide est ignoré sans affecter les autres données.
          }
        }
      })
      .finally(() => {
        if (cancelled) return;
        restoredUsers.add(currentUser.id);
        restoring.current = false;
        setRestored(true);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser.id, store]);

  useEffect(() => {
    if (!env.mockMode || !restored || restoring.current || !currentUser.id) return;
    const timer = setTimeout(() => {
      void store.save("experience", snapshot);
    }, 350);
    return () => clearTimeout(timer);
  }, [currentUser.id, restored, snapshot, store]);

  return null;
}
