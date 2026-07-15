"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import { RotateCcw } from "lucide-react";
import { SendIcon } from "@animateicons/react/lucide";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/billing/feature-gates";
import type { AiSeverity, ProjectAiEvidence } from "@/types/projects/ai";
import { useAskProjectAi } from "@/hooks/api/projects/ai";
import { EvidenceStrip } from "./evidence-strip";

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

const ThreadEntry = memo(function ThreadEntry({
  entry,
  reduce,
}: {
  entry: QnAEntry;
  reduce: boolean;
}) {
  return (
    <div className="space-y-4">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[13px] leading-relaxed text-primary-foreground shadow-sm">
          {entry.question}
        </div>
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut", delay: 0.04 }}
        className="flex items-start gap-2.5"
      >
        <AnimatedLogo size={28} gradient className="mt-0.5 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <span
            className={cn(
              "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              confidenceClasses(entry.confidence),
            )}
          >
            {entry.confidence} confidence
          </span>
          <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">
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
      className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center"
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
  const [entries, setEntries] = useState<QnAEntry[]>([]);
  const mutation = useAskProjectAi(projectId);
  const threadRef = useRef<HTMLDivElement>(null);
  const lastClearSignal = useRef(clearSignal);
  const reduce = Boolean(useReducedMotion());
  const { iconRef: sendIconRef, hoverHandlers: sendHover } = useAnimatedIcon();

  useEffect(() => {
    onHasMessagesChange?.(entries.length > 0);
  }, [entries.length, onHasMessagesChange]);

  const resetMutation = mutation.reset;

  useEffect(() => {
    if (clearSignal === lastClearSignal.current) return;
    lastClearSignal.current = clearSignal;
    setEntries([]);
    setQuestion("");
    resetMutation();
  }, [clearSignal, resetMutation]);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries, mutation.isPending]);

  const handleSubmit = useCallback(() => {
    const q = question.trim();
    if (!q || !featureEnabled || mutation.isPending) return;
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
          setQuestion("");
        },
      },
    );
  }, [question, featureEnabled, mutation]);

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

  const hasMessages = entries.length > 0;
  const canSend = featureEnabled && question.trim().length > 0 && !mutation.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div
        ref={threadRef}
        className="min-h-0 flex-1 overflow-y-auto bg-background scrollbar-thin"
        role="log"
        aria-label="Conversation thread"
        aria-live="polite"
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-[52rem] flex-col px-4 py-4 sm:px-6",
            hasMessages || mutation.isPending || mutation.isError
              ? "min-h-full justify-end gap-6 pb-2"
              : "min-h-full",
          )}
        >
          {!hasMessages && !mutation.isPending && !mutation.isError ? (
            <EmptyWelcome onSelect={handlePromptSelect} reduce={reduce} />
          ) : (
            <>
              {entries.map((entry, i) => (
                <ThreadEntry key={`${i}-${entry.question.slice(0, 24)}`} entry={entry} reduce={reduce} />
              ))}

              {mutation.isPending ? (
                <div className="flex items-start gap-2.5">
                  <AnimatedLogo size={28} gradient className="mt-0.5 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5 py-1">
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
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-card">
        <div className="mx-auto w-full max-w-[52rem] space-y-2.5 px-4 py-3 sm:px-6">
          {hasMessages ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Suggested follow-ups">
              {FOLLOW_UP_CHIPS.map((chip) => (
                <PromptChip key={chip} label={chip} onSelect={handlePromptSelect} />
              ))}
            </div>
          ) : null}

          <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
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
              className="min-h-10 max-h-36 flex-1 resize-none border-border bg-background py-2.5 text-[13px]"
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
