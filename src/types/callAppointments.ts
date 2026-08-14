import type { CallMode } from "../services/calls/callRoom";

export type CallAppointmentStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

export interface CallAppointment {
  id: string;
  memberId: string;
  conversationId: string;
  mode: CallMode;
  subject: string;
  scheduledAt: string;
  status: CallAppointmentStatus;
  requestedByCurrentUser: boolean;
  invitedContactName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CallAppointmentDraft {
  memberId: string;
  conversationId: string;
  mode: CallMode;
  subject: string;
  scheduledAt: string;
  invitedContactName?: string;
}

export type CallAppointmentResponse = "accept" | "decline";
