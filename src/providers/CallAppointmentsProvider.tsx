import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { Platform } from "react-native";

import { env } from "../config/env";
import { NeptuneCallAppointmentApi } from "../services/api/callAppointmentApi";
import {
  cancelCallAppointmentReminders,
  scheduleCallAppointmentReminders
} from "../services/notifications/callAppointmentReminders";
import type {
  CallAppointment,
  CallAppointmentDraft,
  CallAppointmentResponse
} from "../types/callAppointments";
import { useSession } from "./SessionProvider";

interface CallAppointmentsContextValue {
  appointments: CallAppointment[];
  loading: boolean;
  lastError: string | null;
  createAppointment: (draft: CallAppointmentDraft) => Promise<CallAppointment>;
  respondAppointment: (id: string, response: CallAppointmentResponse, memberName: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  refreshAppointments: () => Promise<void>;
}

const CallAppointmentsContext = createContext<CallAppointmentsContextValue | null>(null);

function storageKey(userId: string): string {
  return `connexio.call-appointments.${userId}`;
}

function sortAppointments(items: readonly CallAppointment[]): CallAppointment[] {
  return [...items].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
}

function validateDraft(draft: CallAppointmentDraft): void {
  const subject = draft.subject.trim();
  if (subject.length < 3 || subject.length > 160) {
    throw new Error("L’objet du rendez-vous doit contenir entre 3 et 160 caractères.");
  }
  const scheduledAt = Date.parse(draft.scheduledAt);
  if (!Number.isFinite(scheduledAt) || scheduledAt < Date.now() + 2 * 60_000) {
    throw new Error("Choisissez un horaire au moins deux minutes dans le futur.");
  }
  if (scheduledAt > Date.now() + 180 * 24 * 60 * 60_000) {
    throw new Error("Un appel ne peut pas être programmé plus de six mois à l’avance.");
  }
}

export function CallAppointmentsProvider({ children }: PropsWithChildren) {
  const { currentUser, accessToken } = useSession();
  const [appointments, setAppointments] = useState<CallAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const api = useMemo(
    () => (env.mockMode ? null : new NeptuneCallAppointmentApi(accessToken)),
    [accessToken]
  );

  const persistLocal = useCallback(
    async (items: readonly CallAppointment[]) => {
      if (!env.mockMode || Platform.OS === "web") return;
      await SecureStore.setItemAsync(storageKey(currentUser.id), JSON.stringify(items), {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
      });
    },
    [currentUser.id]
  );

  const refreshAppointments = useCallback(async () => {
    setLoading(true);
    setLastError(null);
    try {
      if (api) {
        setAppointments(sortAppointments(await api.list()));
        return;
      }
      if (Platform.OS === "web") return;
      const raw = await SecureStore.getItemAsync(storageKey(currentUser.id));
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter((item): item is CallAppointment => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Partial<CallAppointment>;
        return Boolean(
          candidate.id &&
            candidate.memberId &&
            candidate.conversationId &&
            candidate.subject &&
            candidate.scheduledAt
        );
      });
      setAppointments(sortAppointments(valid));
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Les rendez-vous d’appel sont indisponibles.");
    } finally {
      setLoading(false);
    }
  }, [api, currentUser.id]);

  useEffect(() => {
    void refreshAppointments();
  }, [refreshAppointments]);

  const createAppointment = useCallback(
    async (draft: CallAppointmentDraft): Promise<CallAppointment> => {
      validateDraft(draft);
      setLastError(null);
      const now = new Date().toISOString();
      const appointment = api
        ? await api.create({ ...draft, subject: draft.subject.trim() })
        : {
            id: `local-appointment-${Crypto.randomUUID()}`,
            ...draft,
            subject: draft.subject.trim(),
            status: "pending" as const,
            requestedByCurrentUser: true,
            createdAt: now,
            updatedAt: now
          };
      setAppointments((previous) => {
        const next = sortAppointments([appointment, ...previous.filter((item) => item.id !== appointment.id)]);
        void persistLocal(next);
        return next;
      });
      return appointment;
    },
    [api, persistLocal]
  );

  const respondAppointment = useCallback(
    async (id: string, response: CallAppointmentResponse, memberName: string) => {
      const current = appointments.find((item) => item.id === id);
      if (!current) return;
      const nextAppointment = api
        ? await api.respond(id, response)
        : {
            ...current,
            status: response === "accept" ? ("accepted" as const) : ("declined" as const),
            updatedAt: new Date().toISOString()
          };
      if (response === "accept") {
        nextAppointment.reminderIds = await scheduleCallAppointmentReminders({
          appointmentId: nextAppointment.id,
          conversationId: nextAppointment.conversationId,
          memberName,
          subject: nextAppointment.subject,
          scheduledAt: nextAppointment.scheduledAt
        });
      }
      setAppointments((previous) => {
        const next = sortAppointments(previous.map((item) => item.id === id ? nextAppointment : item));
        void persistLocal(next);
        return next;
      });
    },
    [api, appointments, persistLocal]
  );

  const cancelAppointment = useCallback(
    async (id: string) => {
      const current = appointments.find((item) => item.id === id);
      if (!current) return;
      await cancelCallAppointmentReminders(current.reminderIds ?? []);
      if (api) await api.cancel(id);
      const updated: CallAppointment = {
        ...current,
        status: "cancelled",
        reminderIds: [],
        updatedAt: new Date().toISOString()
      };
      setAppointments((previous) => {
        const next = sortAppointments(previous.map((item) => item.id === id ? updated : item));
        void persistLocal(next);
        return next;
      });
    },
    [api, appointments, persistLocal]
  );

  const value = useMemo<CallAppointmentsContextValue>(
    () => ({
      appointments,
      loading,
      lastError,
      createAppointment,
      respondAppointment,
      cancelAppointment,
      refreshAppointments
    }),
    [appointments, cancelAppointment, createAppointment, lastError, loading, refreshAppointments, respondAppointment]
  );

  return <CallAppointmentsContext.Provider value={value}>{children}</CallAppointmentsContext.Provider>;
}

export function useCallAppointments(): CallAppointmentsContextValue {
  const context = useContext(CallAppointmentsContext);
  if (!context) throw new Error("useCallAppointments doit être utilisé dans CallAppointmentsProvider.");
  return context;
}
