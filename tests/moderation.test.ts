import assert from "node:assert/strict";
import test from "node:test";

import { evaluateModeration } from "../src/domain/moderation";

test("une insulte déclenche le premier avertissement sans suspension", () => {
  const decision = evaluateModeration({
    body: "Tu es vraiment un abruti.",
    warningCount: 0,
    now: new Date("2026-08-02T12:00:00.000Z")
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.category, "insult");
  assert.equal(decision.warningLevel, 1);
  assert.equal(decision.suspendedUntil, undefined);
});

test("le deuxième avertissement suspend le compte pendant vingt-quatre heures", () => {
  const decision = evaluateModeration({
    body: "Vous devez payer maintenant.",
    warningCount: 1,
    now: new Date("2026-08-02T12:00:00.000Z")
  });
  assert.equal(decision.warningLevel, 2);
  assert.equal(decision.suspendedUntil, "2026-08-03T12:00:00.000Z");
});

test("le troisième avertissement exige une levée manuelle", () => {
  const decision = evaluateModeration({
    body: "PROMO PROMO PROMO WWW.EXAMPLE.COM WWW.EXAMPLE.COM WWW.EXAMPLE.COM WWW.EXAMPLE.COM",
    warningCount: 2
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.warningLevel, 3);
  assert.equal(decision.requiresManualReview, true);
});

test("une publicité répétée trois fois est bloquée", () => {
  const body = "Offre spéciale : réservez votre place sur https://example.com";
  const decision = evaluateModeration({
    body,
    recentBodies: [body, body],
    warningCount: 0
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.category, "repeated_advertising");
});

test("un message professionnel normal reste autorisé", () => {
  const decision = evaluateModeration({
    body: "Bonjour, êtes-vous disponible mardi pour revoir le devis ?",
    warningCount: 0
  });
  assert.deepEqual(decision, { allowed: true });
});
