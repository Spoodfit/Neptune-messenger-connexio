"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const moderation_1 = require("../src/domain/moderation");
(0, node_test_1.default)("une insulte déclenche le premier avertissement sans suspension", () => {
    const decision = (0, moderation_1.evaluateModeration)({
        body: "Tu es vraiment un abruti.",
        warningCount: 0,
        now: new Date("2026-08-02T12:00:00.000Z")
    });
    strict_1.default.equal(decision.allowed, false);
    strict_1.default.equal(decision.category, "insult");
    strict_1.default.equal(decision.warningLevel, 1);
    strict_1.default.equal(decision.suspendedUntil, undefined);
});
(0, node_test_1.default)("le deuxième avertissement suspend le compte pendant vingt-quatre heures", () => {
    const decision = (0, moderation_1.evaluateModeration)({
        body: "Vous devez payer maintenant.",
        warningCount: 1,
        now: new Date("2026-08-02T12:00:00.000Z")
    });
    strict_1.default.equal(decision.warningLevel, 2);
    strict_1.default.equal(decision.suspendedUntil, "2026-08-03T12:00:00.000Z");
});
(0, node_test_1.default)("le troisième avertissement exige une levée manuelle", () => {
    const decision = (0, moderation_1.evaluateModeration)({
        body: "PROMO PROMO PROMO WWW.EXAMPLE.COM WWW.EXAMPLE.COM WWW.EXAMPLE.COM WWW.EXAMPLE.COM",
        warningCount: 2
    });
    strict_1.default.equal(decision.allowed, false);
    strict_1.default.equal(decision.warningLevel, 3);
    strict_1.default.equal(decision.requiresManualReview, true);
});
(0, node_test_1.default)("une publicité répétée trois fois est bloquée", () => {
    const body = "Offre spéciale : réservez votre place sur https://example.com";
    const decision = (0, moderation_1.evaluateModeration)({
        body,
        recentBodies: [body, body],
        warningCount: 0
    });
    strict_1.default.equal(decision.allowed, false);
    strict_1.default.equal(decision.category, "repeated_advertising");
});
(0, node_test_1.default)("un message professionnel normal reste autorisé", () => {
    const decision = (0, moderation_1.evaluateModeration)({
        body: "Bonjour, êtes-vous disponible mardi pour revoir le devis ?",
        warningCount: 0
    });
    strict_1.default.deepEqual(decision, { allowed: true });
});
