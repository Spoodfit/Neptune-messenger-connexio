import * as Crypto from "expo-crypto";
import { AppState } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { env } from "../config/env";
import {
  calculateBackoffMs,
  type OutboxItem
} from "../domain/outbox";
import {
  createOptimisticMessage,
  markMessageFailed,
  markMessageSending,
  queueMessageForRetry,
  reconcileServerMessage
} from "../domain/messageLifecycle";
import { canAccessAllowedRoles } from "../domain/roles";
import {
  conversations as initialConversations,
  messagesByConversation as initialMessages
} from "../data/mockData";
import { useSession } from "./SessionProvider";
import { ApiError } from "../services/api/httpClient";
import { NeptuneMessagingApi } from "../services/api/neptuneApi";
import {
  RealtimeClient,
  type RealtimeEvent
} from "../services/realtime/RealtimeClient";
import { createOutboxStore } from "../storage/outboxStore";
import type { ChatMessage, Conversation } from "../types/messaging";

export type ConnectionState = "offline" | "connecting" | "online";

interface MessagingContextValue {
  visibleConversations: Conversation[];
  getConversation: (conversationId: string) => Conversation | undefined;
  getMessages: (conversationId: string) => ChatMessage[];
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (
    conversationId: string,
    body: string,
    replyToMessageId?: string
  ) => Promise<void>;
  retryMessage: (clientMessageId: string) => Promise<void>;
  markConversationRead: (conversationId: string) => Promise<void>;
  loadingConversations: boolean;
  loadingConversationIds: ReadonlySet<string>;
  connectionState: ConnectionState;
  lastError: string | null;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);
const sleep = (duration: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, duration));

