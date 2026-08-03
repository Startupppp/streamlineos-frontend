"use client";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import type { ComboboxOption } from "@/components/ui/combobox";
import type { AssignDialogState } from "./asset-constants";

export function AssignAssetSheet({
  assignDialog,
  assignEmpId,
  assignPending,
  employeeOptions,
  onOpenChange,
  onEmpChange,
  onConfirmAssign,
  onUnassign,
}: {
  assignDialog: AssignDialogState | null;
  assignEmpId: string;
  assignPending: boolean;
  employeeOptions: ComboboxOption[];
  onOpenChange: (open: boolean) => void;
  onEmpChange: (id: string) => void;
  onConfirmAssign: () => void;
  onUnassign: () => void;
}) {
  const isOpen = assignDialog !== null;
  const hasCurrentAssignee = Boolean(assignDialog?.currentAssignedTo);

  return (
    <HrSheet
      open={isOpen}
      onOpenChange={onOpenChange}
      title={hasCurrentAssignee ? "Reassign Asset" : "Assign Asset"}
      description={assignDialog?.assetName ? `Asset: ${assignDialog.assetName}` : undefined}
      onSubmit={onConfirmAssign}
      submitLabel={
        assignPending
          ? "Saving…"
          : hasCurrentAssignee && assignEmpId
            ? "Reassign"
            : "Assign"
      }
      submitDisabled={assignPending || (!assignEmpId && !hasCurrentAssignee)}
      isPending={assignPending}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {hasCurrentAssignee ? "Reassign to Employee" : "Assign to Employee"}
          </label>
          <Combobox
            key={assignDialog?.assetId ?? "closed"}
            options={employeeOptions}
            value={assignEmpId}
            onChange={onEmpChange}
            placeholder="Select employee…"
            searchPlaceholder="Search by name or email…"
          />
        </div>
        {hasCurrentAssignee && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Leave the selection empty and click Assign to unassign the current employee.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={onUnassign}
              disabled={assignPending}
            >
              Unassign Employee
            </Button>
          </div>
        )}
      </div>
    </HrSheet>
  );
}
