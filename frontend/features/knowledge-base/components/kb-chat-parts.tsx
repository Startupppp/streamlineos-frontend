"use client";

import { motion } from "framer-motion";
import { MessageCircleIcon, BookOpenTextIcon } from "@animateicons/react/lucide";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { cn } from "@/lib/utils";
import type { KbAskCitation } from "@/types/kb";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: KbAskCitation[];
  isError?: boolean;
  createdAt?: string;
}

export type KbHistoryRow =
  | { type: "sep"; id: string; label: string }
  | { type: "msg"; message: ChatMessage };

export const KB_SUGGESTIONS = [
  "Summarize the key points across my documents",
  "What processes are documented here?",
  "What do the uploaded files say?",
];

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };
  return d.toLocaleDateString(undefined, opts);
}

export function buildKbHistoryRows(messages: ChatMessage[]): KbHistoryRow[] {
  const rows: KbHistoryRow[] = [];
  let lastDay: string | null = null;
  for (const message of messages) {
    if (message.createdAt) {
      const key = dayKey(message.createdAt);
      if (key !== lastDay) {
        rows.push({ type: "sep", id: `sep-${key}-${message.id}`, label: dayLabel(message.createdAt) });
        lastDay = key;
      }
    }
    rows.push({ type: "msg", message });
  }
  return rows;
}

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-0.5">
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function EmptyChat({
  onSuggestion,
}: {
  onSuggestion: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
        <AnimatedLogo size={28} gradient className="rounded-xl" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">Ask your knowledge base</p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
          Answers are grounded in your uploaded files, notes and wiki pages.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {KB_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            data-suggestion={s}
            onClick={onSuggestion}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatBubble({
  message,
  onCitation,
  reduce,
}: {
  message: ChatMessage;
  onCitation: (e: React.MouseEvent<HTMLButtonElement>) => void;
  reduce: boolean;
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
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
          {message.content}
        </div>
      ) : (
        <div className="flex max-w-[88%] gap-2">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <MessageCircleIcon size={15} />
          </div>
          <div
            className={cn(
              "min-w-0 rounded-2xl rounded-bl-sm border px-3.5 py-2.5 text-sm shadow-sm",
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
            {message.citations && message.citations.length > 0 && (
              <Citations citations={message.citations} onCitation={onCitation} />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Citations({
  citations,
  onCitation,
}: {
  citations: KbAskCitation[];
  onCitation: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const seen = new Set<string>();
  const unique = citations.filter((citation) => {
    const key =
      citation.kind === "page"
        ? `page-${citation.pageId}`
        : citation.kind === "source"
          ? `source-${citation.sourceId}`
          : `article-${citation.articleId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (unique.length === 0) return null;

  return (
    <div className="mt-2.5 border-t border-border/60 pt-2.5">
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
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
                className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-accent transition-colors hover:bg-muted"
              >
                <BookOpenTextIcon size={11} />
                <span className="truncate">{(citation.title ?? "").trim() || "Untitled page"}</span>
              </button>
            );
          }
          const isSource = citation.kind === "source";
          const label =
            (citation.title ?? "").trim() || (isSource ? "Uploaded document" : "Untitled");
          return (
            <span
              key={isSource ? `source-${citation.sourceId}` : `article-${citation.articleId}`}
              className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <BookOpenTextIcon size={11} />
              <span className="truncate">{label}</span>
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
      <div className="flex gap-2">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <MessageCircleIcon size={15} />
        </div>
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
      </div>
    </motion.div>
  );
}
