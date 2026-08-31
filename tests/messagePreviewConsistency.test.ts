import { ok } from "node:assert";
import { test } from "node:test";

import { conversations, messagesByConversation } from "../src/data/mockData";

test("chaque aperçu de conversation de démonstration ouvre sur du contenu réel", () => {
  for (const conversation of conversations) {
    if (!conversation.lastMessage) continue;
    const messages = messagesByConversation[conversation.id] ?? [];
    ok(messages.length > 0, `${conversation.name} affiche un aperçu mais aucune conversation`);
    ok(messages.some((message) => Boolean(message.body.trim() || message.poll || message.attachments?.length)), `${conversation.name} affiche un aperçu mais aucun contenu ouvrable`);
  }
});
