"use client";

import Link from "next/link";
import { toast } from "sonner";
import { CutoffChip } from "@/components/shared/cutoff-chip";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { useCreateRun } from "@/hooks/api/payroll/runs";
import type { PayrollReadiness } from "@/hooks/api/payroll/readiness-schema";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { StepNote, StepPanel } from "./step-panel";

interface OpenMonthStepProps {
  month: string;
  readiness: PayrollReadiness;
  isCurrent: boolean;
  onCreated: () => void;
}

export function OpenMonthStep({ month, readiness, isCurrent, onCreated }: OpenMonthStepProps) {
  const canCreate = useCan("payroll:runs:create");
  const createRun = useCreateRun();

  function handleCreate() {
    createRun.mutate(month, {
      onSuccess: () => {
        toast.success("Payroll run created");
        onCreated();
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }

  const cta =
    isCurrent && readiness.run === null ? (
      canCreate ? (
        <LoadingButton size="sm" className="min-h-11 sm:min-h-9" onClick={handleCreate} isPending={createRun.isPending} loadingText="Creating…">
          Create run
        </LoadingButton>
      ) : (
        <StepNote>Someone who can create payroll runs needs to open this month.</StepNote>
      )
    ) : null;

  return (
    <StepPanel title="Open month" cta={cta}>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-0.5">
          <dt className="text-micro uppercase tracking-wide text-muted-foreground">Pay period</dt>
          <dd className="text-dense font-medium tabular-nums text-foreground">
            {formatShortDate(readiness.window.start)} – {formatShortDate(readiness.window.end)}
          </dd>
        </div>
        <div className="space-y-0.5">
          <dt className="text-micro uppercase tracking-wide text-muted-foreground">Cut-off</dt>
          <dd>
            {readiness.cutoff === null ? (
              <span className="text-dense text-muted-foreground">
                This cycle has no cut-off date.{" "}
                <Link href="/payroll/calendar" className="underline underline-offset-2">
                  Add it in the payroll calendar
                </Link>
              </span>
            ) : (
              <CutoffChip cutoff={readiness.cutoff} href="/payroll/calendar" />
            )}
          </dd>
        </div>
      </dl>
      {readiness.run ? (
        <StepNote>
          Run #{readiness.run.id} was created {formatShortDate(readiness.run.createdAt)}.{" "}
          <Link href={`/payroll/runs/${readiness.run.id}`} className="underline underline-offset-2">
            Open the run
          </Link>
        </StepNote>
      ) : (
        <StepNote>No regular run exists for this month yet. Creating it opens the month for processing.</StepNote>
      )}
    </StepPanel>
  );
}
