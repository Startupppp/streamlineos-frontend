"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAIScoreLead } from "@/hooks/api/ai";
import { useFeature } from "@/lib/billing/use-feature";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";

interface AIScoreButtonProps {
  leadId: number;
  currentScore?: number | null;
  compact?: boolean;
}

export function AIScoreButton({
  leadId,
  currentScore,
  compact,
}: AIScoreButtonProps) {
  const [open, setOpen] = useState(false);
  const scoreMutation = useAIScoreLead();
  const result = scoreMutation.data;
  const { enabled: featureEnabled, requiredPlan } =
    useFeature("ai.lead-scoring");
  const canUseCrmAi = useCan("crm:ai:use");

  const handleScore = useCallback(() => {
    if (!featureEnabled) {
      toast.error(
        `AI lead scoring requires the ${requiredPlan ?? "PROFESSIONAL"} plan. Upgrade to unlock.`,
      );
      return;
    }
    scoreMutation.mutate(leadId, {
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [featureEnabled, requiredPlan, scoreMutation, leadId]);

  const handleCompactClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!result) handleScore();
    },
    [result, handleScore],
  );

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 dark:text-emerald-400";
    if (score >= 60) return "text-amber-500 dark:text-amber-400";
    if (score >= 40) return "text-orange-500 dark:text-orange-400";
    return "text-red-500 dark:text-red-400";
  };

  if (!canUseCrmAi) return null;

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <LoadingButton
            variant="ghost"
            size="sm"
            className="px-2 text-xs gap-1"
            onClick={handleCompactClick}
            isPending={scoreMutation.isPending}
            loadingText="..."
            disabled={scoreMutation.isPending || !featureEnabled}
            title={
              !featureEnabled
                ? `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`
                : undefined
            }
          >
            <Sparkles className="h-3 w-3 text-primary" />
            {result ? (
              <span className={cn("font-bold", scoreColor(result.score))}>
                {result.score}
              </span>
            ) : currentScore ? (
              <span className="text-muted-foreground">{currentScore}</span>
            ) : (
              "Score"
            )}
          </LoadingButton>
        </PopoverTrigger>
        {result && (
          <PopoverContent
            className="w-72 p-3"
            align="start"
            onClick={(e) => e.stopPropagation()}
          >
            <AIScoreDetails result={result} />
          </PopoverContent>
        )}
      </Popover>
    );
  }

  return (
    <div className="space-y-3">
      <LoadingButton
        variant="outline"
        size="sm"
        onClick={handleScore}
        isPending={scoreMutation.isPending}
        loadingText="Scoring with AI..."
        disabled={scoreMutation.isPending || !featureEnabled}
        title={
          !featureEnabled
            ? `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`
            : undefined
        }
        className="w-full"
      >
        <Sparkles className="h-4 w-4 mr-2 text-primary" />
        AI Score Lead
      </LoadingButton>

      {result && <AIScoreDetails result={result} />}
    </div>
  );
}

function AIScoreDetails({
  result,
}: {
  result: {
    score: number;
    confidence?: "low" | "medium" | "high";
    reasoning: string;
    strengths: string[];
    weaknesses: string[];
    suggestedActions: string[];
  };
}) {
  const scoreColor =
    result.score >= 80
      ? "text-emerald-500 dark:text-emerald-400"
      : result.score >= 60
        ? "text-amber-500 dark:text-amber-400"
        : result.score >= 40
          ? "text-orange-500 dark:text-orange-400"
          : "text-red-500 dark:text-red-400";
  const scoreBg =
    result.score >= 80
      ? "bg-emerald-500/10"
      : result.score >= 60
        ? "bg-amber-500/10"
        : result.score >= 40
          ? "bg-orange-500/10"
          : "bg-red-500/10";

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center font-bold text-lg",
            scoreBg,
            scoreColor,
          )}
        >
          {result.score}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium">AI Score</p>
            {result.confidence && (
              <span className={cn(
                "text-micro px-1.5 py-0.5 rounded font-medium capitalize",
                result.confidence === "high" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" :
                result.confidence === "medium" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300" :
                "bg-muted text-muted-foreground",
              )}>
                {result.confidence} confidence
              </span>
            )}
          </div>
          <p className="text-dense text-muted-foreground leading-snug">
            {result.reasoning}
          </p>
        </div>
      </div>

      {result.strengths.length > 0 && (
        <div>
          <p className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Strengths
          </p>
          {result.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-dense">
              <TrendingUp className="h-3 w-3 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {result.weaknesses.length > 0 && (
        <div>
          <p className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Weaknesses
          </p>
          {result.weaknesses.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-dense">
              <TrendingDown className="h-3 w-3 text-red-400 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {result.suggestedActions.length > 0 && (
        <div>
          <p className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Suggested Actions
          </p>
          {result.suggestedActions.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-dense">
              <AlertCircle className="h-3 w-3 text-primary mt-0.5 shrink-0" />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
