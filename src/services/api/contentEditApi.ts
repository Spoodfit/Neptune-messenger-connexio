import type { HighlightKind } from "../../types/experience";
import { authenticatedRequest } from "./authenticatedRequest";

export class ContentEditApi {
  constructor(private readonly fallbackAccessToken?: string | null) {}

  async editMessage(messageId: string, body: string): Promise<void> {
    await authenticatedRequest(
      `/v1/messages/${encodeURIComponent(messageId)}`,
      { method: "PATCH", body: JSON.stringify({ body: body.trim() }) },
      this.fallbackAccessToken
    );
  }

  async editHighlight(postId: string, body: string, kind: HighlightKind): Promise<void> {
    await authenticatedRequest(
      `/v1/highlights/${encodeURIComponent(postId)}`,
      { method: "PATCH", body: JSON.stringify({ body: body.trim(), kind }) },
      this.fallbackAccessToken
    );
  }

  async editComment(commentId: string, body: string): Promise<void> {
    await authenticatedRequest(
      `/v1/comments/${encodeURIComponent(commentId)}`,
      { method: "PATCH", body: JSON.stringify({ body: body.trim() }) },
      this.fallbackAccessToken
    );
  }
}
