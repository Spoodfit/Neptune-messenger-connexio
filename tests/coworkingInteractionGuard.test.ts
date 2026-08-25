import { strictEqual } from "node:assert";
import { beforeEach, test } from "node:test";

import {
  acceptIncomingCoworkingInteraction,
  interactionCooldownRemaining,
  releaseCoworkingInteraction,
  reserveCoworkingInteraction,
  resetCoworkingInteractionGuard
} from "../src/services/coworking/coworkingInteractionGuard";

beforeEach(resetCoworkingInteractionGuard);

test("un bonjour ne peut pas être renvoyé au même espace pendant 30 secondes", () => {
  strictEqual(reserveCoworkingInteraction("hello", "space:s1", 1_000).allowed, true);
  const blocked = reserveCoworkingInteraction("hello", "space:s1", 2_000);
  strictEqual(blocked.allowed, false);
  if (!blocked.allowed) strictEqual(blocked.remainingMs, 29_000);
  strictEqual(interactionCooldownRemaining("hello", "space:s1", 31_000), 0);
});

test("un échec réseau libère la réservation pour permettre une reprise immédiate", () => {
  reserveCoworkingInteraction("knock", "user:u1", 1_000);
  releaseCoworkingInteraction("knock", "user:u1");
  strictEqual(reserveCoworkingInteraction("knock", "user:u1", 1_001).allowed, true);
});

test("les répétitions temps réel ne rejouent ni animation ni son", () => {
  strictEqual(acceptIncomingCoworkingInteraction("knock", "request:r1", 1_000), true);
  strictEqual(acceptIncomingCoworkingInteraction("knock", "request:r1", 2_000), false);
  strictEqual(acceptIncomingCoworkingInteraction("knock", "request:r1", 61_000), true);
});
