"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import { RotateCcw } from "lucide-react";
import { SendIcon } from "@animateicons/react/lucide";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { TEXT_BODY } from "@/features/projects/shared/text-overflow";
import type { Plan } from "@/lib/billing/feature-gates";
import type { AiSeverity, ProjectAiEvidence } from "@/types/projects/ai";
import { useAskProjectAi } from "@/hooks/api/projects/ai";
import { EvidenceStrip } from "./evidence-strip";

const USER_BUBBLE_TEXT =
  "min-w-0 max-w-full overflow-hidden text-ellipsis line-clamp-6 break-all [overflow-wrap:anywhere] [word-break:break-all]";

interface AiChatPanelProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
  clearSignal?: number;
  onHasMessagesChange?: (hasMessages: boolean) => void;
}

interface QnAEntry {
  question: string;
  answer: string;
  confidence: AiSeverity;
  evidence?: ProjectAiEvidence;
}

const STARTER_PROMPTS = [
  "What's blocked?",
  "What's at risk?",
  "What's overdue?",
  "Summarize this sprint",
] as const;

const FOLLOW_UP_CHIPS = [
  "What's blocked?",
  "What's at risk?",
  "What's overdue?",
  "Summarize this sprint",
] as const;

function confidenceClasses(c: AiSeverity): string {
  if (c === "high") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30";
  }
  if (c === "medium") {
    return "bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30";
  }
  return "bg-muted text-muted-foreground border-border/70 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30";
}

const UserBubble = memo(function UserBubble({
  text,
  reduce,
}: {
  text: string;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex justify-end"
    >
      <div
        className={cn(
          "max-w-[min(85%,20rem)] sm:max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[13px] leading-relaxed text-primary-foreground shadow-sm",
          USER_BUBBLE_TEXT,
        )}
      >
        {text}
      </div>
    </motion.div>
  );
});

const ThreadEntry = memo(function ThreadEntry({
  entry,
  reduce,
}: {
  entry: QnAEntry;
  reduce: boolean;
}) {
  return (
    <div className="space-y-4">
      <UserBubble text={entry.question} reduce={reduce} />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut", delay: 0.04 }}
        className="flex items-start gap-2.5"
      >
        <AnimatedLogo size={28} gradient className="mt-0.5 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2 rounded-2xl rounded-tl-md border border-border bg-card px-3 py-2.5 shadow-sm sm:px-3.5">
          <span
            className={cn(
              "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              confidenceClasses(entry.confidence),
            )}
          >
            {entry.confidence} confidence
          </span>
          <p className={cn(TEXT_BODY, "whitespace-pre-wrap text-[13px] leading-relaxed text-foreground")}>
            {entry.answer}
          </p>
          {entry.evidence ? <EvidenceStrip evidence={entry.evidence} /> : null}
        </div>
      </motion.div>
    </div>
  );
});

interface PromptChipProps {
  label: string;
  onSelect: (label: string) => void;
  variant?: "starter" | "chip";
}

