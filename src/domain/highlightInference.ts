import type { HighlightKind, HighlightPost } from "../types/experience";

type WeightedPattern = readonly [RegExp, number];

const NEED_PATTERNS: WeightedPattern[] = [
  [/\bj['’ ]?ai besoin\b/iu, 5],
  [/\b(?:je )?(?:cherche|recherche)\b/iu, 4],
  [/\b(?:à la recherche|besoin de|besoin d['’])\b/iu, 4],
  [/\bqui (?:conna[iî]t|peut|aurait|sait|recommande)\b/iu, 3],
  [/\b(?:contact|recommandation|mise en relation|coup de main)\b/iu, 2],
  [/\b(?:aidez[- ]?moi|quelqu['’]un pour|je voudrais trouver|je souhaite trouver)\b/iu, 3]
];
const SUCCESS_PATTERNS: WeightedPattern[] = [
  [/\b(?:bonne nouvelle|objectif atteint|on l['’ ]?a fait)\b/iu, 5],
  [/\b(?:réussi|réussite|victoire|fier|fière|heureux|heureuse)\b/iu, 4],
  [/\b(?:signé|signature|nouveau client|nouvelle cliente|contrat signé|levée|lancement réussi)\b/iu, 3],
  [/\b(?:merci à|bravo|célébrer|célébration)\b/iu, 2]
];
const OFFER_PATTERNS: WeightedPattern[] = [
  [/\bje (?:propose|peux aider|peux vous aider|mets à disposition|offre)\b/iu, 5],
  [/\b(?:offre spéciale|opportunité|promo|promotion|réduction|avantage)\b/iu, 4],
  [/\b(?:places? disponibles?|créneaux? disponibles?|disponible pour vous aider)\b/iu, 3],
  [/\b(?:service|prestation|accompagnement) (?:disponible|proposé)\b/iu, 3],
  [/\b(?:je vous offre|je vous propose|profitez de)\b/iu, 4]
];

function score(value: string, patterns: readonly WeightedPattern[]): number {
  return patterns.reduce((total, [pattern, weight]) => total + (pattern.test(value) ? weight : 0), 0);
}

export interface HighlightInference {
  kind: HighlightKind;
  confidence: "low" | "medium" | "high";
  scores: Record<Exclude<HighlightKind, "standard">, number>;
}

export function inferHighlight(body: string): HighlightInference {
  const value = body.trim();
  if (!value) return { kind: "standard", confidence: "low", scores: { besoin: 0, reussite: 0, offre: 0 } };
  const scores = {
    besoin: score(value, NEED_PATTERNS),
    reussite: score(value, SUCCESS_PATTERNS),
    offre: score(value, OFFER_PATTERNS)
  };
  const ranked = (Object.entries(scores) as Array<[keyof typeof scores, number]>).sort((left, right) => right[1] - left[1]);
  const [winner, winnerScore] = ranked[0] ?? ["besoin", 0];
  const runnerScore = ranked[1]?.[1] ?? 0;
  if (winnerScore <= 0) return { kind: "standard", confidence: "low", scores };
  const gap = winnerScore - runnerScore;
  const confidence: HighlightInference["confidence"] = winnerScore >= 5 && gap >= 2 ? "high" : winnerScore >= 3 ? "medium" : "low";
  return { kind: winner as HighlightKind, confidence, scores };
}

export function inferHighlightKind(body: string): HighlightKind {
  return inferHighlight(body).kind;
}

export function highlightEngagementScore(post: HighlightPost): number {
  const reactions = post.reactions.reduce((sum, reaction) => sum + reaction.count, 0);
  return reactions + post.comments.length * 2 + post.shareCount * 3;
}

export function popularHighlightIds(posts: readonly HighlightPost[]): Set<string> {
  const ranked = posts
    .map((post) => ({ id: post.id, score: highlightEngagementScore(post) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);
  if (!ranked.length) return new Set();
  const count = Math.max(1, Math.ceil(ranked.length * 0.2));
  return new Set(ranked.slice(0, count).map((item) => item.id));
}
