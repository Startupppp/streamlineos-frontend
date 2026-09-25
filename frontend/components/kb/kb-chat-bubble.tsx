"use client";

import { motion } from "framer-motion";
import { BookOpenTextIcon } from "@animateicons/react/lucide";
import { Building2 } from "lucide-react";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { KbAskCitation } from "@/types/kb";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: KbAskCitation[];
  isError?: boolean;
  createdAt?: string;
}

export function ChatBubble({
  message,
  onCitation,
  reduce,
  actions,
}: {
  message: ChatMessage;
  onCitation?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  reduce: boolean;
  actions?: React.ReactNode;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      {isUser ? (
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
          {message.content}
        </div>
      ) : (
        <div
          className={cn(
            "min-w-0 max-w-[85%] rounded-2xl rounded-bl-sm border px-3.5 py-2.5 text-sm shadow-sm",
            message.isError
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-border bg-background text-foreground",
          )}
        >
          {message.isError ? (
            <p className="leading-relaxed">{message.content}</p>
          ) : (
            <div className="break-words">
              <MarkdownContent content={message.content} />
            </div>
          )}
          {message.citations && message.citations.length > 0 && onCitation ? (
            <Citations citations={message.citations} onCitation={onCitation} />
          ) : null}
          {!message.isError && actions ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
              {actions}
            </div>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}

function citationKey(citation: KbAskCitation): string {
  if (citation.kind === "page") return `page-${citation.pageId}`;
  if (citation.kind === "source") return `source-${citation.sourceId}`;
  if (citation.kind === "document") return `document-${citation.linkedDocumentId}`;
  return `article-${citation.articleId}`;
}

function Citations({
  citations,
  onCitation,
}: {
  citations: KbAskCitation[];
  onCitation: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const seen = new Set<string>();
  const unique = citations.filter((citation) => {
    const key = citationKey(citation);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length === 0) return null;

  return (
    <div className="mt-2.5 border-t border-border/60 pt-2.5">
      <p className="mb-1.5 text-micro font-medium uppercase tracking-wide text-muted-foreground">
        Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {unique.map((citation) => {
          if (citation.kind === "page") {
            return (
              <button
                key={`page-${citation.pageId}`}
                type="button"
                data-page-id={citation.pageId}
                onClick={onCitation}
                className="inline-flex max-w-48 items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-dense text-accent transition-colors hover:bg-muted"
              >
                <BookOpenTextIcon size={11} />
                <TruncatedText text={(citation.title ?? "").trim() || "Untitled page"} />
              </button>
            );
          }
          if (citation.kind === "document") {
            return (
              <button
                key={`document-${citation.linkedDocumentId}`}
                type="button"
                data-linked-document-id={citation.linkedDocumentId}
                aria-label={`HR document: ${(citation.title ?? "").trim() || "Company document"}`}
                onClick={onCitation}
                className="inline-flex max-w-48 items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-dense text-accent transition-colors hover:bg-muted"
              >
                <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                <TruncatedText text={(citation.title ?? "").trim() || "Company document"} />
              </button>
            );
          }
          const isSource = citation.kind === "source";
          const label =
            (citation.title ?? "").trim() || (isSource ? "Uploaded document" : "Untitled");
          return (
            <span
              key={isSource ? `source-${citation.sourceId}` : `article-${citation.articleId}`}
              className="inline-flex max-w-48 items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-dense text-muted-foreground"
            >
              <BookOpenTextIcon size={11} />
              <TruncatedText text={label} />
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function TypingBubble({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-background px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
            animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}
