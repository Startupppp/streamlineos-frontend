"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AiConfidenceBadge } from "@/components/ai";
import { useAIInterviewNotesSummary } from "@/hooks/api/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface InterviewNotesSummaryButtonProps {
  candidateId: number;
  jobPostingId?: number;
  candidateName: string;
}

const CONFIDENCE_MAP: Record<string, number> = { high: 90, medium: 60, low: 30 };

const RECOMMENDATION_COLOR: Record<string, string> = {
  "Strong Hire": "text-emerald-600 dark:text-emerald-400",
  "Hire": "text-emerald-500 dark:text-emerald-400",
  "Neutral": "text-amber-600 dark:text-amber-400",
  "No Hire": "text-red-500 dark:text-red-400",
  "Strong No Hire": "text-red-600 dark:text-red-400",
};

export function InterviewNotesSummaryButton({ candidateId, jobPostingId, candidateName }: InterviewNotesSummaryButtonProps) {
  const [open, setOpen] = useState(false);
  const mutation = useAIInterviewNotesSummary();
  const result = mutation.data;

  function handleSummarize(e: React.MouseEvent) {
    e.stopPropagation();
    if (result) { setOpen(true); return; }
    mutation.mutate(
      { candidateId, jobPostingId },
      {
        onSuccess: () => setOpen(true),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const recommendationColor = result
    ? (RECOMMENDATION_COLOR[result.overallRecommendation] ?? "text-foreground")
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="px-2 text-xs gap-1"
          onClick={handleSummarize}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
          ) : (
            <Sparkles className="h-3 w-3 text-primary" />
          )}
          {result ? "Summary" : "Summarize Notes"}
        </Button>
      </PopoverTrigger>

      {result && (
        <PopoverContent className="w-80 p-3 space-y-3" align="start" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Overall Recommendation</p>
              <p className={cn("text-sm font-bold leading-snug mt-0.5", recommendationColor)}>
                {result.overallRecommendation}
              </p>
            </div>
            <AiConfidenceBadge confidence={CONFIDENCE_MAP[result.confidence] ?? 50} />
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Strengths</p>
              </div>
              <p className="text-[11px] leading-snug">{result.strengthsSummary}</p>
            </div>

            {result.concernsSummary !== "No major concerns noted" && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Concerns</p>
                </div>
                <p className="text-[11px] leading-snug">{result.concernsSummary}</p>
              </div>
            )}
          </div>

          {result.roundSummaries.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Round Verdicts</p>
              <div className="space-y-1">
                {result.roundSummaries.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <Badge variant="secondary" className="text-[9px] h-4 px-1 shrink-0">{r.round}</Badge>
                    <span className="text-muted-foreground">{r.verdict}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-border pt-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Next Step</p>
            <p className="text-[11px] font-medium">{result.suggestedNextStep}</p>
          </div>

          <p className="text-[10px] text-muted-foreground italic">
            AI summary for {candidateName}. Verify against original notes.
          </p>
        </PopoverContent>
      )}
    </Popover>
  );
}
