"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Employee } from "./hr-types";

interface HrDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  onConfirm: () => void;
}

export function HrDeleteDialog({
  open,
  onOpenChange,
  employee,
  onConfirm,
}: HrDeleteDialogProps) {
  const name = employee?.firstName ?? "this employee";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Terminate Employee"
      description={`Are you sure you want to terminate ${name}? They will immediately lose access to the system. Their records will be preserved.`}
      confirmLabel="Terminate"
      destructive
      onConfirm={onConfirm}
    />
  );
}
