"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateModeration = evaluateModeration;
const INSULTS = [
    "abruti",
    "connard",
    "connasse",
    "enfoire",
    "enfoiré",
    "idiot",
    "imbecile",
    "imbécile",
    "merdeux",
    "pute",
    "salope"
];
const FORCED_COMMERCIAL_PATTERNS = [
    /\btu dois (acheter|commander|signer|payer)\b/u,
    /\bvous devez (acheter|commander|signer|payer)\b/u,
    /\bpaie maintenant\b/u,
    /\bach[eè]te maintenant\b/u,
    /\bdernier rappel avant (majoration|suppression|fermeture)\b/u,
    /\boffre obligatoire\b/u
];
function normalizeText(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("fr")
        .replace(/\s+/g, " ")
        .trim();
}
function containsInsult(normalized) {
    return INSULTS.some((word) => new RegExp(`(^|[^a-z])${normalizeText(word)}([^a-z]|$)`, "u").test(normalized));
}
function containsForcedCommercialPressure(normalized) {
    return FORCED_COMMERCIAL_PATTERNS.some((pattern) => pattern.test(normalized));
}
function countLinks(value) {
    return value.match(/https?:\/\/|www\./giu)?.length ?? 0;
}
function looksLikeSpam(body, normalized) {
    const compactLength = normalized.replace(/\s/g, "").length;
    const uppercaseLetters = body.match(/[A-ZÀ-ÖØ-Þ]/g)?.length ?? 0;
    const letters = body.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g)?.length ?? 0;
    const uppercaseRatio = letters > 12 ? uppercaseLetters / letters : 0;
    return (countLinks(body) >= 4 ||
        /(.)\1{9,}/u.test(normalized) ||
        compactLength > 30 && uppercaseRatio > 0.72);
}
function isRepeatedAdvertising(normalized, recentBodies) {
    if (normalized.length < 18)
        return false;
    const duplicates = recentBodies
        .map(normalizeText)
        .filter((body) => body === normalized).length;
    const commercialSignal = /\b(prix|promo|offre|devis|acheter|commander|reservation|réservation|lien)\b/u.test(normalized) || countLinks(normalized) > 0;
    return commercialSignal && duplicates >= 2;
}
function penaltyForWarning(warningCount, now) {
    const nextWarning = Math.min(3, Math.max(1, warningCount + 1));
    if (nextWarning === 1)
        return { warningLevel: 1 };
    if (nextWarning === 2) {
        return {
            warningLevel: 2,
            suspendedUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
    }
    return {
        warningLevel: 3,
        requiresManualReview: true
    };
}
function blockedDecision(category, reason, input) {
    return {
        allowed: false,
        category,
        reason,
        ...penaltyForWarning(input.warningCount, input.now ?? new Date())
    };
}
function evaluateModeration(input) {
    const normalized = normalizeText(input.body);
    if (!normalized)
        return { allowed: true };
    if (containsInsult(normalized)) {
        return blockedDecision("insult", "Le message contient une insulte ou une formulation dégradante.", input);
    }
    if (containsForcedCommercialPressure(normalized)) {
        return blockedDecision("forced_commercial", "La sollicitation commerciale exerce une pression excessive sur le destinataire.", input);
    }
    if (isRepeatedAdvertising(normalized, input.recentBodies ?? [])) {
        return blockedDecision("repeated_advertising", "Une publicité identique a déjà été envoyée plusieurs fois récemment.", input);
    }
    if (looksLikeSpam(input.body, normalized)) {
        return blockedDecision("spam", "Le message présente des caractéristiques de spam ou de publication automatisée abusive.", input);
    }
    return { allowed: true };
}
