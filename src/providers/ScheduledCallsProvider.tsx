import * as Crypto from "expo-crypto";
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { env } from "../config/env";
import { ScheduledCallApi } from "../services/api/scheduledCallApi";
import { cancelScheduledCallReminders, scheduleScheduledCallReminders } from "../services/notifications/scheduledCallReminders";
import { createStandaloneStateStore } from "../storage/standaloneStore";
import type { CreateScheduledCallInput, ScheduledCall } from "../types/calls";
import { useSession } from "./SessionProvider";

interface ScheduledCallsContextValue {
  calls: ScheduledCall[];
  ready: boolean;
  createScheduledCall: (input: CreateScheduledCallInput, memberName: string) => Promise<ScheduledCall>;
  acceptScheduledCall: (id: string, memberName: string) => Promise<ScheduledCall>;
  declineScheduledCall: (id: string) => Promise<void>;
  cancelScheduledCall: (id: string) => Promise<void>;
  markCompleted: (id: string) => void;
}

const ScheduledCallsContext = createContext<ScheduledCallsContextValue | null>(null);

function sortCalls(calls: ScheduledCall[]): ScheduledCall[] {
  return [...calls].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
}

export function ScheduledCallsProvider({ children }: PropsWithChildren) {
  const { accessToken } = useSession();
  const api = useMemo(() => env.mockMode ? null : new ScheduledCallApi(accessToken), [accessToken]);
  const store = useMemo(() => createStandaloneStateStore(), []);
  const [calls, setCalls] = useState<ScheduledCall[]>([]);
  const [ready, setReady] = useState(!env.mockMode);

  useEffect(() => {
    if (!env.mockMode) return;
    let cancelled = false;
    void store.load<ScheduledCall[]>("scheduled-calls").then((saved) => {
      if (!cancelled && Array.isArray(saved)) setCalls(sortCalls(saved));
    }).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => { cancelled = true; };
  }, [store]);

  useEffect(() => {
    if (!env.mockMode || !ready) return;
    void store.save("scheduled-calls", calls);
  }, [calls, ready, store]);

  const replaceCall = useCallback((next: ScheduledCall) => {
    setCalls((previous) => sortCalls([next, ...previous.filter((item) => item.id !== next.id)]));
  }, []);

  const createScheduledCall = useCallback(async (input: CreateScheduledCallInput, memberName: string) => {
    const subject = input.subject.trim();
    if (subject.length < 3) throw new Error("Indiquez l’objet du rendez-vous d’appel.");
    const scheduledAt = Date.parse(input.scheduledAt);
    if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now() + 60_000) throw new Error("Choisissez un horaire situé dans le futur.");

    const next = api
      ? await api.create({ ...input, subject, scheduledAt: new Date(scheduledAt).toISOString() })
      : {
          id: `scheduled-${Crypto.randomUUID()}`,
          memberId: input.memberId,
          conversationId: input.conversationId,
          mode: input.mode,
          subject,
          scheduledAt: new Date(scheduledAt).toISOString(),
          status: "pending" as const,
          requestedByCurrentUser: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          guestContacts: input.guestContacts,
          backendSynced: false
        };

    if (next.status === "accepted") {
      next.reminderNotificationIds = await scheduleScheduledCallReminders(next, memberName);
    }
    replaceCall(next);
    return next;
  }, [api, replaceCall]);

  const acceptScheduledCall = useCallback(async (id: string, memberName: string) => {
    const current = calls.find((item) => item.id === id);
    if (!current) throw new Error("Rendez-vous introuvable.");
    const accepted = api
      ? await api.respond(id, "accepted")
      : { ...current, status: "accepted" as const, updatedAt: new Date().toISOString(), backendSynced: false };
    accepted.reminderNotificationIds = await scheduleScheduledCallReminders(accepted, memberName);
    replaceCall(accepted);
    return accepted;
  }, [api, calls, replaceCall]);

  const declineScheduledCall = useCallback(async (id: string) => {
    const current = calls.find((item) => item.id === id);
    if (!current) return;
    await cancelScheduledCallReminders(current.reminderNotificationIds);
    if (api) await api.respond(id, "declined");
    replaceCall({ ...current, status: "declined", reminderNotificationIds: [], updatedAt: new Date().toISOString() });
  }, [api, calls, replaceCall]);

  const cancelScheduledCall = useCallback(async (id: string) => {
    const current = calls.find((item) => item.id === id);
    if (!current) return;
    await cancelScheduledCallReminders(current.reminderNotificationIds);
    if (api) await api.cancel(id);
    replaceCall({ ...current, status: "cancelled", reminderNotificationIds: [], updatedAt: new Date().toISOString() });
  }, [api, calls, replaceCall]);

  const markCompleted = useCallback((id: string) => {
    setCalls((previous) => previous.map((item) => item.id === id ? { ...item, status: "completed", updatedAt: new Date().toISOString() } : item));
  }, []);

  const value = useMemo<ScheduledCallsContextValue>(() => ({
    calls,
    ready,
    createScheduledCall,
    acceptScheduledCall,
    declineScheduledCall,
    cancelScheduledCall,
    markCompleted
  }), [acceptScheduledCall, calls, cancelScheduledCall, createScheduledCall, declineScheduledCall, markCompleted, ready]);

  return <ScheduledCallsContext.Provider value={value}>{children}</ScheduledCallsContext.Provider>;
}

export function useScheduledCalls(): ScheduledCallsContextValue {
  const context = useContext(ScheduledCallsContext);
  if (!context) throw new Error("useScheduledCalls doit être utilisé dans ScheduledCallsProvider.");
  return context;
}
