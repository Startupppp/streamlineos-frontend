"use client";

import { Undo2, Wrench } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useRepairMeasure, useRepairs, useRevertRepair } from "@/hooks/api/crm/autonomy";
import { getErrorMessage } from "@/lib/get-error-message";
import type { AutonomyRepair, RepairMeasure } from "@/types/crm/autonomy";


function AutomatedShare({ measure }: { measure: RepairMeasure }) {
  const { automatedShare, automated, manual } = measure.resolution;

  if (automatedShare === null)
    return (
      <span className="text-sm text-muted-foreground">
        Nothing was decided in this window
      </span>
    );

  return (
    <span className="text-sm font-medium tabular-nums">
      {Math.round(automatedShare * 100)}%{" "}
      <span className="font-normal text-muted-foreground">
        ({automated} by the system, {manual} by a person)
      </span>
    </span>
  );
}

function RepairRow({
  repair,
  canRevert,
  onRevert,
  isReverting,
}: {
  repair: AutonomyRepair;
  canRevert: boolean;
  onRevert: (repairId: string) => void;
  isReverting: boolean;
}) {
  const reverted = repair.revertedAt !== null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-gap-field border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{repair.partyName ?? "A record"}</span>
          <span className="text-muted-foreground"> · {repair.field}</span>
        </p>
        
        <p className="truncate text-micro text-muted-foreground">
          {repair.previousValue ?? "(empty)"} → {repair.repairedValue ?? "(empty)"}
        </p>
      </div>

      <div className="flex items-center gap-gap-toolbar">
        <Badge variant="secondary">{repair.repairClass.replace(/_/g, " ")}</Badge>
        {reverted ? (
          <Badge variant="outline">put back</Badge>
        ) : canRevert ? (
          <LoadingButton
            variant="outline"
            size="sm"
            isPending={isReverting}
            onClick={() => onRevert(repair.autonomyRepairId)}
          >
            <Undo2 className="size-4 sm:mr-1.5" />
            <span className="sr-only sm:not-sr-only">Put back</span>
          </LoadingButton>
        ) : null}
      </div>
    </div>
  );
}

export function RepairActivityPanel() {
  const canRevert = useCan("crm:autonomy:reverse");
  const measure = useRepairMeasure(30);
  const repairs = useRepairs({ limit: 25 });
  const revert = useRevertRepair();

  if (measure.isLoading || repairs.isLoading) return <Skeleton className="h-56 w-full" />;
  if (!measure.data && !repairs.data) return null;

  const items = repairs.data?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-gap-inline">
          <Wrench className="size-4" />
          What the repair loop did
        </CardTitle>
        <CardDescription>
          Fields the system corrected without being asked, over the last 30 days.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-gap-section">
        {measure.data ? (
          <div className="space-y-gap-field">
            <div className="flex flex-wrap items-baseline gap-gap-field">
              <span className="text-micro text-muted-foreground">Cleared by the system</span>
              <AutomatedShare measure={measure.data} />
            </div>

            <dl className="grid grid-cols-2 gap-gap-field sm:grid-cols-4">
              <div>
                <dt className="text-micro text-muted-foreground">Repairs applied</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {measure.data.repairs.applied}
                </dd>
              </div>
              <div>
                
                <dt className="text-micro text-muted-foreground">Put back by a person</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {measure.data.repairs.reverted}
                </dd>
              </div>
              <div>
                <dt className="text-micro text-muted-foreground">Still open</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {measure.data.remaining.total}
                </dd>
              </div>
              <div>
                <dt className="text-micro text-muted-foreground">Oldest open</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {measure.data.remaining.oldestOpenAgeDays === null
                    ? "—"
                    : `${measure.data.remaining.oldestOpenAgeDays}d`}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        {revert.isError ? (
          <p role="alert" className="text-label text-status-danger-ink">
            {getErrorMessage(revert.error)}
          </p>
        ) : null}

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            The system has not repaired anything. That is what an empty list means here —
            not that there was nothing to fix.
          </p>
        ) : (
          <div>
            {items.map((repair) => (
              <RepairRow
                key={repair.autonomyRepairId}
                repair={repair}
                canRevert={canRevert}
                onRevert={(repairId) => revert.mutate({ repairId })}
                isReverting={revert.isPending && revert.variables?.repairId === repair.autonomyRepairId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
