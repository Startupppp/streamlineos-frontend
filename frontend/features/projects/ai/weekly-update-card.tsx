"use client";

import { useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Plan } from "@/lib/billing/feature-gates";
import { useWeeklyUpdate } from "@/hooks/api/projects/ai";

interface WeeklyUpdateCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

export function WeeklyUpdateCard({ projectId, featureEnabled, requiredPlan }: WeeklyUpdateCardProps) {
  const mutation = useWeeklyUpdate(projectId);
  const result = mutation.data;
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleRun = useCallback(() => {
    mutation.mutate(undefined);
  }, [mutation]);

  const isIdle = !result && !mutation.isPending && !mutation.isError;

  return (
    <div className="flex flex-col gap-3">
      {isIdle ? (
        <LoadingButton
          size="sm"
          onClick={handleRun}
          disabled={!featureEnabled}
          isPending={mutation.isPending}
          className="w-full gap-1.5 text-xs"
          {...hoverHandlers}
        >
          <SparklesIcon ref={iconRef} size={14} />
          {featureEnabled ? "Generate Weekly Update" : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
        </LoadingButton>
      ) : null}

      {mutation.isPending ? (
        <div className="space-y-2 py-1">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-4/5 rounded" />
          <Skeleton className="h-3.5 w-3/5 rounded" />
        </div>
      ) : null}

      {mutation.isError ? (
        <div className="space-y-2.5">
          <p className="text-[13px] leading-snug text-destructive">{getErrorMessage(mutation.error)}</p>
          <LoadingButton variant="outline" size="sm" onClick={handleRun} className="w-full gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </LoadingButton>
        </div>
      ) : null}

      {result ? (
        <div className="space-y-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">AI Weekly Draft</p>
          <p className="text-[13px] font-semibold text-foreground">{result.headline}</p>
          {result.completedHighlights.length > 0 ? (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Completed</p>
              <ul className="space-y-1">
                {result.completedHighlights.map((h) => (
                  <li key={h} className="flex items-start gap-1.5 text-[12px] text-foreground/80">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.blockers.length > 0 ? (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Blockers</p>
              <ul className="space-y-1">
                {result.blockers.map((b) => (
                  <li key={b} className="flex items-start gap-1.5 text-[12px] text-destructive/80">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-destructive" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.upcomingFocus.length > 0 ? (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Next week focus</p>
              <ul className="space-y-1">
                {result.upcomingFocus.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[12px] text-foreground/80">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-[11px] text-muted-foreground">
            Draft — review before sending. {result.citations.length} sources cited.
          </p>
          <LoadingButton
            variant="ghost"
            size="sm"
            onClick={handleRun}
            isPending={mutation.isPending}
            className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" />
            Regenerate
          </LoadingButton>
        </div>
      ) : null}
    </div>
  );
}
