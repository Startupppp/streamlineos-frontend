"use client";

import dynamic from "next/dynamic";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { cn } from "@/lib/utils";

const TiptapEditorDynamic = dynamic(
  () => import("./tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => <div className="h-4 animate-pulse rounded bg-muted/40" />,
  },
);

function isHtmlContent(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith("<") && /<\/[a-z]/i.test(trimmed);
}

function looksLikeMarkdown(content: string): boolean {
  if (isHtmlContent(content)) return false;
  return /(^|\n)(#{1,6}\s|[-*+]\s|\d+\.\s|>|```)|(\*\*|__|`[^`])/m.test(content);
}

interface RichTextContentProps {
  content: string;
  className?: string;
  contentKey?: string | number;
}

export function RichTextContent({ content, className, contentKey }: RichTextContentProps) {
  if (!content) return null;

  if (looksLikeMarkdown(content)) {
    return (
      <div className={cn("text-[13px] text-foreground/90 break-words", className)}>
        <MarkdownContent content={content} />
      </div>
    );
  }

  return (
    <div className={cn("mt-0.5 break-words", className)}>
      <TiptapEditorDynamic
        content={content}
        contentKey={contentKey}
        editable={false}
        embedded
        minHeightClassName="min-h-0"
      />
    </div>
  );
}
