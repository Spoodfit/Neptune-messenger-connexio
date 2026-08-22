import type {
  MessageAttachment,
  ModerationDecision,
  ScheduleFrequency,
  ScheduledMessage
} from "../../types/messaging";
import { authenticatedRequest } from "./authenticatedRequest";

interface ModerationWire {
  allowed?: unknown;
  category?: unknown;
  reason?: unknown;
  warning_level?: unknown;
  suspended_until?: unknown;
  requires_manual_review?: unknown;
}

interface ScheduledMessageWire {
  id?: unknown;
  conversation_id?: unknown;
  name?: unknown;
  body?: unknown;
  attachments?: unknown;
  scheduled_for?: unknown;
  frequency?: unknown;
  enabled?: unknown;
  created_by_user_id?: unknown;
  created_by_name?: unknown;
  updated_by_user_id?: unknown;
  status?: unknown;
}

function normalizeModeration(payload: ModerationWire): ModerationDecision {
  return {
    allowed: payload.allowed === true,
    category:
      typeof payload.category === "string"
        ? (payload.category as ModerationDecision["category"])
        : undefined,
    reason: typeof payload.reason === "string" ? payload.reason : undefined,
    warningLevel:
      payload.warning_level === 1 ||
      payload.warning_level === 2 ||
      payload.warning_level === 3
        ? payload.warning_level
        : undefined,
    suspendedUntil:
      typeof payload.suspended_until === "string"
        ? payload.suspended_until
        : undefined,
    requiresManualReview: payload.requires_manual_review === true
  };
}

function normalizeFrequency(value: unknown): ScheduleFrequency {
  return value === "daily" || value === "weekly" || value === "monthly"
    ? value
    : "once";
}

function normalizeScheduledMessage(
  payload: ScheduledMessageWire,
  fallback: {
    conversationId: string;
    name: string;
    body: string;
    attachments: MessageAttachment[];
    scheduledFor: string;
    frequency: ScheduleFrequency;
    enabled: boolean;
  }
): ScheduledMessage {
  if (typeof payload.id !== "string" || !payload.id) {
    throw new Error("Réponse d’automatisation invalide : identifiant manquant.");
  }
  const enabled =
    typeof payload.enabled === "boolean" ? payload.enabled : fallback.enabled;
  return {
    id: payload.id,
    conversationId:
      typeof payload.conversation_id === "string"
        ? payload.conversation_id
        : fallback.conversationId,
    name: typeof payload.name === "string" ? payload.name : fallback.name,
    body: typeof payload.body === "string" ? payload.body : fallback.body,
    attachments: Array.isArray(payload.attachments)
      ? (payload.attachments as MessageAttachment[])
      : fallback.attachments,
    scheduledFor:
      typeof payload.scheduled_for === "string"
        ? payload.scheduled_for
        : fallback.scheduledFor,
    frequency: normalizeFrequency(payload.frequency ?? fallback.frequency),
    enabled,
    createdByUserId:
      typeof payload.created_by_user_id === "string"
        ? payload.created_by_user_id
        : "current-user",
    createdByName:
      typeof payload.created_by_name === "string"
        ? payload.created_by_name
        : undefined,
    updatedByUserId:
      typeof payload.updated_by_user_id === "string"
        ? payload.updated_by_user_id
        : undefined,
    status:
      payload.status === "sending" ||
      payload.status === "sent" ||
      payload.status === "cancelled" ||
      payload.status === "failed" ||
      payload.status === "paused"
        ? payload.status
        : enabled
          ? "scheduled"
          : "paused"
  };
}

export interface ScheduledAutomationInput {
  conversationId: string;
  name: string;
  body: string;
  attachments?: MessageAttachment[];
  scheduledFor: string;
  frequency?: ScheduleFrequency;
  enabled?: boolean;
}

export class NeptuneGovernanceApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async moderateContent(
    conversationId: string,
    body: string,
    attachmentNames: string[] = []
  ): Promise<ModerationDecision> {
    const payload = await authenticatedRequest<ModerationWire>(
      "/v1/moderation/evaluate",
      {
        method: "POST",
        body: JSON.stringify({
          conversation_id: conversationId,
          body,
          attachment_names: attachmentNames
        })
      },
      this.fallbackAccessToken
    );
    return normalizeModeration(payload);
  }

  async scheduleMessage(input: ScheduledAutomationInput): Promise<ScheduledMessage> {
    const attachments = input.attachments ?? [];
    const frequency = input.frequency ?? "once";
    const enabled = input.enabled ?? true;
    const payload = await authenticatedRequest<ScheduledMessageWire>(
      `/v1/conversations/${encodeURIComponent(input.conversationId)}/scheduled-messages`,
      {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          body: input.body,
          attachments,
          scheduled_for: input.scheduledFor,
          frequency,
          enabled
        })
      },
      this.fallbackAccessToken
    );
    return normalizeScheduledMessage(payload, {
      conversationId: input.conversationId,
      name: input.name,
      body: input.body,
      attachments,
      scheduledFor: input.scheduledFor,
      frequency,
      enabled
    });
  }

  async updateScheduledMessage(
    scheduledMessageId: string,
    input: ScheduledAutomationInput
  ): Promise<ScheduledMessage> {
    const attachments = input.attachments ?? [];
    const frequency = input.frequency ?? "once";
    const enabled = input.enabled ?? true;
    const payload = await authenticatedRequest<ScheduledMessageWire>(
      `/v1/conversations/${encodeURIComponent(input.conversationId)}/scheduled-messages/${encodeURIComponent(scheduledMessageId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          name: input.name,
          body: input.body,
          attachments,
          scheduled_for: input.scheduledFor,
          frequency,
          enabled
        })
      },
      this.fallbackAccessToken
    );
    return normalizeScheduledMessage(payload, {
      conversationId: input.conversationId,
      name: input.name,
      body: input.body,
      attachments,
      scheduledFor: input.scheduledFor,
      frequency,
      enabled
    });
  }

  async setScheduledMessageEnabled(
    conversationId: string,
    scheduledMessageId: string,
    enabled: boolean
  ): Promise<void> {
    await authenticatedRequest(
      `/v1/conversations/${encodeURIComponent(conversationId)}/scheduled-messages/${encodeURIComponent(scheduledMessageId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled })
      },
      this.fallbackAccessToken
    );
  }

  async cancelScheduledMessage(
    conversationId: string,
    scheduledMessageId: string
  ): Promise<void> {
    await authenticatedRequest(
      `/v1/conversations/${encodeURIComponent(conversationId)}/scheduled-messages/${encodeURIComponent(scheduledMessageId)}`,
      { method: "DELETE" },
      this.fallbackAccessToken
    );
  }

  async listScheduledMessages(
    conversationId: string
  ): Promise<ScheduledMessage[]> {
    const payload = await authenticatedRequest<ScheduledMessageWire[]>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/scheduled-messages`,
      { method: "GET" },
      this.fallbackAccessToken
    );
    return payload.map((item) =>
      normalizeScheduledMessage(item, {
        conversationId,
        name: "Automatisation du groupe",
        body: "",
        attachments: [],
        scheduledFor: new Date().toISOString(),
        frequency: "once",
        enabled: true
      })
    );
  }
}
