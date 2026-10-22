"use client";

import { useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChangesGuard } from "@/hooks/common/use-unsaved-changes-guard";

interface HrSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: () => void | Promise<void>;
  onCancel?: () => void;
  submitLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  isPending?: boolean;
  submitDisabled?: boolean;
  side?: "right" | "left";
  showSubmit?: boolean;
  isDirty?: boolean;
  onDiscard?: () => void;
}

export function HrSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isPending = false,
  submitDisabled = false,
  side = "right",
  showSubmit = true,
  isDirty = false,
  onDiscard,
}: HrSheetProps) {
  const closeSheet = useCallback(() => {
    if (onCancel) onCancel();
    else onOpenChange(false);
  }, [onCancel, onOpenChange]);

  const { requestLeave, dialogProps } = useUnsavedChangesGuard({
    isDirty: open && isDirty,
    saveMode: "stay",
    onSave: onSubmit
      ? async () => {
          await onSubmit();
        }
      : undefined,
    onDiscard: () => {
      onDiscard?.();
    },
  });

  function handleSubmit() {
    if (onSubmit) onSubmit();
  }

  function handleCancel() {
    requestLeave(closeSheet);
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true);
      return;
    }
    requestLeave(() => onOpenChange(false));
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side={side}
          className="flex w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <SheetHeader className="shrink-0 border-b border-border px-5 pb-4 pt-5 text-left">
            <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
            {description && (
              <SheetDescription className="text-xs text-muted-foreground">
                {description}
              </SheetDescription>
            )}
          </SheetHeader>

          <SheetBody className="space-y-5 px-5 py-5">{children}</SheetBody>

          {showSubmit && (
            <SheetFooter className="shrink-0 flex-row gap-2 border-t border-border bg-muted/30 px-5 py-4">
              <Button
                variant="outline"
                className="h-9 flex-1 transition-colors duration-200"
                onClick={handleCancel}
                disabled={isPending}
              >
                {cancelLabel}
              </Button>
              <LoadingButton
                className="h-9 flex-1 gap-1.5 transition-colors duration-200"
                onClick={handleSubmit}
                disabled={!onSubmit || submitDisabled}
                isPending={isPending}
              >
                {submitLabel}
              </LoadingButton>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <UnsavedChangesDialog {...dialogProps} />
    </>
  );
}
