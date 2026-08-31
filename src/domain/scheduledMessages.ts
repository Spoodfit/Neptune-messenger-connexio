import { normalizeUserRole } from "./roles";
import type {
  MessageAttachment,
  ScheduleFrequency,
  ScheduledMessage,
  UserRole
} from "../types/messaging";

export interface ScheduleMessageInput {
  id: string;
  conversationId: string;
  name: string;
  body: string;
  attachments?: MessageAttachment[];
  scheduledFor: string;
  frequency?: ScheduleFrequency;
  enabled?: boolean;
  createdByUserId: string;
  createdByName?: string;
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
  return canManageConversation && AUTHORIZED_ROLES.has(normalizeUserRole(role));
}

export function createScheduledMessage(
  input: ScheduleMessageInput
): ScheduledMessage {
  if (!canScheduleMessages(input.role, input.canManageConversation)) {
    throw new Error(
      "Seuls les Capitaines, Amiraux et Visionnaires responsables de ce groupe peuvent créer une automatisation."
    );
  }
  const cleanName = input.name.trim();
  if (cleanName.length < 3) {
    throw new Error("Donnez un nom explicite à l’automatisation.");
  }
  const cleanBody = input.body.trim();
  const attachments = input.attachments ?? [];
  if (!cleanBody && attachments.length === 0) {
    throw new Error("Le message automatisé ne peut pas être vide.");
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
    throw new Error("Une automatisation ne peut pas démarrer plus d’un an à l’avance.");
  }

  return {
    id: input.id,
    conversationId: input.conversationId,
    name: cleanName,
    body: cleanBody,
    attachments,
    scheduledFor: scheduledAt.toISOString(),
    frequency: input.frequency ?? "once",
    enabled: input.enabled ?? true,
    createdByUserId: input.createdByUserId,
    createdByName: input.createdByName,
    status: input.enabled === false ? "paused" : "scheduled"
  };
}
