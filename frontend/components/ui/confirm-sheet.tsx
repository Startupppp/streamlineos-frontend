"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";

interface ConfirmSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
}

export function ConfirmSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isPending = false,
  onConfirm,
}: ConfirmSheetProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={isPending ? undefined : onOpenChange}
    >
      <AlertDialogContent className="gap-4 p-4 sm:max-w-md sm:p-6">
        <AlertDialogHeader className="space-y-2 text-left">
          <AlertDialogTitle className="text-base font-semibold leading-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full sm:h-9 sm:w-auto"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
          <LoadingButton
            type="button"
            variant={destructive ? "destructive" : "default"}
            className="h-10 w-full gap-1.5 sm:h-9 sm:w-auto"
            onClick={onConfirm}
            isPending={isPending}
          >
            {confirmLabel}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
