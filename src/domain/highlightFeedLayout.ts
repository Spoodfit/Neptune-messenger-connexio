import { popularHighlightIds } from "./highlightInference";
import type { HighlightPost } from "../types/experience";

export type HighlightFeedBlock =
  | { id: string; kind: "wide"; post: HighlightPost }
  | { id: string; kind: "masonry"; left: HighlightPost[]; right: HighlightPost[]; showAdvantage: boolean; advantageColumn: "left" | "right" };

function estimatedCompactHeight(post: HighlightPost): number {
  const bodyLines = Math.min(5, Math.max(1, Math.ceil(post.body.length / 34)));
  const media = post.media ? (post.media.kind === "video" ? 150 : 125) : 0;
  return 145 + bodyLines * 20 + media + Math.min(48, post.reactions.length * 10 + post.comments.length * 3);
}

export function shouldHighlightBeWide(post: HighlightPost, popularIds: ReadonlySet<string>): boolean {
  if (post.kind === "besoin") return true;
  if (popularIds.has(post.id)) return true;
  if (post.media?.kind === "video") return true;
  if (post.media && (post.media.height ?? 0) > (post.media.width ?? 0) * 1.35) return true;
  return false;
}

export function buildHighlightFeedBlocks(posts: readonly HighlightPost[]): HighlightFeedBlock[] {
  const sorted = [...posts].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const popular = popularHighlightIds(sorted);
  const blocks: HighlightFeedBlock[] = [];
  let compactRun: HighlightPost[] = [];

  const flushCompactRun = () => {
    if (!compactRun.length) return;
    const left: HighlightPost[] = [];
    const right: HighlightPost[] = [];
    let leftHeight = 0;
    let rightHeight = 0;
    for (const post of compactRun) {
      const height = estimatedCompactHeight(post);
      if (leftHeight <= rightHeight) {
        left.push(post);
        leftHeight += height;
      } else {
        right.push(post);
        rightHeight += height;
      }
    }
    blocks.push({
      id: `masonry-${compactRun.map((post) => post.id).join("-")}`,
      kind: "masonry",
      left,
      right,
      showAdvantage: compactRun.length % 4 !== 0 || Math.abs(leftHeight - rightHeight) > 150,
      advantageColumn: leftHeight <= rightHeight ? "left" : "right"
    });
    compactRun = [];
  };

  for (const post of sorted) {
    if (shouldHighlightBeWide(post, popular)) {
      flushCompactRun();
      blocks.push({ id: `wide-${post.id}`, kind: "wide", post });
    } else compactRun.push(post);
  }
  flushCompactRun();
  return blocks;
}
