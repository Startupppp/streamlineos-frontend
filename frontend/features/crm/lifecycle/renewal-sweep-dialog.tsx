"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useSweepLifecycleTriggers } from "@/hooks/api/crm/lifecycle";
import { getErrorMessage } from "@/lib/get-error-message";
import { describeSweepEntry } from "./lifecycle-format";

interface RenewalSweepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partyNames: ReadonlyMap<string, string>;
}

export function RenewalSweepDialog({ open, onOpenChange, partyNames }: RenewalSweepDialogProps) {
  const sweep = useSweepLifecycleTriggers();
  const result = sweep.data;

  const handleConfirm = useCallback(() => {
    sweep.mutate(
      {},
      {
        onSuccess: (data) =>
          toast.success(`Considered ${data.considered} contracts: ${data.opened} opened, ${data.reoffered} re-offered`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [sweep]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) sweep.reset();
      onOpenChange(next);
    },
    [onOpenChange, sweep],
  );

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={result ? "Renewal sweep finished" : "Run the renewal sweep?"}
      description={
        result
          ? `${result.considered} considered · ${result.opened} opened · ${result.reoffered} re-offered · ${result.held} drafts held`
          : "Up to 50 contracts due for a renewal conversation get an opportunity and a drafted message held for review. Drafting uses AI credits."
      }
      content={
        result && result.entries.length > 0 ? (
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto text-sm">
            {result.entries.map((entry) => (
              <li
                key={entry.customerLifecycleId}
                className="rounded-xl border border-border bg-surface-inset p-3 dark:border-background"
              >
                <span className="font-medium">{partyNames.get(entry.partyId) ?? "Customer"}</span>
                {` — ${describeSweepEntry(entry)}`}
              </li>
            ))}
          </ul>
        ) : undefined
      }
      confirmLabel="Run sweep"
      hideConfirm={result !== undefined}
      keepOpenOnConfirm
      isPending={sweep.isPending}
      onConfirm={handleConfirm}
    />
  );
}