export function MessagingProvider({ children }: PropsWithChildren) {
  const { currentUser, accessToken } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>(
    env.mockMode ? initialConversations : []
  );
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<string, ChatMessage[]>
  >(env.mockMode ? initialMessages : {});
  const [loadingConversations, setLoadingConversations] = useState(!env.mockMode);
  const [loadingConversationIds, setLoadingConversationIds] = useState<Set<string>>(
    new Set()
  );
  const [connectionState, setConnectionState] =
    useState<ConnectionState>(env.mockMode ? "online" : "offline");
  const [lastError, setLastError] = useState<string | null>(null);
  const outbox = useRef(createOutboxStore()).current;
  const flushing = useRef<Promise<void> | null>(null);
  const api = useMemo(
    () => (accessToken ? new NeptuneMessagingApi(accessToken) : null),
    [accessToken]
  );

  const visibleConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) =>
          !conversation.restricted ||
          canAccessAllowedRoles(currentUser.role, conversation.allowedRoles)
      ),
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

  const upsertMessage = useCallback(
    (incoming: ChatMessage) => {
      const normalized: ChatMessage = {
        ...incoming,
        isMine: incoming.isMine || incoming.senderId === currentUser.id
      };
      setMessagesByConversation((previous) => {
        const current = previous[normalized.conversationId] ?? [];
        const index = current.findIndex(
          (message) =>
            message.id === normalized.id ||
            (normalized.clientMessageId &&
              message.clientMessageId === normalized.clientMessageId)
        );
        if (index < 0) {
          return {
            ...previous,
            [normalized.conversationId]: [normalized, ...current]
          };
        }
        const next = [...current];
        const existing = next[index];
        if (!existing) return previous;
        next[index] = reconcileServerMessage(existing, normalized);
        return { ...previous, [normalized.conversationId]: next };
      });
    },
    [currentUser.id]
  );

  const updateLocalMessage = useCallback(
    (clientMessageId: string, updater: (message: ChatMessage) => ChatMessage) => {
      setMessagesByConversation((previous) => {
        let changed = false;
        const next: Record<string, ChatMessage[]> = {};
        for (const [conversationId, messages] of Object.entries(previous)) {
          next[conversationId] = messages.map((message) => {
            if (message.clientMessageId !== clientMessageId) return message;
            changed = true;
            return updater(message);
          });
        }
        return changed ? next : previous;
      });
    },
    []
  );

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (env.mockMode || !api) return;
      setLoadingConversationIds((previous) => new Set(previous).add(conversationId));
      try {
        const page = await api.listMessages(conversationId);
        setMessagesByConversation((previous) => ({
          ...previous,
          [conversationId]: page.items.map((message) => ({
            ...message,
            isMine: message.senderId === currentUser.id
          }))
        }));
        setLastError(null);
      } catch {
        setLastError("Impossible de charger les messages.");
      } finally {
        setLoadingConversationIds((previous) => {
          const next = new Set(previous);
          next.delete(conversationId);
          return next;
        });
      }
    },
    [api, currentUser.id]
  );

  const flushOutbox = useCallback(async (): Promise<void> => {
    if (flushing.current) return flushing.current;
    const operation = (async () => {
      const dueItems = await outbox.listDue(Date.now());
      for (const item of dueItems) {
        if (!env.mockMode && !api) continue;
        await outbox.markSending(item.clientMessageId);
        updateLocalMessage(item.clientMessageId, markMessageSending);
        try {
          let serverMessage: ChatMessage;
          if (env.mockMode) {
            await sleep(260);
            serverMessage = {
              id: `mock-${item.clientMessageId}`,
              clientMessageId: item.clientMessageId,
              conversationId: item.conversationId,
              senderId: currentUser.id,
              senderName: currentUser.name,
              senderInitials: currentUser.initials,
              senderAvatarUrl: currentUser.avatarUrl,
              body: item.body,
              createdAt: item.createdAt,
              status: "sent",
              isMine: true,
              replyToMessageId: item.replyToMessageId
            };
          } else {
            serverMessage = await api!.sendMessage(item.conversationId, {
              clientMessageId: item.clientMessageId,
              body: item.body,
              replyToMessageId: item.replyToMessageId
            });
          }
          upsertMessage(serverMessage);
          await outbox.remove(item.clientMessageId);
          setLastError(null);
        } catch (error) {
          if (error instanceof ApiError && error.status === 409 && api) {
            await outbox.remove(item.clientMessageId);
            await loadMessages(item.conversationId);
            continue;
          }
          const attempts = item.attempts + 1;
          const errorCode =
            error instanceof ApiError ? `api-${error.status}` : "network";
          const retryable = !(error instanceof ApiError) || error.retryable;
          const nextAttemptAt = retryable
            ? Date.now() + calculateBackoffMs(attempts)
            : Number.MAX_SAFE_INTEGER;
          await outbox.markFailure(
            item.clientMessageId,
            attempts,
            nextAttemptAt,
            errorCode
          );
          updateLocalMessage(item.clientMessageId, (message) =>
            markMessageFailed(message, errorCode)
          );
          setLastError("Un message n’a pas été envoyé.");
        }
      }
    })().finally(() => {
      flushing.current = null;
    });
    flushing.current = operation;
    return operation;
  }, [api, currentUser, loadMessages, outbox, updateLocalMessage, upsertMessage]);

  const sendMessage = useCallback(
    async (
      conversationId: string,
      body: string,
      replyToMessageId?: string
    ) => {
      const cleanBody = body.trim();
      if (!cleanBody) return;
      const clientMessageId = Crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const optimistic = createOptimisticMessage({
        clientMessageId,
        conversationId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderInitials: currentUser.initials,
        senderAvatarUrl: currentUser.avatarUrl,
        body: cleanBody,
        createdAt,
        replyToMessageId
      });
      const outboxItem: OutboxItem = {
        clientMessageId,
        conversationId,
        body: cleanBody,
        replyToMessageId,
        createdAt,
        attempts: 0,
        nextAttemptAt: Date.now(),
        state: "pending"
      };
      setMessagesByConversation((previous) => ({
        ...previous,
        [conversationId]: [optimistic, ...(previous[conversationId] ?? [])]
      }));
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, lastMessage: cleanBody, lastMessageAt: createdAt }
            : conversation
        )
      );
      await outbox.enqueue(outboxItem);
      await flushOutbox();
    },
    [currentUser, flushOutbox, outbox]
  );

  const retryMessage = useCallback(
    async (clientMessageId: string) => {
      const existing = await outbox.get(clientMessageId);
      if (!existing) return;
      await outbox.requeue(clientMessageId);
      updateLocalMessage(clientMessageId, queueMessageForRetry);
      await flushOutbox();
    },
    [flushOutbox, outbox, updateLocalMessage]
  );

  const markConversationRead = useCallback(
    async (conversationId: string) => {
      const messages = messagesByConversation[conversationId] ?? [];
      const lastMessage = messages[0];
      if (!lastMessage) return;
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
      if (!env.mockMode && api) {
        try {
          await api.markConversationRead(conversationId, lastMessage.id);
        } catch {
          // Le serveur recalculera le non-lu lors de la prochaine synchronisation.
        }
      }
    },
    [api, messagesByConversation]
  );

  useEffect(() => {
    if (env.mockMode || !api) return;
    let cancelled = false;
    setLoadingConversations(true);
    void api
      .listConversations()
      .then((items) => {
        if (!cancelled) {
          setConversations(items);
          setLastError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLastError("Impossible de charger les discussions.");
      })
      .finally(() => {
        if (!cancelled) setLoadingConversations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      if (event.type === "message.created" || event.type === "message.updated") {
        upsertMessage(event.payload);
        if (event.payload.clientMessageId) {
          void outbox.remove(event.payload.clientMessageId);
        }
        return;
      }
      if (event.type === "message.deleted") {
        setMessagesByConversation((previous) => ({
          ...previous,
          [event.payload.conversationId]: (
            previous[event.payload.conversationId] ?? []
          ).filter((message) => message.id !== event.payload.messageId)
        }));
        return;
      }
      if (
        event.type === "conversation.membership.changed" &&
        !event.payload.active
      ) {
        setConversations((previous) =>
          previous.filter(
            (conversation) => conversation.id !== event.payload.conversationId
          )
        );
      }
    },
    [outbox, upsertMessage]
  );

  useEffect(() => {
    if (env.mockMode || !api || !env.realtimeUrl) return;
    setConnectionState("connecting");
    const client = new RealtimeClient({
      url: env.realtimeUrl,
      ticketProvider: async () => (await api.requestRealtimeTicket()).ticket,
      onEvent: handleRealtimeEvent,
      onConnectionChange: (connected) => {
        setConnectionState(connected ? "online" : "offline");
        if (connected) void flushOutbox();
      }
    });
    client.connect();
    return () => client.disconnect();
  }, [api, flushOutbox, handleRealtimeEvent]);

  useEffect(() => {
    const interval = setInterval(() => void flushOutbox(), 12_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void flushOutbox();
    });
    void flushOutbox();
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [flushOutbox]);

  const value = useMemo<MessagingContextValue>(
    () => ({
      visibleConversations,
      getConversation,
      getMessages,
      loadMessages,
      sendMessage,
      retryMessage,
      markConversationRead,
      loadingConversations,
      loadingConversationIds,
      connectionState,
      lastError
    }),
    [
      connectionState,
      getConversation,
      getMessages,
      lastError,
      loadMessages,
      loadingConversationIds,
      loadingConversations,
      markConversationRead,
      retryMessage,
      sendMessage,
      visibleConversations
    ]
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
    throw new Error("useMessaging doit être utilisé dans MessagingProvider.");
  }
  return context;
}
