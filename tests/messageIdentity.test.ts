import { strictEqual } from "node:assert";
import test from "node:test";

import {
  hasKnownMessage,
  rememberMessage,
  rememberMessages
} from "../src/domain/messageIdentity";

test("reconnaît un rejeu par identifiant serveur", () => {
  const known = new Set<string>();
  rememberMessage(known, { id: "server-1" });

  strictEqual(hasKnownMessage(known, { id: "server-1" }), true);
  strictEqual(hasKnownMessage(known, { id: "server-2" }), false);
});

test("réconcilie le message optimiste avec la réponse serveur par clientMessageId", () => {
  const known = new Set<string>();
  rememberMessage(known, { id: "local-1", clientMessageId: "client-1" });

  strictEqual(
    hasKnownMessage(known, { id: "server-1", clientMessageId: "client-1" }),
    true
  );
});

test("mémorise un lot REST sans perdre les deux identités", () => {
  const known = new Set<string>();
  rememberMessages(known, [
    { id: "server-1", clientMessageId: "client-1" },
    { id: "server-2" }
  ]);

  strictEqual(known.has("id:server-1"), true);
  strictEqual(known.has("client:client-1"), true);
  strictEqual(known.has("id:server-2"), true);
});
