"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRemovePayrollSampleData } from "@/hooks/api/payroll/sample-data";

export function SampleDataBanner({ people, canRemove }: { people: number; canRemove: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remove = useRemovePayrollSampleData();

  function handleOpenConfirm() {
    setConfirmOpen(true);
  }

  function handleRemove() {
    remove.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false);
        toast.success("Sample data removed");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2 text-xs"
    >
      <FlaskConical className="h-3.5 w-3.5 text-status-warning" aria-hidden />
      <span className="flex-1">
        Sample data — {people} sample {people === 1 ? "person" : "people"} in this workspace. Remove anytime.
      </span>
      {canRemove && (
        <Button size="sm" variant="ghost" className="h-7" onClick={handleOpenConfirm}>
          Remove
        </Button>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove sample data?"
        description="This deletes the sample people, their payee records and their sample salaries. Your own data is not touched."
        confirmLabel="Remove sample data"
        destructive
        keepOpenOnConfirm
        isPending={remove.isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
