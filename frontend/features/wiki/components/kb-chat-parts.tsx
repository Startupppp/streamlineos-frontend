"use client";

import { AnimatedLogo } from "@/components/brand/animated-logo";
import type { ChatMessage } from "@/components/kb/kb-chat-bubble";

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
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-micro font-medium text-muted-foreground">
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

