import * as Crypto from "expo-crypto";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

import { canPublishInConversation } from "../domain/accessPolicy";
import type { GroupDraft } from "../types/experience";
import type {
  ChatMessage,
  Conversation,
  MessageAttachment
} from "../types/messaging";
import { useSession } from "./SessionProvider";

interface GroupAdminContextValue {
  createdGroups: Conversation[];
  createdMessagesByGroup: Record<string, ChatMessage[]>;
  createGroup: (draft: GroupDraft) => Conversation;
  updateCreatedGroup: (conversationId: string, draft: GroupDraft) => void;
  getCreatedGroup: (conversationId: string) => Conversation | undefined;
  getCreatedGroupMessages: (conversationId: string) => ChatMessage[];
  sendCreatedGroupMessage: (
    conversationId: string,
    body: string,
    replyTo?: ChatMessage,
    attachments?: MessageAttachment[],
    mentionedUserIds?: string[]
  ) => Promise<boolean>;
  removeCreatedGroup: (conversationId: string) => void;
}

const GroupAdminContext = createContext<GroupAdminContextValue | null>(null);

export function GroupAdminProvider({ children }: PropsWithChildren) {
  const { currentUser } = useSession();
  const [createdGroups, setCreatedGroups] = useState<Conversation[]>([]);
  const [createdMessagesByGroup, setCreatedMessagesByGroup] = useState<
    Record<string, ChatMessage[]>
  >({});

  const createGroup = useCallback(
    (draft: GroupDraft): Conversation => {
      const group: Conversation = {
        id: `local-group-${Crypto.randomUUID()}`,
        name: draft.name.trim(),
        description: draft.description.trim(),
        categoryLabel: "Groupe administré",
        type: draft.iconName === "megaphone" ? "announcement" : "topic",
        memberCount: 1,
        unreadCount: 0,
        restricted: true,
        allowedRoles: draft.allowedRoles,
        canPost: draft.canMembersPost,
        canManage: true,
        avatarUrl: draft.avatarUrl,
        iconName: draft.iconName,
        ownerId: currentUser.id,
        adminIds: draft.adminIds ?? [],
        announcementPublisherIds: draft.announcementPublisherIds ?? [],
        allowFreeDiscovery: draft.allowFreeDiscovery ?? false,
        memberIds: [currentUser.id],
        lastMessage: "Groupe créé.",
        lastMessageAt: new Date().toISOString()
      };
      setCreatedGroups((previous) => [group, ...previous]);
      setCreatedMessagesByGroup((previous) => ({
        ...previous,
        [group.id]: []
      }));
      return group;
    },
    [currentUser.id]
  );

  const updateCreatedGroup = useCallback(
    (conversationId: string, draft: GroupDraft) => {
      setCreatedGroups((previous) =>
        previous.map((group) =>
          group.id === conversationId
            ? {
                ...group,
                name: draft.name.trim(),
                description: draft.description.trim(),
                avatarUrl: draft.avatarUrl,
                iconName: draft.iconName,
                allowedRoles: draft.allowedRoles,
                canPost: draft.canMembersPost,
                adminIds: draft.adminIds ?? group.adminIds,
                announcementPublisherIds:
                  draft.announcementPublisherIds ?? group.announcementPublisherIds,
                allowFreeDiscovery:
                  draft.allowFreeDiscovery ?? group.allowFreeDiscovery
              }
            : group
        )
      );
    },
    []
  );

  const getCreatedGroup = useCallback(
    (conversationId: string) =>
      createdGroups.find((group) => group.id === conversationId),
    [createdGroups]
  );

  const getCreatedGroupMessages = useCallback(
    (conversationId: string) => createdMessagesByGroup[conversationId] ?? [],
    [createdMessagesByGroup]
  );

  const sendCreatedGroupMessage = useCallback(
    async (
      conversationId: string,
      body: string,
      replyTo?: ChatMessage,
      attachments: MessageAttachment[] = [],
      mentionedUserIds: string[] = []
    ): Promise<boolean> => {
      const cleanBody = body.trim();
      const group = createdGroups.find((item) => item.id === conversationId);
      if (
        !group ||
        !canPublishInConversation(currentUser, group) ||
        (!cleanBody && attachments.length === 0) ||
        cleanBody.length > 4_000
      ) {
        return false;
      }
      const createdAt = new Date().toISOString();
      const message: ChatMessage = {
        id: `local-group-message-${Crypto.randomUUID()}`,
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
        replyToMessageId: replyTo?.id,
        attachments,
        mentionedUserIds,
        replyPreview: replyTo
          ? {
              messageId: replyTo.id,
              senderName: replyTo.senderName,
              body: replyTo.body
            }
          : undefined
      };
      setCreatedMessagesByGroup((previous) => ({
        ...previous,
        [conversationId]: [message, ...(previous[conversationId] ?? [])]
      }));
      setCreatedGroups((previous) =>
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
    [createdGroups, currentUser]
  );

  const removeCreatedGroup = useCallback((conversationId: string) => {
    setCreatedGroups((previous) =>
      previous.filter((group) => group.id !== conversationId)
    );
    setCreatedMessagesByGroup((previous) => {
      const next = { ...previous };
      delete next[conversationId];
      return next;
    });
  }, []);

  const value = useMemo<GroupAdminContextValue>(
    () => ({
      createdGroups,
      createdMessagesByGroup,
      createGroup,
      updateCreatedGroup,
      getCreatedGroup,
      getCreatedGroupMessages,
      sendCreatedGroupMessage,
      removeCreatedGroup
    }),
    [
      createGroup,
      createdGroups,
      createdMessagesByGroup,
      getCreatedGroup,
      getCreatedGroupMessages,
      removeCreatedGroup,
      sendCreatedGroupMessage,
      updateCreatedGroup
    ]
  );

  return (
    <GroupAdminContext.Provider value={value}>
      {children}
    </GroupAdminContext.Provider>
  );
}

export function useGroupAdmin(): GroupAdminContextValue {
  const context = useContext(GroupAdminContext);
  if (!context) {
    throw new Error("useGroupAdmin doit être utilisé dans GroupAdminProvider.");
  }
  return context;
}
