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

export type UnsavedChangesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  keepEditingLabel?: string;
  discardLabel?: string;
  saveLabel?: string;
  /** When omitted, only Discard + Keep editing are shown. */
  onSave?: () => void;
  onDiscard: () => void;
  isSaving?: boolean;
};

/**
 * Shared HRMS leave-with-dirty confirm — same layout as ConfirmSheet,
 * with Keep editing / Discard / Save changes.
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  title = "Unsaved changes",
  description = "You have unsaved changes. Save them before leaving, or discard to continue.",
  keepEditingLabel = "Keep editing",
  discardLabel = "Discard",
  saveLabel = "Save changes",
  onSave,
  onDiscard,
  isSaving = false,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={isSaving ? undefined : onOpenChange}
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
            disabled={isSaving}
          >
            {keepEditingLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-auto"
            onClick={onDiscard}
            disabled={isSaving}
          >
            {discardLabel}
          </Button>
          {onSave ? (
            <LoadingButton
              type="button"
              className="h-10 w-full gap-1.5 sm:h-9 sm:w-auto"
              onClick={onSave}
              isPending={isSaving}
              loadingText="Saving…"
            >
              {saveLabel}
            </LoadingButton>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
