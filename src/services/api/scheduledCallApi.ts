import type { CreateScheduledCallInput, ScheduledCall, ScheduledCallStatus } from "../../types/calls";
import { authenticatedRequest } from "./authenticatedRequest";

interface ScheduledCallWire {
  id?: unknown;
  appointment_id?: unknown;
  member_id?: unknown;
  participant_id?: unknown;
  conversation_id?: unknown;
  thread_id?: unknown;
  type?: unknown;
  mode?: unknown;
  subject?: unknown;
  reason?: unknown;
  scheduled_at?: unknown;
  status?: unknown;
  requested_by_current_user?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Rendez-vous d’appel invalide : ${label} manquant.`);
  return value.trim();
}

function normalizeStatus(value: unknown): ScheduledCallStatus {
  return value === "accepted" || value === "declined" || value === "cancelled" || value === "completed"
    ? value
    : "pending";
}

function normalizeScheduledCall(payload: ScheduledCallWire, fallback?: CreateScheduledCallInput): ScheduledCall {
  const now = new Date().toISOString();
  return {
    id: requiredString(payload.id ?? payload.appointment_id, "id"),
    memberId: requiredString(payload.member_id ?? payload.participant_id ?? fallback?.memberId, "member_id"),
    conversationId: requiredString(payload.conversation_id ?? payload.thread_id ?? fallback?.conversationId, "conversation_id"),
    mode: payload.type === "audio" || payload.mode === "audio" || fallback?.mode === "audio" ? "audio" : "video",
    subject: requiredString(payload.subject ?? payload.reason ?? fallback?.subject, "subject"),
    scheduledAt: requiredString(payload.scheduled_at ?? fallback?.scheduledAt, "scheduled_at"),
    status: normalizeStatus(payload.status),
    requestedByCurrentUser: payload.requested_by_current_user !== false,
    createdAt: typeof payload.created_at === "string" ? payload.created_at : now,
    updatedAt: typeof payload.updated_at === "string" ? payload.updated_at : now,
    guestContacts: fallback?.guestContacts,
    backendSynced: true
  };
}

export class ScheduledCallApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async create(input: CreateScheduledCallInput): Promise<ScheduledCall> {
    const cleanSubject = input.subject.trim();
    if (cleanSubject.length < 3) throw new Error("L’objet de l’appel doit contenir au moins 3 caractères.");
    const scheduledAt = Date.parse(input.scheduledAt);
    if (!Number.isFinite(scheduledAt) || scheduledAt <= Date.now() + 60_000) {
      throw new Error("Choisissez une date d’appel située dans le futur.");
    }
    const payload = await authenticatedRequest<ScheduledCallWire>(
      "/v1/call-appointments",
      {
        method: "POST",
        body: JSON.stringify({
          member_id: input.memberId,
          participant_id: input.memberId,
          conversation_id: input.conversationId,
          thread_id: input.conversationId,
          type: input.mode,
          mode: input.mode,
          subject: cleanSubject,
          reason: cleanSubject,
          scheduled_at: new Date(scheduledAt).toISOString(),
          guest_contacts: input.guestContacts ?? []
        })
      },
      this.fallbackAccessToken
    );
    return normalizeScheduledCall(payload, input);
  }

  async respond(id: string, response: "accepted" | "declined"): Promise<ScheduledCall> {
    const payload = await authenticatedRequest<ScheduledCallWire>(
      `/v1/call-appointments/${encodeURIComponent(id)}/${response === "accepted" ? "accept" : "decline"}`,
      { method: "POST" },
      this.fallbackAccessToken
    );
    return normalizeScheduledCall(payload);
  }

  async cancel(id: string): Promise<void> {
    await authenticatedRequest(
      `/v1/call-appointments/${encodeURIComponent(id)}/cancel`,
      { method: "POST" },
      this.fallbackAccessToken
    );
  }
}
