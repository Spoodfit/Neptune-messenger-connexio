import type {
  MessageAttachment,
  ModerationDecision,
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
  body?: unknown;
  attachments?: unknown;
  scheduled_for?: unknown;
  created_by_user_id?: unknown;
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

function normalizeScheduledMessage(
  payload: ScheduledMessageWire,
  fallback: {
    conversationId: string;
    body: string;
    attachments: MessageAttachment[];
    scheduledFor: string;
  }
): ScheduledMessage {
  if (typeof payload.id !== "string" || !payload.id) {
    throw new Error("Réponse de programmation invalide : identifiant manquant.");
  }
  return {
    id: payload.id,
    conversationId:
      typeof payload.conversation_id === "string"
        ? payload.conversation_id
        : fallback.conversationId,
    body: typeof payload.body === "string" ? payload.body : fallback.body,
    attachments: Array.isArray(payload.attachments)
      ? (payload.attachments as MessageAttachment[])
      : fallback.attachments,
    scheduledFor:
      typeof payload.scheduled_for === "string"
        ? payload.scheduled_for
        : fallback.scheduledFor,
    createdByUserId:
      typeof payload.created_by_user_id === "string"
        ? payload.created_by_user_id
        : "current-user",
    status:
      payload.status === "sending" ||
      payload.status === "sent" ||
      payload.status === "cancelled" ||
      payload.status === "failed"
        ? payload.status
        : "scheduled"
  };
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

  async scheduleMessage(input: {
    conversationId: string;
    body: string;
    attachments?: MessageAttachment[];
    scheduledFor: string;
  }): Promise<ScheduledMessage> {
    const attachments = input.attachments ?? [];
    const payload = await authenticatedRequest<ScheduledMessageWire>(
      `/v1/conversations/${encodeURIComponent(input.conversationId)}/scheduled-messages`,
      {
        method: "POST",
        body: JSON.stringify({
          body: input.body,
          attachments,
          scheduled_for: input.scheduledFor
        })
      },
      this.fallbackAccessToken
    );
    return normalizeScheduledMessage(payload, {
      conversationId: input.conversationId,
      body: input.body,
      attachments,
      scheduledFor: input.scheduledFor
    });
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
    return authenticatedRequest<ScheduledMessage[]>(
      `/v1/conversations/${encodeURIComponent(conversationId)}/scheduled-messages`,
      { method: "GET" },
      this.fallbackAccessToken
    );
  }
}
