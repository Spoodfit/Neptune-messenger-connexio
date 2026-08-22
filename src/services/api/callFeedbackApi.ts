import { authenticatedRequest } from "./authenticatedRequest";

export interface CallFeedbackInput {
  memberId?: string;
  rating: number;
  note?: string;
  tags?: string[];
}

export class CallFeedbackApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async submit(callId: string, input: CallFeedbackInput): Promise<void> {
    await authenticatedRequest(
      `/v1/calls/${encodeURIComponent(callId)}/feedback`,
      {
        method: "POST",
        body: JSON.stringify({
          member_id: input.memberId,
          rating: Math.max(1, Math.min(5, Math.round(input.rating))),
          note: input.note?.trim() || undefined,
          tags: input.tags ?? [],
          source: "connexio",
          sync_target: "neptune-business-reputation"
        })
      },
      this.fallbackAccessToken
    );
  }
}
