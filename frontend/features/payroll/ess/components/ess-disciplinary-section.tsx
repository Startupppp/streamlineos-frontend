"use client";

import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMyDisciplinaryActions,
  useAcknowledgeDisciplinaryAction,
} from "@/hooks/api/hr/cases";
import { getErrorMessage } from "@/lib/get-error-message";

const ACTION_LABEL: Record<string, string> = {
  verbal_warning: "Verbal warning",
  written_warning: "Written warning",
  final_warning: "Final warning",
  suspension: "Suspension",
  termination_recommended: "Termination recommended",
};

export function EssDisciplinarySection() {
  const { data, isLoading, isError } = useMyDisciplinaryActions();
  const acknowledge = useAcknowledgeDisciplinaryAction();

  if (isLoading) {
    return (
      <div id="disciplinary" className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) return null;

  const rows = data ?? [];
  if (rows.length === 0) return null;

  return (
    <section id="disciplinary" className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Disciplinary notices</h2>
        <p className="text-[11px] text-muted-foreground">
          Acknowledgment confirms receipt only — not agreement. Contact HR with questions.
        </p>
      </div>
      <ul className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-[12px] font-medium">
                {ACTION_LABEL[row.actionType] ?? row.actionType}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Effective {String(row.effectiveDate).slice(0, 10)}
                {row.acknowledgedAt
                  ? ` · Acknowledged ${String(row.acknowledgedAt).slice(0, 10)}`
                  : " · Pending acknowledgment"}
              </p>
            </div>
            {!row.acknowledgedAt && (
              <LoadingButton
                size="sm"
                className="h-7 text-xs"
                isPending={acknowledge.isPending}
                onClick={() =>
                  acknowledge.mutate(
                    { id: row.id },
                    {
                      onError: (e) => toast.error(getErrorMessage(e)),
                    },
                  )
                }
              >
                Acknowledge receipt
              </LoadingButton>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
