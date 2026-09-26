"use client";

import { useState } from "react";
import { Sparkles, TrendingUp, AlertCircle, MessageSquare } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAIScoreCandidate, useAcceptCandidateScore } from "@/hooks/api/ai";
import { AiFailureBody } from "@/components/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useFeature } from "@/lib/billing/use-feature";

interface AIScoreCandidateButtonProps {
  candidateId: number;
  jobId?: number;
  compact?: boolean;
}

export function AIScoreCandidateButton({ candidateId, jobId, compact }: AIScoreCandidateButtonProps) {
  const [open, setOpen] = useState(false);
  const scoreMutation = useAIScoreCandidate();
  const acceptMutation = useAcceptCandidateScore();
  const result = scoreMutation.data;
  const scoreFailure = scoreMutation.isPending ? null : scoreMutation.error;
  const { enabled: featureEnabled, requiredPlan } = useFeature("ai.candidate-scoring");

  function handleScore() {
    if (!featureEnabled) { toast.error(`AI candidate scoring requires the ${requiredPlan ?? "PROFESSIONAL"} plan. Upgrade to unlock.`); return; }
    scoreMutation.mutate({ candidateId, jobId });
  }

  function handleAccept() {
    if (!result) return;
    acceptMutation.mutate(
      { candidateId, aiScore: result.score },
      {
        onSuccess: () => toast.success("AI score accepted and saved"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  const fitColor = (level: string) => {
    if (level === "excellent") return "text-status-success-ink";
    if (level === "good") return "text-status-warning-ink";
    if (level === "average") return "text-status-warning-ink";
    return "text-status-danger-ink";
  };

  const fitBg = (level: string) => {
    if (level === "excellent") return "bg-status-success-surface";
    if (level === "good") return "bg-status-warning-surface";
    if (level === "average") return "bg-status-warning-surface";
    return "bg-status-danger-surface";
  };

  function handleCompactClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!result) handleScore();
  }

  function handlePopoverContentClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

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
          >
            {!scoreMutation.isPending && <Sparkles className="h-3 w-3 text-primary" />}
            {result ? <span className={cn("font-bold", fitColor(result.fitLevel))}>{result.score}</span> : "Get AI Estimate"}
          </LoadingButton>
        </PopoverTrigger>
        {(result || scoreFailure) && (
          <PopoverContent className="w-80 p-3" align="start" onClick={handlePopoverContentClick}>
            {scoreFailure && !result && (
              <AiFailureBody error={scoreFailure} onRetry={handleScore} />
            )}
            {result && (
              <>
                <ScoreDetails result={result} fitColor={fitColor} fitBg={fitBg} />
                <div className="mt-2 pt-2 border-t border-border flex items-center gap-2">
                  <LoadingButton
                    size="sm"
                    variant="default"
                    isPending={acceptMutation.isPending}
                    onClick={handleAccept}
                    className="text-xs"
                  >
                    Accept AI Score
                  </LoadingButton>
                </div>
                <p className="mt-2 text-micro text-muted-foreground leading-snug">
                  AI estimate only. Human decision required. Scores are for reference purposes and must not be used to automatically accept or reject candidates.
                </p>
              </>
            )}
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
        loadingText="Scoring..."
        className="w-full"
      >
        <Sparkles className="h-4 w-4 mr-2 text-primary" />
        Get AI Estimate
      </LoadingButton>
      {scoreFailure && !result && (
        <AiFailureBody error={scoreFailure} onRetry={handleScore} />
      )}
      {result && (
        <>
          <ScoreDetails result={result} fitColor={fitColor} fitBg={fitBg} />
          <div className="flex items-center gap-2">
            <LoadingButton
              size="sm"
              variant="default"
              isPending={acceptMutation.isPending}
              onClick={handleAccept}
            >
              Accept AI Score
            </LoadingButton>
          </div>
          <p className="text-micro text-muted-foreground leading-snug">
            AI estimate only. Human decision required. Scores are for reference purposes and must not be used to automatically accept or reject candidates.
          </p>
        </>
      )}
    </div>
  );
}

interface ScoreResult {
  score: number;
  fitLevel: string;
  reasoning: string;
  strengths: string[];
  concerns: string[];
  suggestedQuestions: string[];
}

function ScoreDetails({
  result,
  fitColor,
  fitBg,
}: {
  result: ScoreResult;
  fitColor: (l: string) => string;
  fitBg: (l: string) => string;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className={cn("h-12 w-12 rounded-lg flex flex-col items-center justify-center font-bold", fitBg(result.fitLevel), fitColor(result.fitLevel))}>
          <span className="text-base leading-none">{result.score}</span>
          <span className="text-micro uppercase tracking-wider mt-0.5">fit</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium">Candidate Score</p>
            <Badge variant="secondary" className={cn("text-micro h-4 px-1 capitalize", fitColor(result.fitLevel))}>
              {result.fitLevel}
            </Badge>
          </div>
          <p className="text-dense text-muted-foreground leading-snug mt-0.5">{result.reasoning}</p>
        </div>
      </div>

      {result.strengths.length > 0 && (
        <div>
          <p className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-1">Strengths</p>
          {result.strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-dense">
              <TrendingUp className="h-3 w-3 text-status-success-ink mt-0.5 shrink-0" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {result.concerns.length > 0 && (
        <div>
          <p className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-1">Concerns</p>
          {result.concerns.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5 text-dense">
              <AlertCircle className="h-3 w-3 text-status-danger-ink mt-0.5 shrink-0" />
              <span>{c}</span>
            </div>
          ))}
        </div>
      )}

      {result.suggestedQuestions.length > 0 && (
        <div>
          <p className="text-micro font-medium text-muted-foreground uppercase tracking-wider mb-1">Suggested Questions</p>
          {result.suggestedQuestions.map((q, i) => (
            <div key={i} className="flex items-start gap-1.5 text-dense">
              <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <span>{q}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-micro text-muted-foreground italic leading-snug">
        AI estimate only. Human decision required.
      </p>
    </div>
  );
}
