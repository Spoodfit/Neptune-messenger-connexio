import { normalizeUserRole } from "./roles";
import type {
  MessageAttachment,
  ScheduledMessage,
  UserRole
} from "../types/messaging";

export interface ScheduleMessageInput {
  id: string;
  conversationId: string;
  body: string;
  attachments?: MessageAttachment[];
  scheduledFor: string;
  createdByUserId: string;
  role: UserRole;
  canManageConversation: boolean;
  now?: Date;
}

const AUTHORIZED_ROLES = new Set(["capitaine", "amiral", "visionnaire", "admin"]);
const MINIMUM_DELAY_MS = 2 * 60 * 1000;
const MAXIMUM_DELAY_MS = 365 * 24 * 60 * 60 * 1000;

export function canScheduleMessages(
  role: UserRole,
  canManageConversation: boolean
): boolean {
  return (
    canManageConversation && AUTHORIZED_ROLES.has(normalizeUserRole(role))
  );
}

export function createScheduledMessage(
  input: ScheduleMessageInput
): ScheduledMessage {
  if (!canScheduleMessages(input.role, input.canManageConversation)) {
    throw new Error(
      "Seuls les Capitaines, Amiraux et Visionnaires responsables de ce groupe peuvent programmer un message."
    );
  }
  const cleanBody = input.body.trim();
  const attachments = input.attachments ?? [];
  if (!cleanBody && attachments.length === 0) {
    throw new Error("Le message programmé ne peut pas être vide.");
  }
  const now = input.now ?? new Date();
  const scheduledAt = new Date(input.scheduledFor);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("La date de programmation est invalide.");
  }
  const delay = scheduledAt.getTime() - now.getTime();
  if (delay < MINIMUM_DELAY_MS) {
    throw new Error("Programmez l’envoi au moins deux minutes à l’avance.");
  }
  if (delay > MAXIMUM_DELAY_MS) {
    throw new Error("Un message ne peut pas être programmé plus d’un an à l’avance.");
  }

  return {
    id: input.id,
    conversationId: input.conversationId,
    body: cleanBody,
    attachments,
    scheduledFor: scheduledAt.toISOString(),
    createdByUserId: input.createdByUserId,
    status: "scheduled"
  };
}
