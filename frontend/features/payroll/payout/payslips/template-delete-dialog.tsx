"use client";

import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
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
          const msg = getErrorMessage(err);
          if (msg.includes("conflict") || msg.toLowerCase().includes("default")) {
            toast.error("Cannot delete the default template");
          } else {
            toast.error(msg);
          }
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete template?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &quot;{template.name}&quot;. This action cannot be undone.
            Default templates cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <LoadingButton
              variant="destructive"
              onClick={handleConfirm}
              isPending={deleteMutation.isPending}
              loadingText="Deleting…"
            >
              Delete
            </LoadingButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
