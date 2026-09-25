type TipTapNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
};

type SlateNode = {
  text?: string;
  type?: string;
  children?: SlateNode[];
  [k: string]: unknown;
};

export type ContentBlock = {
  type: string;
  text: string;
};

export type BlockKind = "added" | "removed" | "changed" | "unchanged";

export type BlockDiff = {
  kind: BlockKind;
  type: string;
  text: string;
  altText?: string;
};

export type VersionDiff = {
  titleChanged: boolean;
  oldTitle: string;
  newTitle: string;
  blocks: BlockDiff[];
  addedCount: number;
  removedCount: number;
  changedCount: number;
};

function tipTapBlockText(node: TipTapNode): string {
  if (typeof node.text === "string") return node.text;
  if (!node.content) return "";
  return node.content.map(tipTapBlockText).join("");
}

function slateNodeText(node: unknown): string {
  if (typeof node !== "object" || node === null) return "";
  const n = node as SlateNode;
  if (typeof n.text === "string") return n.text;
  if (Array.isArray(n.children)) return n.children.map(slateNodeText).join("");
  return "";
}

function extractTipTapBlocks(content: Record<string, unknown>): ContentBlock[] {
  const topLevel = Array.isArray(content.content) ? (content.content as TipTapNode[]) : [];
  return topLevel.map((node) => ({
    type: node.type ?? "paragraph",
    text: tipTapBlockText(node).replace(/\s+/g, " ").trim(),
  }));
}

function extractSlateBlocks(content: unknown[]): ContentBlock[] {
  return content.map((node) => {
    const n = node as SlateNode;
    return {
      type: typeof n.type === "string" ? n.type : "paragraph",
      text: slateNodeText(n).replace(/\s+/g, " ").trim(),
    };
  });
}

function extractBlocks(
  content: Record<string, unknown> | Record<string, unknown>[] | null,
): ContentBlock[] {
  if (!content) return [];
  if (Array.isArray(content)) return extractSlateBlocks(content);
  if (content.type === "doc") return extractTipTapBlocks(content);
  const roots = Array.isArray(content.children)
    ? content.children
    : Array.isArray(content.nodes)
      ? content.nodes
      : Array.isArray(content.root)
        ? content.root
        : null;
  if (roots) return extractSlateBlocks(roots as unknown[]);
  return [];
}

function textSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const matchLen = longer.length;
  let overlap = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] === longer[i]) overlap++;
  }
  return overlap / matchLen;
}

function lcs(a: ContentBlock[], b: ContentBlock[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1]?.type === b[j - 1]?.type && a[i - 1]?.text === b[j - 1]?.text) {
        dp[i]![j] = (dp[i - 1]![j - 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]![j] ?? 0, dp[i]![j - 1] ?? 0);
      }
    }
  }
  return dp;
}

function backtrack(
  dp: number[][],
  a: ContentBlock[],
  b: ContentBlock[],
  i: number,
  j: number,
  result: BlockDiff[],
): void {
  if (i === 0 && j === 0) return;
  if (i === 0) {
    backtrack(dp, a, b, i, j - 1, result);
    result.push({ kind: "added", type: b[j - 1]!.type, text: b[j - 1]!.text });
    return;
  }
  if (j === 0) {
    backtrack(dp, a, b, i - 1, j, result);
    result.push({ kind: "removed", type: a[i - 1]!.type, text: a[i - 1]!.text });
    return;
  }
  const aBlock = a[i - 1]!;
  const bBlock = b[j - 1]!;
  if (aBlock.type === bBlock.type && aBlock.text === bBlock.text) {
    backtrack(dp, a, b, i - 1, j - 1, result);
    result.push({ kind: "unchanged", type: aBlock.type, text: aBlock.text });
    return;
  }
  if ((dp[i - 1]![j] ?? 0) > (dp[i]![j - 1] ?? 0)) {
    backtrack(dp, a, b, i - 1, j, result);
    result.push({ kind: "removed", type: aBlock.type, text: aBlock.text });
  } else {
    backtrack(dp, a, b, i, j - 1, result);
    result.push({ kind: "added", type: bBlock.type, text: bBlock.text });
  }
}

function mergeAdjacentChanges(diffs: BlockDiff[]): BlockDiff[] {
  const result: BlockDiff[] = [];
  let i = 0;
  while (i < diffs.length) {
    const curr = diffs[i]!;
    const next = diffs[i + 1];
    if (curr.kind === "removed" && next?.kind === "added") {
      const similarity = textSimilarity(curr.text, next.text);
      if (similarity > 0.3) {
        result.push({
          kind: "changed",
          type: curr.type,
          text: next.text,
          altText: curr.text,
        });
        i += 2;
        continue;
      }
    }
    result.push(curr);
    i++;
  }
  return result;
}

export function computeVersionDiff(
  versionTitle: string,
  versionContent: Record<string, unknown> | Record<string, unknown>[] | null,
  currentTitle: string,
  currentContent: Record<string, unknown> | Record<string, unknown>[] | null,
): VersionDiff {
  const versionBlocks = extractBlocks(versionContent);
  const currentBlocks = extractBlocks(currentContent);

  const dp = lcs(versionBlocks, currentBlocks);
  const rawDiffs: BlockDiff[] = [];
  backtrack(dp, versionBlocks, currentBlocks, versionBlocks.length, currentBlocks.length, rawDiffs);
  const blocks = mergeAdjacentChanges(rawDiffs);

  const addedCount = blocks.filter((b) => b.kind === "added").length;
  const removedCount = blocks.filter((b) => b.kind === "removed").length;
  const changedCount = blocks.filter((b) => b.kind === "changed").length;

  return {
    titleChanged: versionTitle !== currentTitle,
    oldTitle: versionTitle,
    newTitle: currentTitle,
    blocks,
    addedCount,
    removedCount,
    changedCount,
  };
}
