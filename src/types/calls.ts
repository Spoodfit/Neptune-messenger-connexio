import type { CallMode } from "../services/calls/callRoom";

export type ScheduledCallStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

export interface ScheduledCallGuest {
  id: string;
  displayName: string;
  phone?: string;
  email?: string;
}

export interface ScheduledCall {
  id: string;
  memberId: string;
  conversationId: string;
  mode: CallMode;
  subject: string;
  scheduledAt: string;
  status: ScheduledCallStatus;
  requestedByCurrentUser: boolean;
  createdAt: string;
  updatedAt: string;
  reminderNotificationIds?: string[];
  guestContacts?: ScheduledCallGuest[];
  backendSynced?: boolean;
}

export interface CreateScheduledCallInput {
  memberId: string;
  conversationId: string;
  mode: CallMode;
  subject: string;
  scheduledAt: string;
  guestContacts?: ScheduledCallGuest[];
}
