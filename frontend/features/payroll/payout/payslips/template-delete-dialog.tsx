"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
import { useDeletePayslipTemplate } from "@/hooks/api/payroll";
import type { PayslipTemplate } from "@/types/payroll";

interface Props {
  template: PayslipTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateDeleteDialog({ template, open, onOpenChange }: Props) {
  const deleteMutation = useDeletePayslipTemplate();

  function handleConfirm() {
    deleteMutation.mutate(
      { templateId: template.id },
      {
        onSuccess: () => {
          toast.success("Template deleted");
          onOpenChange(false);
        },
        onError: (err) => {
          if (isApiError(err) && err.status === 409) {
            toast.error("Cannot delete the default template");
          } else {
            toast.error(getErrorMessage(err));
          }
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete template?"
      description={
        <>
          This will permanently delete &quot;{template.name}&quot;. This action cannot be undone.
          Default templates cannot be deleted.
        </>
      }
      destructive
      confirmLabel="Delete"
      isPending={deleteMutation.isPending}
      onConfirm={handleConfirm}
    />
  );
}
