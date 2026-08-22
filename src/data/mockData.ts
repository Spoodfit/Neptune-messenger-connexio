import * as base from "./BaseMockData";
import type { ChatMessage } from "../types/messaging";

export const currentUser = base.currentUser;
export const members = base.members;
export const conversations = base.conversations;

function withTranslationDemo(message: ChatMessage): ChatMessage {
  if (message.id !== "m-1") return message;
  return {
    ...message,
    body: "Who will be at the next afterwork? I can welcome the new members.",
    sourceLanguage: "en",
    translation: {
      sourceLanguage: "en",
      targetLanguage: "fr",
      body: "Qui sera présent au prochain afterwork ? Je peux accueillir les nouveaux membres.",
      status: "ready",
      generatedAt: "2026-08-13T13:10:00.000Z"
    }
  };
}

export const messagesByConversation: Record<string, ChatMessage[]> =
  Object.fromEntries(
    Object.entries(base.messagesByConversation).map(([conversationId, messages]) => [
      conversationId,
      messages.map(withTranslationDemo)
    ])
  );
