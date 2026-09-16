"use client";

import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
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

  function handleAcknowledgeError(error: unknown) {
    toast.error(getErrorMessage(error));
  }

  function handleAcknowledge(actionId: number) {
    return function acknowledgeAction() {
      acknowledge.mutate({ disciplinaryId: actionId }, { onError: handleAcknowledgeError });
    };
  }

  if (isLoading) {
    return (
      <section id="disciplinary" className="flex min-h-0 w-full flex-1 flex-col">
        <div className={PAGE_BODY_SKELETON_CLASS}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section id="disciplinary" className="flex min-h-0 w-full flex-1 flex-col">
        <EmptyState
          title="Unable to load notices"
          description="Try again in a moment."
          className={PAGE_BODY_EMPTY_CLASS}
        />
      </section>
    );
  }

  const rows = data?.data ?? [];
  if (rows.length === 0) {
    return (
      <section id="disciplinary" className="flex min-h-0 w-full flex-1 flex-col">
        <EmptyState
          illustrationPreset="alert"
          title="No notices"
          description="Disciplinary notices that need your acknowledgment will appear here."
          className={PAGE_BODY_EMPTY_CLASS}
        />
      </section>
    );
  }

  return (
    <section id="disciplinary" className="flex min-h-0 w-full flex-1 flex-col gap-3">
      <p className="shrink-0 text-dense text-muted-foreground">
        Acknowledgment confirms receipt only — not agreement. Contact HR with questions.
      </p>
      <ul className="min-h-0 w-full flex-1 divide-y divide-border overflow-y-auto rounded-xl border border-border bg-card">
        {rows.map((row) => {
          const acked = "acknowledgedAt" in row ? row.acknowledgedAt : null;
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium">
                  {ACTION_LABEL[row.actionType] ?? row.actionType}
                </p>
                <p className="text-dense text-muted-foreground">
                  Effective {String(row.effectiveDate).slice(0, 10)}
                  {acked
                    ? ` · Acknowledged ${String(acked).slice(0, 10)}`
                    : " · Pending acknowledgment"}
                </p>
              </div>
              {!acked && (
                <LoadingButton
                  size="sm"
                  className="h-7 text-xs"
                  isPending={acknowledge.isPending}
                  onClick={handleAcknowledge(row.id)}
                >
                  Acknowledge receipt
                </LoadingButton>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
