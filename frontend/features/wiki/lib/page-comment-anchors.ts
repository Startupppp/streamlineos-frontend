import { extractBlocks } from "./version-diff";

export const ANCHOR_QUOTE_MAX_LENGTH = 280;
export const ANCHOR_TARGET_CAP = 25;

export interface CommentAnchorTarget {
  blockIndex: number;
  quote: string;
}

export type PageAnchorContent =
  | Record<string, unknown>
  | Record<string, unknown>[]
  | null;

export function extractCommentAnchorTargets(
  content: PageAnchorContent,
): CommentAnchorTarget[] {
  return extractBlocks(content)
    .map((block, blockIndex) => ({
      blockIndex,
      quote: block.text.slice(0, ANCHOR_QUOTE_MAX_LENGTH),
    }))
    .filter((target) => target.quote.length > 0)
    .slice(0, ANCHOR_TARGET_CAP);
}

export function findCommentAnchorTarget(
  targets: readonly CommentAnchorTarget[],
  blockIndex: number | null,
): CommentAnchorTarget | null {
  if (blockIndex === null) return null;
  return targets.find((target) => target.blockIndex === blockIndex) ?? null;
}
