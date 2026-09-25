"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Copy, Flag, HelpCircle, MessageSquareWarning, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { useKbAiAnswerFeedback, useCreateKbKnowledgeGap } from "@/hooks/api/kb/ask";
import type { ChatMessage } from "@/components/kb/kb-chat-bubble";
import type { KbAskCitationWithParts } from "@/hooks/api/kb/ask-result-schema";

const warningTone = statusToneClasses("warning");
const successTone = statusToneClasses("success");

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

export function questionForAssistantId(messages: ChatMessage[]): Map<string, string> {
  const questionById = new Map<string, string>();
  let lastQuestion: string | null = null;
  for (const message of messages) {
    if (message.role === "user") {
      lastQuestion = message.content;
      continue;
    }
    if (message.role === "assistant" && lastQuestion !== null) {
      questionById.set(message.id, lastQuestion);
    }
  }
  return questionById;
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

export function CreateKnowledgeGapButton({ question }: { question: string }) {
  const createGap = useCreateKbKnowledgeGap();
  const [created, setCreated] = useState(false);

  function handleCreate() {
    createGap.mutate(
      { question },
      {
        onSuccess: () => {
          setCreated(true);
          toast.success("Flagged for the content team");
        },
        onError: (error: unknown) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (created) {
    return <span className="text-micro text-muted-foreground">Knowledge gap flagged</span>;
  }

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={createGap.isPending}
      aria-label="Create a knowledge gap for this question"
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-dense text-muted-foreground transition-colors hover:text-foreground"
    >
      <HelpCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      Create knowledge gap
    </button>
  );
}

export function InsufficientEvidenceBanner({ question }: { question?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${warningTone.rule} ${warningTone.surface} ${warningTone.inkStrong}`}
    >
      <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">No relevant content found</p>
        <p className={`mt-0.5 text-xs ${warningTone.ink}`}>
          The knowledge base does not contain anything that answers this question. Consider uploading relevant files or adding a note.
        </p>
        {question ? (
          <div className="mt-1.5">
            <CreateKnowledgeGapButton question={question} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function OverQuotaBanner({ limit }: { limit: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">AI quota reached</p>
        <p className="mt-0.5 text-xs">
          {limit}. Contact your administrator or upgrade your plan to continue.
        </p>
      </div>
    </div>
  );
}

interface CitationPassageProps {
  citation: KbAskCitationWithParts;
  index: number;
}

export function CitationPassage({ citation, index }: CitationPassageProps) {
  if (!citation.passage) return null;
  return (
    <blockquote className="mt-1.5 border-l-2 border-accent/40 pl-3 text-xs text-muted-foreground italic">
      {citation.passage}
      <span className="not-italic text-dense text-accent ml-1">— source {index + 1}</span>
    </blockquote>
  );
}

interface FreshnessTagProps {
  updatedAt: string;
}

export function FreshnessTag({ updatedAt }: FreshnessTagProps) {
  const date = new Date(updatedAt);
  if (!Number.isFinite(date.getTime())) return null;
  const now = Date.now();
  const ageMs = now - date.getTime();
  const ageDays = Math.floor(ageMs / 86_400_000);
  const stale = ageDays > 90;
  const label = ageDays === 0
    ? "Updated today"
    : ageDays === 1
    ? "Updated yesterday"
    : ageDays < 30
    ? `Updated ${ageDays}d ago`
    : `Updated ${date.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
  return (
    <span
      aria-label={label}
      className={`inline-flex items-center gap-0.5 text-micro ${stale ? warningTone.ink : "text-muted-foreground"}`}
    >
      <Clock className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

interface VerificationBadgeProps {
  verified: boolean;
}

export function VerificationBadge({ verified }: VerificationBadgeProps) {
  if (!verified) return null;
  return (
    <span
      aria-label="Verified source"
      className={`inline-flex items-center gap-0.5 text-micro ${successTone.ink}`}
    >
      <CheckCircle2 className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      Verified
    </span>
  );
}

interface DisagreementBannerProps {
  summary: string;
}

export function DisagreementBanner({ summary }: DisagreementBannerProps) {
  return (
    <div
      role="note"
      className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${warningTone.rule} ${warningTone.surface} ${warningTone.ink}`}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span><span className="font-semibold">Sources disagree:</span> {summary}</span>
    </div>
  );
}

export function CopyAnswerButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error("Could not copy the answer"),
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Answer copied" : "Copy answer"}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-dense text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? (
        <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
      ) : (
        <Copy className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

type AnswerFeedbackRating = "helpful" | "not_helpful" | "missing_source";

export function AnswerFeedbackBar({
  question,
  onSubmitted,
}: {
  question: string;
  onSubmitted?: () => void;
}) {
  const feedback = useKbAiAnswerFeedback();
  const [given, setGiven] = useState(false);

  function submit(rating: AnswerFeedbackRating, comment?: string) {
    feedback.mutate(
      { rating, question, comment },
      {
        onSuccess: () => {
          setGiven(true);
          toast.success("Thanks for the feedback");
          onSubmitted?.();
        },
        onError: (error: unknown) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleHelpful() {
    submit("helpful");
  }

  function handleNotHelpful() {
    submit("not_helpful");
  }

  function handleReportWrongOrStale() {
    submit("not_helpful", "Reported as wrong or stale");
  }

  if (given) {
    return <p className="pt-1 text-micro text-muted-foreground">Thanks for the feedback</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 pt-1">
      <span className="mr-1 text-micro text-muted-foreground">Helpful?</span>
      <button
        type="button"
        onClick={handleHelpful}
        disabled={feedback.isPending}
        aria-label="Mark answer as helpful"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-dense text-muted-foreground transition-colors hover:text-foreground"
      >
        <ThumbsUp className="h-3 w-3 shrink-0" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={handleNotHelpful}
        disabled={feedback.isPending}
        aria-label="Mark answer as not helpful"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-dense text-muted-foreground transition-colors hover:text-foreground"
      >
        <ThumbsDown className="h-3 w-3 shrink-0" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={handleReportWrongOrStale}
        disabled={feedback.isPending}
        aria-label="Report answer as wrong or stale"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-dense text-muted-foreground transition-colors hover:text-foreground"
      >
        <Flag className="h-3 w-3 shrink-0" aria-hidden="true" />
        Report wrong or stale
      </button>
    </div>
  );
}
