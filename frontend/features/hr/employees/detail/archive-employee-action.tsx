"use client";

import { useState } from "react";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useArchiveEmployee } from "@/hooks/api/hr/termination";
import { getErrorMessage } from "@/lib/get-error-message";

interface ArchiveEmployeeActionProps {
  employeeUserId: string;
  employeeName: string;
  onArchived: () => void;
}

export function ArchiveEmployeeAction({ employeeUserId, employeeName, onArchived }: ArchiveEmployeeActionProps) {
  const [open, setOpen] = useState(false);
  const archive = useArchiveEmployee();

  function handleOpen() {
    setOpen(true);
  }

  function handleConfirm() {
    archive.mutate(
      { employeeUserId },
      {
        onSuccess() {
          toast.success(`${employeeName} archived`);
          setOpen(false);
          onArchived();
        },
        onError(error) {
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 px-2.5" onClick={handleOpen} aria-label="Archive employee">
        <Archive className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Archive</span>
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Archive ${employeeName}?`}
        description="Their employment record ends today and they lose access to this organization. No termination letter, final settlement or exit checklist is created. Their history is kept, and Rehire brings them back."
        confirmLabel="Archive employee"
        destructive
        keepOpenOnConfirm
        isPending={archive.isPending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
