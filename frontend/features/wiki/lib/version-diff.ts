type TipTapNode = {
  type: string;
  text?: string;
  content?: TipTapNode[];
};

type SlateNode = {
  text?: string;
  children?: SlateNode[];
  [k: string]: unknown;
};

function extractTipTapText(nodes: TipTapNode[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (typeof node.text === "string") {
      parts.push(node.text);
    } else if (node.content) {
      parts.push(extractTipTapText(node.content));
    }
  }
  return parts.join(" ");
}

function extractSlateNodeText(node: unknown): string {
  if (typeof node !== "object" || node === null) return "";
  const n = node as SlateNode;
  if (typeof n.text === "string") return n.text;
  if (Array.isArray(n.children)) {
    return n.children.map(extractSlateNodeText).join(" ");
  }
  return "";
}

function contentToText(
  content: Record<string, unknown> | Record<string, unknown>[] | null,
): string {
  if (!content) return "";
  if (Array.isArray(content)) {
    return content
      .map(extractSlateNodeText)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (content.type === "doc" && Array.isArray(content.content)) {
    return extractTipTapText(content.content as TipTapNode[])
      .replace(/\s+/g, " ")
      .trim();
  }
  const roots = Array.isArray(content.children)
    ? content.children
    : Array.isArray(content.nodes)
      ? content.nodes
      : Array.isArray(content.root)
        ? content.root
        : [];
  return (roots as unknown[])
    .map(extractSlateNodeText)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
}

function findExcerpt(currentText: string, versionText: string): string | null {
  const minLen = Math.min(currentText.length, versionText.length);
  for (let i = 0; i < minLen; i++) {
    if (currentText[i] !== versionText[i]) {
      const start = Math.max(0, i - 20);
      return versionText.slice(start, start + 200);
    }
  }
  if (currentText.length !== versionText.length) {
    const start = Math.max(0, minLen - 20);
    return versionText.slice(start, start + 200);
  }
  return null;
}

export interface VersionDiff {
  titleChanged: boolean;
  oldTitle: string;
  newTitle: string;
  versionWordCount: number;
  currentWordCount: number;
  wordCountDelta: number;
  excerpt: string | null;
}

export function computeVersionDiff(
  versionTitle: string,
  versionContent: Record<string, unknown> | Record<string, unknown>[] | null,
  currentTitle: string,
  currentContentText: string | null,
): VersionDiff {
  const versionText = contentToText(versionContent);
  const currentText = currentContentText ?? "";

  return {
    titleChanged: versionTitle !== currentTitle,
    oldTitle: versionTitle,
    newTitle: currentTitle,
    versionWordCount: wordCount(versionText),
    currentWordCount: wordCount(currentText),
    wordCountDelta: wordCount(versionText) - wordCount(currentText),
    excerpt: findExcerpt(currentText, versionText),
  };
}
