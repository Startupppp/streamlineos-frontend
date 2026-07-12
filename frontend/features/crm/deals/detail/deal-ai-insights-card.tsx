"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Sparkles, AlertTriangle, Lightbulb, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useDealSummary } from "@/hooks/api/crm";
import { useOrgFeatureFlags } from "@/hooks/api/ai";
import { useCreateTask } from "@/hooks/api/tasks";

interface DealSummaryResult {
  stage: string;
  summary: string;
  risks: string[];
  recommendedPlays: string[];
  stakeholdersGap: string;
  generatedAt: string;
}

interface DealAiInsightsCardProps {
  dealId: number;
  dealName?: string | null;
}

function PlayRow({
  play,
  dealId,
  onDismiss,
}: {
  play: string;
  dealId: number;
  onDismiss: () => void;
}) {
  const createTask = useCreateTask();

  const handleAddTask = useCallback(() => {
    createTask.mutate(
      { title: play, type: "CUSTOM", entityType: "DEAL", entityId: dealId },
      {
        onSuccess: () => toast.success("Task created"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [createTask, play, dealId]);

  return (
    <li className="flex items-start gap-2 group">
      <Lightbulb className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
      <span className="text-xs text-foreground flex-1">{play}</span>
      <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 text-blue-600 hover:text-blue-700"
          title="Add as task"
          onClick={handleAddTask}
          disabled={createTask.isPending}
        >
          <Plus className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          title="Dismiss"
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </li>
  );
}

export function DealAiInsightsCard({ dealId, dealName }: DealAiInsightsCardProps) {
  const [result, setResult] = useState<DealSummaryResult | null>(null);
  const [dismissedPlays, setDismissedPlays] = useState<Set<number>>(new Set());

  const { data: flags } = useOrgFeatureFlags();
  const { mutate: generate, isPending } = useDealSummary();

  const handleGenerate = useCallback(() => {
    generate(dealId, {
      onSuccess: (data) => {
        setResult(data);
        setDismissedPlays(new Set());
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [generate, dealId]);

  const handleDismissPlay = useCallback((idx: number) => {
    setDismissedPlays((prev) => new Set(prev).add(idx));
  }, []);

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-blue-600" />
          AI Deal Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {flags?.aiLeadScoring === false && (
          <div className="py-2 text-center text-xs text-muted-foreground bg-muted/50 rounded-lg px-3">
            AI insights are disabled for your organization. Enable it in{" "}
            <Link href="/crm/settings/ai" className="text-blue-600 hover:underline">
              AI Settings
            </Link>
            .
          </div>
        )}

        {flags?.aiLeadScoring !== false && isPending && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        )}

        {flags?.aiLeadScoring !== false && !isPending && result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                {result.stage}
              </Badge>
            </div>

            <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>

            {result.risks.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Risks
                </p>
                <ul className="space-y-1.5">
                  {result.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-xs text-foreground">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendedPlays.filter((_, i) => !dismissedPlays.has(i)).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Recommended Plays
                </p>
                <ul className="space-y-1.5">
                  {result.recommendedPlays.map((play, i) =>
                    dismissedPlays.has(i) ? null : (
                      <PlayRow
                        key={i}
                        play={play}
                        dealId={dealId}
                        onDismiss={() => handleDismissPlay(i)}
                      />
                    ),
                  )}
                </ul>
              </div>
            )}

            {result.stakeholdersGap && (
              <p className="text-xs text-muted-foreground italic border-l-2 border-blue-200 pl-2">
                {result.stakeholdersGap}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <Badge variant="secondary" className="text-[10px]">
                AI generated
              </Badge>
              <LoadingButton
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-blue-600 hover:text-blue-700"
                isPending={isPending}
                onClick={handleGenerate}
              >
                Regenerate
              </LoadingButton>
            </div>
          </div>
        )}

        {flags?.aiLeadScoring !== false && !isPending && !result && (
          <div className="flex flex-col items-center gap-3 py-2">
            <p className="text-xs text-muted-foreground text-center">
              Get AI-powered insights, risks, and recommended plays for{" "}
              {dealName ? <span className="font-medium">{dealName}</span> : "this deal"}.
            </p>
            <LoadingButton
              size="sm"
              isPending={isPending}
              loadingText="Generating..."
              onClick={handleGenerate}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate Insights
            </LoadingButton>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
