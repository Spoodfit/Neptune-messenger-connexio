import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";

import {
  conversations as initialConversations,
  messagesByConversation as initialMessages
} from "@/data/mockData";
import { useSession } from "@/providers/SessionProvider";
import type { ChatMessage, Conversation } from "@/types/messaging";

interface MessagingContextValue {
  visibleConversations: Conversation[];
  getConversation: (conversationId: string) => Conversation | undefined;
  getMessages: (conversationId: string) => ChatMessage[];
  sendMessage: (conversationId: string, body: string) => void;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({ children }: PropsWithChildren) {
  const { currentUser } = useSession();
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [messagesByConversation, setMessagesByConversation] =
    useState<Record<string, ChatMessage[]>>(initialMessages);

  const visibleConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        if (!conversation.restricted) return true;
        return conversation.allowedRoles?.includes(currentUser.role) ?? false;
      }),
    [conversations, currentUser.role]
  );

  const getConversation = useCallback(
    (conversationId: string) =>
      visibleConversations.find((item) => item.id === conversationId),
    [visibleConversations]
  );

  const getMessages = useCallback(
    (conversationId: string) => messagesByConversation[conversationId] ?? [],
    [messagesByConversation]
  );

  const sendMessage = useCallback(
    (conversationId: string, body: string) => {
      const createdAt = new Date().toISOString();
      const message: ChatMessage = {
        id: `local-${Date.now()}`,
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderInitials: currentUser.initials,
        body,
        createdAt,
        status: "sending",
        isMine: true
      };

      setMessagesByConversation((previous) => ({
        ...previous,
        [conversationId]: [message, ...(previous[conversationId] ?? [])]
      }));

      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessage: body,
                lastMessageAt: createdAt
              }
            : conversation
        )
      );

      // À remplacer par neptuneApi.sendMessage().
      setTimeout(() => {
        setMessagesByConversation((previous) => ({
          ...previous,
          [conversationId]: (previous[conversationId] ?? []).map((item) =>
            item.id === message.id ? { ...item, status: "sent" } : item
          )
        }));
      }, 450);
    },
    [currentUser]
  );

  const value = useMemo<MessagingContextValue>(
    () => ({
      visibleConversations,
      getConversation,
      getMessages,
      sendMessage
    }),
    [getConversation, getMessages, sendMessage, visibleConversations]
  );

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export function useMessaging(): MessagingContextValue {
  const context = useContext(MessagingContext);

  if (!context) {
    throw new Error(
      "useMessaging doit être utilisé dans MessagingProvider."
    );
  }

  return context;
}
