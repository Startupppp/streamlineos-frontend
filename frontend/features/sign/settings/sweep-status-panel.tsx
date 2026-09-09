"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { formatRelativeTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { useSignSweepStatus } from "@/hooks/api/sign/settings";
import type { SignSweepRunSummary, SignSweepStaleness } from "@/types/sign";

const SWEEP_TITLE: Record<SignSweepRunSummary["sweep"], string> = {
  reminder: "Reminder sweep",
  expiration: "Expiration sweep",
};

const SWEEP_DESCRIPTION: Record<SignSweepRunSummary["sweep"], string> = {
  reminder: "Chases signers who have not opened or completed their envelope.",
  expiration: "Closes envelopes that have passed their expiry date.",
};

const STALENESS: Record<SignSweepStaleness, { label: string; tone: StatusTone; detail: string }> = {
  ok: { label: "Running", tone: "success", detail: "Ran within the expected window." },
  never_run: {
    label: "Never run",
    tone: "danger",
    detail: "No scheduler has ever called this sweep for your organisation, so nothing it promises has happened.",
  },
  stale: {
    label: "Stopped",
    tone: "danger",
    detail: "It has run before but not recently, which means the scheduler has stopped calling it.",
  },
  errored: {
    label: "Failing",
    tone: "warning",
    detail: "It ran recently and raised an error, so its work did not complete.",
  },
};

function SweepRow({ sweep }: { sweep: SignSweepRunSummary }) {
  const state = STALENESS[sweep.staleness];
  const tone = statusToneClasses(state.tone);

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{SWEEP_TITLE[sweep.sweep]}</p>
          <p className="text-sm text-muted-foreground">{SWEEP_DESCRIPTION[sweep.sweep]}</p>
        </div>
        <Badge variant="outline" className={cn("shrink-0", tone.surface, tone.ink, tone.rule)}>
          {state.label}
        </Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted-foreground">Last run</dt>
          <dd className="text-sm font-mono tabular-nums">{sweep.ranAt ? formatRelativeTime(sweep.ranAt) : "Never"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Affected</dt>
          <dd className="text-sm font-mono tabular-nums">{sweep.affected}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Expected every</dt>
          <dd className="text-sm font-mono tabular-nums">{sweep.expectedWithinHours}h</dd>
        </div>
      </dl>
      <p className={cn("mt-2 text-sm", sweep.healthy ? "text-muted-foreground" : tone.ink)}>{state.detail}</p>
      {sweep.error ? <p className={cn("mt-1 text-sm", statusToneClasses("danger").ink)}>{sweep.error}</p> : null}
    </div>
  );
}

// SIGN-P0-02 built GET /sign/admin/sweep-status and nothing rendered it, so the honesty rule it
// exists for — an admin must be able to see last-run, because silent failure is how the unwired
// sweep shipped — held in the API and not on any screen.
export function SweepStatusPanel() {
  const { data, isLoading, isError, error, refetch } = useSignSweepStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Reminder &amp; expiry scheduling</CardTitle>
        <CardDescription>
          Reminder cadence and expiry windows only take effect if these sweeps are actually being called.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </>
        ) : isError ? (
          <ErrorState
            title="Couldn't load sweep status"
            description={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : (
          data?.sweeps.map((sweep) => <SweepRow key={sweep.sweep} sweep={sweep} />)
        )}
      </CardContent>
    </Card>
  );
}
