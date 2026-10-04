"use client";

import Link from "next/link";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import type { useRunVariance } from "@/hooks/api/payroll/run-employees";
import { StepNote, StepPanel } from "./step-panel";

const MOVER_LIMIT = 5;

type VarianceQuery = ReturnType<typeof useRunVariance>;

interface CompareStepProps {
  runId: number;
  headcount: number | null;
  variance: VarianceQuery;
}

interface FigureProps {
  label: string;
  current: string;
  previous: string;
}

function Figure({ label, current, previous }: FigureProps) {
  return (
    <div className="space-y-0.5">
      <dt className="text-micro uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-foreground">{current}</dd>
      <dd className="text-micro tabular-nums text-muted-foreground">Last run {previous}</dd>
    </div>
  );
}

function deltaLabel(percent: number | null): string {
  if (percent === null) return "new";
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(1)}%`;
}

export function CompareStep({ runId, headcount, variance }: CompareStepProps) {
  function handleRetry() {
    void variance.refetch();
  }

  const data = variance.data;

  return (
    <StepPanel title="Compare">
      {variance.isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : variance.isError || !data ? (
        <ErrorState
          title="Failed to load the comparison"
          description="Retry before treating this month as unchanged."
          onRetry={handleRetry}
        />
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Figure label="Headcount" current={headcount === null ? "—" : String(headcount)} previous="not reported" />
            <Figure
              label="Gross"
              current={formatMoney(data.currentRun.grossTotal)}
              previous={data.previousRun ? formatMoney(data.previousRun.grossTotal) : "—"}
            />
            <Figure
              label="Net"
              current={formatMoney(data.currentRun.netTotal)}
              previous={data.previousRun ? formatMoney(data.previousRun.netTotal) : "—"}
            />
          </dl>
          {data.previousRun ? null : <StepNote>No earlier locked run exists, so there is nothing to compare against.</StepNote>}
          <div className="space-y-1">
            <h3 className="text-dense font-semibold text-foreground">Biggest changes vs last run</h3>
            {data.topMovers.length === 0 ? (
              <StepNote>No employees were calculated.</StepNote>
            ) : (
              <ol className="divide-y divide-border rounded-md border border-border">
                {data.topMovers.slice(0, MOVER_LIMIT).map((mover) => (
                  <li key={mover.userId ?? mover.userName ?? mover.net} className="flex items-center justify-between gap-3 px-3 py-2 text-dense">
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{mover.userName ?? "Unnamed"}</span>
                    <span className="tabular-nums text-muted-foreground">{deltaLabel(mover.netDeltaPercent)}</span>
                    <span className="font-mono tabular-nums text-foreground">{formatMoney(mover.net)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
      <Link href={`/payroll/runs/${runId}?tab=variance`} className="text-dense underline underline-offset-2">
        Open the full variance
      </Link>
    </StepPanel>
  );
}
