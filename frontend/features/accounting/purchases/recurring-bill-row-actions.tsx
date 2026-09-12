"use client";

import { toast } from "sonner";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useRunRecurringBillNow,
  useDeleteRecurringBill,
  type RecurringBillTemplate,
} from "@/hooks/api/accounting/ap";
import { useCan } from "@/hooks/api/access";

interface RowActionsProps {
  template: RecurringBillTemplate;
  onEdit: (t: RecurringBillTemplate) => void;
}

export function RecurringBillRowActions({ template, onEdit }: RowActionsProps) {
  const canManage = useCan("accounting:recurring:manage");
  const runNow = useRunRecurringBillNow(template.id);
  const deleteMutation = useDeleteRecurringBill(template.id);

  function handleEdit(): void {
    onEdit(template);
  }

  function handleRunNow(): void {
    runNow.mutate(undefined, {
      onSuccess: () => toast.success("Bill generated from template"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleDelete(): void {
    deleteMutation.mutate(undefined, {
      onSuccess: () => toast.success("Template deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handlePreventClose(e: Event): void {
    e.preventDefault();
  }

  if (!canManage) return null;

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton icon={EllipsisIcon} iconSize={14} variant="ghost" size="icon" className="w-7" aria-label="Template actions" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
          <DropdownMenuItem
            disabled={runNow.isPending}
            onSelect={handleRunNow}
            className="gap-2"
          >
            {runNow.isPending ? "Running…" : "Run now"}
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
            This will permanently delete &ldquo;{template.name}&rdquo;. Existing bills generated
            from it are not affected.
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
