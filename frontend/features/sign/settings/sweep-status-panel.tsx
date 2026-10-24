"use client";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { formatRelativeTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useSignSweepStatus } from "@/hooks/api/sign/settings";
import type { SignSweepRunSummary, SignSweepStaleness } from "@/types/sign";
import { SettingsSurface } from "./settings-surface";

const SWEEP_TITLE: Record<SignSweepRunSummary["sweep"], string> = {
  reminder: "Reminders",
  expiration: "Expiry",
};

const SWEEP_DESCRIPTION: Record<SignSweepRunSummary["sweep"], string> = {
  reminder: "Emails people who have not opened or finished their envelope.",
  expiration: "Closes envelopes that have passed their expiry date.",
};

const STALENESS: Record<SignSweepStaleness, { label: string; tone: StatusTone; detail: string }> = {
  ok: { label: "Running", tone: "success", detail: "Ran within the expected window." },
  never_run: {
    label: "Never run",
    tone: "danger",
    detail: "Nothing has called this job yet, so the rule above has not taken effect.",
  },
  stale: {
    label: "Stopped",
    tone: "danger",
    detail: "It ran before, then stopped. The scheduler is no longer calling it.",
  },
  errored: {
    label: "Failing",
    tone: "warning",
    detail: "The last run raised an error, so its work did not finish.",
  },
};

function SweepRow({ sweep }: { sweep: SignSweepRunSummary }) {
  const state = STALENESS[sweep.staleness];
  const tone = statusToneClasses(state.tone);
  const lastRun = sweep.ranAt ? formatRelativeTime(sweep.ranAt) : "Never";

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{SWEEP_TITLE[sweep.sweep]}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{SWEEP_DESCRIPTION[sweep.sweep]}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Last run {lastRun}
          <span aria-hidden="true"> · </span>
          <span className="tabular-nums">{sweep.affected}</span> affected
          <span aria-hidden="true"> · </span>
          expected every <span className="tabular-nums">{sweep.expectedWithinHours}h</span>
        </p>
        <p className={cn("mt-1 text-sm", sweep.healthy ? "text-muted-foreground" : tone.ink)}>{state.detail}</p>
        {sweep.error ? <p className={cn("mt-1 text-sm", statusToneClasses("danger").ink)}>{sweep.error}</p> : null}
      </div>
      <Badge variant="outline" className={cn("w-fit shrink-0", tone.surface, tone.ink, tone.rule)}>
        {state.label}
      </Badge>
    </div>
  );
}

export function SweepStatusPanel() {
  const sweepQuery = useSignSweepStatus();
  const panelState = usePageState({
    permission: "sign:admin:manage",
    isLoading: sweepQuery.isLoading,
    isError: sweepQuery.isError,
    error: sweepQuery.error,
  });

  function handleRetry() {
    void sweepQuery.refetch();
  }

  return (
    <SettingsSurface
      title="Scheduling"
      description="Reminders and expiry only happen when these jobs run."
    >
      <PageState
        resolution={panelState}
        loading={
          <div className="divide-y divide-border">
            <Skeleton className="h-20 w-full rounded-none" />
            <Skeleton className="h-20 w-full rounded-none" />
          </div>
        }
        onRetry={handleRetry}
        compact
      >
        <div className="divide-y divide-border">
          {sweepQuery.data?.sweeps.map((sweep) => <SweepRow key={sweep.sweep} sweep={sweep} />)}
        </div>
      </PageState>
    </SettingsSurface>
  );
}
