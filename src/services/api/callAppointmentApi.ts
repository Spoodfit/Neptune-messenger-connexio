import type {
  CallAppointment,
  CallAppointmentDraft,
  CallAppointmentResponse,
  CallAppointmentStatus
} from "../../types/callAppointments";
import { authenticatedRequest } from "./authenticatedRequest";

interface AppointmentWire {
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
  invited_contact_name?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Rendez-vous d’appel invalide : ${label} manquant.`);
  }
  return value.trim();
}

function normalizeStatus(value: unknown): CallAppointmentStatus {
  return value === "accepted" ||
    value === "declined" ||
    value === "cancelled" ||
    value === "completed"
    ? value
    : "pending";
}

function normalizeAppointment(payload: AppointmentWire): CallAppointment {
  const now = new Date().toISOString();
  return {
    id: requiredString(payload.id ?? payload.appointment_id, "id"),
    memberId: requiredString(payload.member_id ?? payload.participant_id, "member_id"),
    conversationId: requiredString(payload.conversation_id ?? payload.thread_id, "conversation_id"),
    mode: payload.mode === "audio" || payload.type === "audio" ? "audio" : "video",
    subject: requiredString(payload.subject ?? payload.reason, "subject"),
    scheduledAt: requiredString(payload.scheduled_at, "scheduled_at"),
    status: normalizeStatus(payload.status),
    requestedByCurrentUser: payload.requested_by_current_user !== false,
    invitedContactName:
      typeof payload.invited_contact_name === "string" && payload.invited_contact_name.trim()
        ? payload.invited_contact_name.trim()
        : undefined,
    createdAt: typeof payload.created_at === "string" ? payload.created_at : now,
    updatedAt: typeof payload.updated_at === "string" ? payload.updated_at : now
  };
}

export class NeptuneCallAppointmentApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async list(): Promise<CallAppointment[]> {
    const payload = await authenticatedRequest<AppointmentWire[] | { items?: AppointmentWire[] }>(
      "/v1/call-appointments",
      { method: "GET" },
      this.fallbackAccessToken
    );
    const items = Array.isArray(payload) ? payload : payload.items ?? [];
    return items.map(normalizeAppointment);
  }

  async create(draft: CallAppointmentDraft): Promise<CallAppointment> {
    const payload = await authenticatedRequest<AppointmentWire>(
      "/v1/call-appointments",
      {
        method: "POST",
        body: JSON.stringify({
          member_id: draft.memberId,
          conversation_id: draft.conversationId,
          type: draft.mode,
          subject: draft.subject.trim(),
          scheduled_at: draft.scheduledAt,
          invited_contact_name: draft.invitedContactName
        })
      },
      this.fallbackAccessToken
    );
    return normalizeAppointment(payload);
  }

  async respond(id: string, response: CallAppointmentResponse): Promise<CallAppointment> {
    const payload = await authenticatedRequest<AppointmentWire>(
      `/v1/call-appointments/${encodeURIComponent(id)}/respond`,
      {
        method: "POST",
        body: JSON.stringify({ response })
      },
      this.fallbackAccessToken
    );
    return normalizeAppointment(payload);
  }

  async cancel(id: string): Promise<void> {
    await authenticatedRequest(
      `/v1/call-appointments/${encodeURIComponent(id)}/cancel`,
      { method: "POST" },
      this.fallbackAccessToken
    );
  }
}
