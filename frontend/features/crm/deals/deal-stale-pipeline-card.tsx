"use client";

import { useCallback } from "react";
import { Clock, AlertTriangle, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useStalePipelineDigest } from "@/hooks/api/crm";
import { AiGeneratedLabel } from "@/components/ai";

interface StaleDeal {
  dealId: number;
  dealName: string;
  stage: string;
  value: number;
  daysSinceActivity: number;
  evidence: string[];
}

interface StalePipelineCardProps {
  inactiveDays?: number;
}

function staleBadgeVariant(days: number): "destructive" | "outline" | "secondary" {
  if (days > 30) return "destructive";
  if (days >= 14) return "outline";
  return "secondary";
}

function formatValue(value: number): string {
  if (value <= 0) return "No value set";
  return `₹${value.toLocaleString("en-IN")}`;
}

function StaleDealRow({ deal }: { deal: StaleDeal }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{deal.dealName}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="secondary" className="text-[9px] h-4 px-1">{deal.stage}</Badge>
          <Badge
            variant={staleBadgeVariant(deal.daysSinceActivity)}
            className="text-[9px] h-4 px-1"
          >
            {deal.daysSinceActivity}d inactive
          </Badge>
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground shrink-0">{formatValue(deal.value)}</span>
    </div>
  );
}

export function DealStalePipelineCard({ inactiveDays = 14 }: StalePipelineCardProps) {
  const mutation = useStalePipelineDigest(inactiveDays);
  const result = mutation.data;

  const handleRun = useCallback(() => {
    mutation.mutate(undefined, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [mutation]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-amber-500 dark:text-amber-400" />
            Stale Pipeline Digest
          </CardTitle>
          <LoadingButton
            size="sm"
            variant="outline"
            isPending={mutation.isPending}
            loadingText="Analyzing..."
            onClick={handleRun}
            className="h-7 text-xs"
          >
            <Clock className="h-3.5 w-3.5 mr-1" />
            Run Analysis
          </LoadingButton>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {mutation.isPending && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}

        {!mutation.isPending && result && (
          <>
            {result.queued && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Analysis queued{result.jobId ? ` (job #${result.jobId})` : ""}. Results will be available shortly.
              </p>
            )}

            {!result.queued && result.digest && (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs text-foreground leading-relaxed">{result.digest.summary}</p>
                  <AiGeneratedLabel timestamp={result.generatedAt} className="shrink-0" />
                </div>

                {result.digest.criticalCount > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {result.digest.criticalCount} critical
                  </Badge>
                )}

                {result.digest.topRisk && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 p-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">{result.digest.topRisk}</p>
                  </div>
                )}
              </div>
            )}

            {!result.queued && result.staleDeals.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No stale deals found for the last {result.inactiveDays} days.
              </p>
            )}

            {!result.queued && result.staleDeals.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {result.staleDeals.length} stale deal{result.staleDeals.length !== 1 ? "s" : ""}
                </p>
                <div>
                  {result.staleDeals.map((deal) => (
                    <StaleDealRow key={deal.dealId} deal={deal} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!mutation.isPending && !result && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Run an analysis to find deals with no activity in the last {inactiveDays} days.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
