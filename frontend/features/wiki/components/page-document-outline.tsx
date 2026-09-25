"use client";

import { cn } from "@/lib/utils";

type HeadingLevel = 1 | 2 | 3;

export interface OutlineHeading {
  level: HeadingLevel;
  text: string;
  index: number;
}

type SlateLeaf = { text?: string; [key: string]: unknown };
type SlateHeadingNode = { type?: string; children?: SlateLeaf[]; [key: string]: unknown };

function nodeText(node: SlateHeadingNode): string {
  if (!Array.isArray(node.children)) return "";
  return node.children.map((leaf) => (typeof leaf.text === "string" ? leaf.text : "")).join("");
}

function headingLevelOf(type: unknown): HeadingLevel | null {
  if (type === "h1") return 1;
  if (type === "h2") return 2;
  if (type === "h3") return 3;
  return null;
}

export function extractHeadings(content: unknown): OutlineHeading[] {
  if (!Array.isArray(content)) return [];
  const headings: OutlineHeading[] = [];
  let index = 0;
  for (const node of content) {
    if (typeof node !== "object" || node === null) continue;
    const level = headingLevelOf((node as SlateHeadingNode).type);
    if (level === null) continue;
    headings.push({ level, text: nodeText(node as SlateHeadingNode).trim(), index: index++ });
  }
  return headings;
}

const LEVEL_INDENT: Record<HeadingLevel, string> = {
  1: "",
  2: "pl-3",
  3: "pl-6",
};

interface PageDocumentOutlineProps {
  content: unknown;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function PageDocumentOutline({ content, containerRef }: PageDocumentOutlineProps) {
  const headings = extractHeadings(content);
  if (headings.length === 0) return null;

  function handleHeadingClick(e: React.MouseEvent<HTMLButtonElement>) {
    const indexAttr = e.currentTarget.dataset.headingIndex;
    if (indexAttr === undefined) return;
    const container = containerRef.current;
    if (!container) return;
    const nodes = container.querySelectorAll("h1, h2, h3");
    const target = nodes[Number(indexAttr)];
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <nav
      aria-label="Page outline"
      className="mb-4 space-y-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2"
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Outline
      </p>
      <ul className="space-y-0.5">
        {headings.map((heading) => (
          <li key={heading.index}>
            <button
              type="button"
              data-heading-index={heading.index}
              onClick={handleHeadingClick}
              className={cn(
                "block w-full truncate text-left text-xs text-muted-foreground transition-colors hover:text-foreground",
                heading.level === 1 && "font-medium text-foreground",
                LEVEL_INDENT[heading.level],
              )}
            >
              {heading.text || "Untitled heading"}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
