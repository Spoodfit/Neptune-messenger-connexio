import { strictEqual, throws } from "node:assert";
import test from "node:test";

import {
  normalizeChatMessage,
  normalizeConversationList,
  WireValidationError
} from "../src/services/api/wire";
import { formatConversationTime, formatMessageTime } from "../src/utils/date";

const validMessage = {
  id: "message-1",
  conversation_id: "club",
  sender_id: "user-1",
  body: "Bonjour",
  created_at: "2026-07-30T10:00:00.000Z"
};

test("refuse les dates de messages invalides à la frontière réseau", () => {
  throws(
    () => normalizeChatMessage({ ...validMessage, created_at: "pas-une-date" }),
    WireValidationError
  );
  throws(
    () => normalizeChatMessage({ ...validMessage, updated_at: "pas-une-date" }),
    WireValidationError
  );
});

test("refuse une date de dernière activité invalide", () => {
  throws(
    () =>
      normalizeConversationList([
        {
          id: "club",
          name: "Club Neptune",
          type: "city",
          last_message_at: "pas-une-date"
        }
      ]),
    WireValidationError
  );
});

test("les formateurs UI restent défensifs", () => {
  strictEqual(formatMessageTime("pas-une-date"), "Heure inconnue");
  strictEqual(formatConversationTime("pas-une-date"), "");
  strictEqual(formatConversationTime(), "");
});
