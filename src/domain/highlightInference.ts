import type { HighlightKind, HighlightPost } from "../types/experience";

const NEED_PATTERNS = [
  /\bje (?:cherche|recherche|voudrais|souhaite|cherche à)\b/iu,
  /\bj['’ ]?ai besoin\b/iu,
  /\bbesoin de\b/iu,
  /\bqui (?:conna[iî]t|peut|aurait|sait)\b/iu,
  /\bcontact(?:er)?\b/iu,
  /\brecommand(?:ation|er)\b/iu,
  /\baidez[- ]?moi\b/iu
];
const SUCCESS_PATTERNS = [
  /\bbonne nouvelle\b/iu,
  /\bobjectif atteint\b/iu,
  /\b(?:fier|fière|heureux|heureuse)\b/iu,
  /\b(?:réussi|réussite|victoire|signé|signature|lancement|nouveau client|nouvelle cliente)\b/iu,
  /\bon l['’ ]?a fait\b/iu
];
const OFFER_PATTERNS = [
  /\bje (?:propose|peux aider|mets à disposition|offre)\b/iu,
  /\b(?:offre|opportunité|promo|réduction|avantage|disponible|places? disponibles?)\b/iu,
  /\b(?:service|prestation) disponible\b/iu
];

function matchesAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function inferHighlightKind(body: string): HighlightKind {
  const value = body.trim();
  if (!value) return "standard";
  if (matchesAny(value, NEED_PATTERNS)) return "besoin";
  if (matchesAny(value, SUCCESS_PATTERNS)) return "reussite";
  if (matchesAny(value, OFFER_PATTERNS)) return "offre";
  return "standard";
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
