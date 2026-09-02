"use client";

import { toast } from "sonner";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useRunRecurringTemplate,
  useDeleteRecurringTemplate,
} from "@/hooks/api/accounting/ar";
import { getErrorMessage } from "@/lib/get-error-message";
import type { RecurringInvoiceTemplate } from "@/types/accounting/ar";

interface RowActionsProps {
  template: RecurringInvoiceTemplate;
  onEdit: (template: RecurringInvoiceTemplate) => void;
}

export function TemplateRowActions({ template, onEdit }: RowActionsProps) {
  const runMutation = useRunRecurringTemplate();
  const deleteMutation = useDeleteRecurringTemplate();

  function handleEdit(): void {
    onEdit(template);
  }

  function handleRunNow(): void {
    runMutation.mutate(
      { templateId: template.id },
      {
        onSuccess: () => toast.success("Invoice generated from template"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleDelete(): void {
    deleteMutation.mutate(
      { templateId: template.id },
      {
        onSuccess: () => toast.success("Template deleted"),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handlePreventClose(e: Event): void {
    e.preventDefault();
  }

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton icon={EllipsisIcon} iconSize={14} variant="ghost" size="icon" className="w-7" aria-label="Template actions" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            disabled={runMutation.isPending}
            onSelect={handleRunNow}
          >
            {runMutation.isPending ? "Running…" : "Run now"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              onSelect={handlePreventClose}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete template?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete &ldquo;{template.name}&rdquo;. Already generated invoices
            are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
