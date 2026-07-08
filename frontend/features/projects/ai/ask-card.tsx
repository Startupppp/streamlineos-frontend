"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
import { MessageSquare, Send, X, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Plan } from "@/lib/billing/feature-gates";
import type { AiSeverity, ProjectAiEvidence } from "@/types/projects/ai";
import { useAskProjectAi } from "@/hooks/api/projects/ai";
import { EvidenceStrip } from "./evidence-strip";

interface AskCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

interface QnAEntry {
  question: string;
  answer: string;
  confidence: AiSeverity;
  evidence?: ProjectAiEvidence;
}

const QUICK_CHIPS = ["What's blocked?", "What's at risk?", "What's overdue?", "Summarize this sprint"];

function confidenceClasses(c: AiSeverity): string {
  if (c === "high") return "bg-emerald-50 text-emerald-700 border-emerald-200/70";
  if (c === "medium") return "bg-amber-50 text-amber-700 border-amber-200/70";
  return "bg-slate-50 text-slate-600 border-slate-200/70";
}

const ThreadEntry = memo(function ThreadEntry({ entry }: { entry: QnAEntry }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2">
        <span className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground select-none">
          Q
        </span>
        <p className="text-[13px] text-foreground font-medium leading-snug">{entry.question}</p>
      </div>
      <div className="flex items-start gap-2">
        <span className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-semibold text-white select-none">
          AI
        </span>
        <div className="flex-1 min-w-0 space-y-1.5">
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${confidenceClasses(entry.confidence)}`}
          >
            {entry.confidence} confidence
          </span>
          <p className="text-[13px] text-foreground leading-relaxed">{entry.answer}</p>
          {entry.evidence && <EvidenceStrip evidence={entry.evidence} />}
        </div>
      </div>
    </div>
  );
});

interface QuickChipProps {
  chip: string;
  onChipClick: (chip: string) => void;
}

const QuickChipButton = memo(function QuickChipButton({ chip, onChipClick }: QuickChipProps) {
  const handleClick = useCallback(() => onChipClick(chip), [chip, onChipClick]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {chip}
    </button>
  );
});

export function AskCard({ projectId, featureEnabled }: AskCardProps) {
  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<QnAEntry[]>([]);
  const mutation = useAskProjectAi(projectId);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries]);

  const handleSubmit = useCallback(() => {
    const q = question.trim();
    if (!q || !featureEnabled) return;
    mutation.mutate(
      { question: q },
      {
        onSuccess: (data) => {
          setEntries((prev) => [
            ...prev,
            { question: q, answer: data.answer, confidence: data.confidence, evidence: data.evidence },
          ]);
          setQuestion("");
        },
      },
    );
  }, [question, featureEnabled, mutation]);

  const handleClear = useCallback(() => {
    setEntries([]);
    mutation.reset();
  }, [mutation]);

  const handleQuestionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !mutation.isPending) handleSubmit();
    },
    [handleSubmit, mutation.isPending],
  );

  const handleChipSelect = useCallback((chip: string) => {
    setQuestion(chip);
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Ask the AI</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">Get instant answers about this project</p>
          </div>
        </div>
        {entries.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Clear conversation"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {entries.length > 0 && (
        <div
          ref={threadRef}
          className="space-y-4 max-h-72 overflow-y-auto scrollbar-thin pr-1"
          role="log"
          aria-label="Conversation thread"
          aria-live="polite"
        >
          {entries.map((entry, i) => (
            <ThreadEntry key={i} entry={entry} />
          ))}
        </div>
      )}

      {mutation.isPending && (
        <div className="flex items-start gap-2">
          <span className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Loader2 className="h-3 w-3 text-white animate-spin" />
          </span>
          <div className="flex-1 space-y-1.5 py-0.5">
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        </div>
      )}

      {mutation.isError && (
        <div className="flex items-start justify-between gap-2.5 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
          <p className="text-[13px] text-destructive leading-snug flex-1">
            {getErrorMessage(mutation.error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSubmit}
            className="shrink-0 h-7 gap-1.5 text-xs"
            aria-label="Retry question"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      <div className="space-y-2.5 border-t border-border/60 pt-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick questions">
          {QUICK_CHIPS.map((chip) => (
            <QuickChipButton key={chip} chip={chip} onChipClick={handleChipSelect} />
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={handleQuestionChange}
            onKeyDown={handleKeyDown}
            placeholder={entries.length > 0 ? "Ask a follow-up…" : "Ask anything about this project…"}
            className="text-[13px] h-9 flex-1"
            disabled={mutation.isPending}
            aria-label="Question input"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={mutation.isPending || !featureEnabled || !question.trim()}
            className="h-9 w-9 p-0 shrink-0"
            aria-label="Send question"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
