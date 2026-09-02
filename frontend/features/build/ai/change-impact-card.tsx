"use client";

import { useCallback } from "react";
import { RotateCcw, AlertTriangle } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiFailureBody } from "@/components/ai";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import type { Plan } from "@/lib/billing/feature-gates";
import { useChangeImpact } from "@/hooks/api/build/ai";

interface ChangeImpactCardProps {
  projectId: number;
  featureEnabled: boolean;
  requiredPlan: Plan | null;
}

interface ImpactRowProps {
  label: string;
  value: string;
}

function ImpactRow({ label, value }: ImpactRowProps) {
  return (
    <div className="space-y-0.5">
      <p className="text-dense font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground/80">{value}</p>
    </div>
  );
}

export function ChangeImpactCard({ projectId, featureEnabled, requiredPlan }: ChangeImpactCardProps) {
  const mutation = useChangeImpact(projectId);
  const result = mutation.data;
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleRun = useCallback(() => {
    mutation.mutate();
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
          {featureEnabled ? "Analyze Change Impact" : `Requires ${requiredPlan ?? "PROFESSIONAL"} plan`}
        </LoadingButton>
      ) : null}

      {mutation.isPending ? (
        <div className="space-y-3 py-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3.5 w-full rounded" />
            </div>
          ))}
        </div>
      ) : null}

      {mutation.isError ? (
        <AiFailureBody error={mutation.error} onRetry={handleRun} />
      ) : null}

      {result ? (
        <div className="space-y-3">
          <p className="text-label font-semibold text-foreground">{result.headline}</p>

          <div className="space-y-2">
            <ImpactRow label="Scope" value={result.scopeImpact} />
            <ImpactRow label="Schedule" value={result.scheduleImpact} />
            <ImpactRow label="Budget" value={result.budgetImpact} />
          </div>

          {result.riskSummary.length > 0 ? (
            <div>
              <p className="text-dense font-medium uppercase tracking-wide text-muted-foreground mb-1">Risks</p>
              <ul className="space-y-1">
                {result.riskSummary.map((r) => (
                  <li key={r} className="flex items-start gap-1.5 text-xs text-foreground/80">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-status-warning-ink" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.pendingApprovals.length > 0 ? (
            <div>
              <p className="text-dense font-medium uppercase tracking-wide text-muted-foreground mb-1">
                Pending Approvals
              </p>
              <ul className="space-y-1">
                {result.pendingApprovals.map((a) => (
                  <li key={a} className="flex items-start gap-1.5 text-xs text-foreground/80">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-2.5 py-2 text-dense text-muted-foreground">
            <span>{result.evidence.openChangeRequests} open CRs</span>
            <span className="text-border">·</span>
            <span>{result.evidence.openRisks} open risks</span>
            <span className="text-border">·</span>
            <span>{result.evidence.pendingApprovals} pending approvals</span>
          </div>

          <p className="text-dense text-muted-foreground">{result.citations.length} sources cited.</p>

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