const PromptChip = memo(function PromptChip({
  label,
  onSelect,
  variant = "chip",
}: PromptChipProps) {
  const handleClick = useCallback(() => onSelect(label), [label, onSelect]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variant === "starter"
          ? "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] text-foreground shadow-sm hover:bg-muted/50"
          : "rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
});

function EmptyWelcome({
  onSelect,
  reduce,
}: {
  onSelect: (prompt: string) => void;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex flex-1 flex-col items-center justify-center gap-5 px-1 py-6 text-center sm:gap-6 sm:py-10"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
        <AnimatedLogo size={28} gradient className="rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold tracking-tight text-foreground">
          How can I help with this project?
        </p>
        <p className="mx-auto max-w-sm text-[13px] text-muted-foreground leading-snug">
          Ask about risks, blockers, progress, or sprint status — answers stay grounded in this project&apos;s data.
        </p>
      </div>
      <div className="grid w-full max-w-md gap-2 sm:grid-cols-2">
        {STARTER_PROMPTS.map((prompt) => (
          <PromptChip key={prompt} label={prompt} onSelect={onSelect} variant="starter" />
        ))}
      </div>
    </motion.div>
  );
}

export function AiChatPanel({
  projectId,
  featureEnabled,
  clearSignal = 0,
  onHasMessagesChange,
}: AiChatPanelProps) {
  const [question, setQuestion] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [entries, setEntries] = useState<QnAEntry[]>([]);
  const mutation = useAskProjectAi(projectId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastClearSignal = useRef(clearSignal);
  const reduce = Boolean(useReducedMotion());
  const { iconRef: sendIconRef, hoverHandlers: sendHover } = useAnimatedIcon();

  const hasThreadContent = entries.length > 0 || pendingQuestion !== null;

  useEffect(() => {
    onHasMessagesChange?.(hasThreadContent);
  }, [hasThreadContent, onHasMessagesChange]);

  const resetMutation = mutation.reset;

  useEffect(() => {
    if (clearSignal === lastClearSignal.current) return;
    lastClearSignal.current = clearSignal;
    setEntries([]);
    setQuestion("");
    setPendingQuestion(null);
    resetMutation();
  }, [clearSignal, resetMutation]);

  useEffect(() => {
    if (!hasThreadContent && !mutation.isPending && !mutation.isError) return;
    bottomRef.current?.scrollIntoView({
      behavior: reduce ? "instant" : "smooth",
      block: "end",
    });
  }, [entries, pendingQuestion, mutation.isPending, mutation.isError, hasThreadContent, reduce]);

  const handleSubmit = useCallback(() => {
    const q = question.trim() || pendingQuestion?.trim() || "";
    if (!q || !featureEnabled || mutation.isPending) return;
    setPendingQuestion(q);
    setQuestion("");
    mutation.mutate(
      { question: q },
      {
        onSuccess: (data) => {
          setEntries((prev) => [
            ...prev,
            {
              question: q,
              answer: data.answer,
              confidence: data.confidence,
              evidence: data.evidence,
            },
          ]);
          setPendingQuestion(null);
        },
      },
    );
  }, [question, pendingQuestion, featureEnabled, mutation]);

  const handleQuestionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!mutation.isPending) handleSubmit();
      }
    },
    [handleSubmit, mutation.isPending],
  );

  const handlePromptSelect = useCallback((prompt: string) => {
    setQuestion(prompt);
  }, []);

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleSubmit();
    },
    [handleSubmit],
  );

  const hasMessages = hasThreadContent;
  const canSend = featureEnabled && question.trim().length > 0 && !mutation.isPending;
  const showThread =
    hasThreadContent || mutation.isPending || mutation.isError;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <ScrollArea
        hideScrollbar
        className="min-h-0 flex-1 bg-background"
        viewportClassName="overscroll-contain"
      >
      <div
        role="log"
        aria-label="Conversation thread"
        aria-live="polite"
      >
        <div className="mx-auto flex min-h-full w-full max-w-[52rem] flex-col px-3 py-4 sm:px-6">
          {!showThread ? (
            <EmptyWelcome onSelect={handlePromptSelect} reduce={reduce} />
          ) : (
            <>
              <div className="min-h-0 flex-1" aria-hidden="true" />
              <div className="flex flex-col gap-6 pb-2">
                {entries.map((entry, i) => (
                  <ThreadEntry
                    key={`${i}-${entry.question.slice(0, 24)}`}
                    entry={entry}
                    reduce={reduce}
                  />
                ))}

                {pendingQuestion ? (
                  <UserBubble text={pendingQuestion} reduce={reduce} />
                ) : null}

                {mutation.isPending ? (
                  <div className="flex items-start gap-2.5">
                    <AnimatedLogo size={28} gradient className="mt-0.5 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5 rounded-2xl rounded-tl-md border border-border bg-card px-3.5 py-2.5 shadow-sm">
                      <Skeleton className="h-3 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                ) : null}

                {mutation.isError ? (
                  <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2.5">
                    <p className="flex-1 text-[13px] leading-snug text-destructive">
                      {getErrorMessage(mutation.error)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSubmit}
                      className="h-7 shrink-0 gap-1.5 text-xs"
                      aria-label="Retry question"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Retry
                    </Button>
                  </div>
                ) : null}

                <div ref={bottomRef} aria-hidden="true" className="h-px shrink-0" />
              </div>
            </>
          )}
        </div>
      </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-border bg-card">
        <div className="mx-auto w-full max-w-[52rem] space-y-2.5 px-3 py-3 sm:px-6">
          {hasMessages ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggested follow-ups">
              {FOLLOW_UP_CHIPS.map((chip) => (
                <PromptChip key={chip} label={chip} onSelect={handlePromptSelect} />
              ))}
            </div>
          ) : null}

          <form onSubmit={handleFormSubmit} className="flex min-w-0 items-end gap-2">
            <Textarea
              value={question}
              onChange={handleQuestionChange}
              onKeyDown={handleKeyDown}
              placeholder={
                hasMessages ? "Ask a follow-up…" : "Ask anything about this project…"
              }
              rows={1}
              disabled={mutation.isPending}
              aria-label="Question input"
              className="min-h-8 max-h-36 min-w-0 flex-1 resize-none border-border bg-background py-2.5 text-[13px]"
            />
            <LoadingButton
              type="submit"
              size="icon"
              isPending={mutation.isPending}
              disabled={!canSend && !mutation.isPending}
              className="h-10 w-10 shrink-0 rounded-xl"
              aria-label="Send question"
              {...sendHover}
            >
              {mutation.isPending ? null : <SendIcon ref={sendIconRef} size={16} />}
            </LoadingButton>
          </form>
        </div>
      </div>
    </div>
  );
}
