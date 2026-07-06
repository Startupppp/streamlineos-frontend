"use client";

import { useState, useCallback } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Plan } from "@/lib/billing/feature-gates";
import type { AiSeverity } from "@/types/projects/ai";
import { useAskProjectAi } from "@/hooks/api/projects/ai";
import { EvidenceStrip } from "./evidence-strip";

interface AskCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

const QUICK_CHIPS = [
  "What's blocked?",
  "What's at risk?",
  "What's overdue?",
  "Summarize this sprint",
];

function confidenceClasses(c: AiSeverity): string {
  if (c === "high") return "bg-emerald-50 text-emerald-700 border-emerald-200/70";
  if (c === "medium") return "bg-amber-50 text-amber-700 border-amber-200/70";
  return "bg-slate-50 text-slate-600 border-slate-200/70";
}

export function AskCard({ projectId, featureEnabled, requiredPlan }: AskCardProps) {
  const [question, setQuestion] = useState("");
  const mutation = useAskProjectAi(projectId);
  const result = mutation.data;

  const handleRun = useCallback(() => {
    if (!featureEnabled) {
      toast.error(`AI Project Manager requires the ${requiredPlan ?? "PROFESSIONAL"} plan.`);
      return;
    }
    if (!question.trim()) {
      toast.error("Please enter a question.");
      return;
    }
    mutation.mutate(
      { question: question.trim() },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }, [featureEnabled, requiredPlan, question, mutation]);

  const handleQuestionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !mutation.isPending) handleRun();
    },
    [handleRun, mutation.isPending],
  );

  const handleChip = useCallback((chip: string) => {
    setQuestion(chip);
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground">Ask a Question</h3>
        <p className="text-[12px] text-muted-foreground mt-0.5">Get answers about this project</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChip(chip)}
            className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={question}
          onChange={handleQuestionChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about this project…"
          className="text-[13px] h-8 flex-1"
          disabled={mutation.isPending}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRun}
          disabled={mutation.isPending || !featureEnabled || !question.trim()}
          className="h-8 gap-1.5 text-xs shrink-0"
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
          )}
          Ask
        </Button>
      </div>

      {result && (
        <div className="space-y-2 pt-3 border-t border-border/60">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${confidenceClasses(result.confidence)}`}
            >
              {result.confidence} confidence
            </span>
          </div>
          <p className="text-[13px] text-foreground leading-relaxed">{result.answer}</p>
          {result.evidence && <EvidenceStrip evidence={result.evidence} />}
        </div>
      )}
    </div>
  );
}
