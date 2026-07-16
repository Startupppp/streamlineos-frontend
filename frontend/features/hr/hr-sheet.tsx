"use client";

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

interface HrSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  isPending?: boolean;
  submitDisabled?: boolean;
  side?: "right" | "left";
  showSubmit?: boolean;
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
}: HrSheetProps) {
  function handleSubmit() {
    if (onSubmit) onSubmit();
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b border-border px-5 pb-4 pt-5 text-left">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-xs text-muted-foreground">{description}</SheetDescription>
          )}
        </SheetHeader>

        <SheetBody className="space-y-5 px-5 py-5">{children}</SheetBody>

        {showSubmit && (
          <SheetFooter className="shrink-0 flex-col gap-2 border-t border-border bg-muted/30 px-5 py-4">
            <Button
              className="h-9 w-full gap-1.5 transition-colors duration-200"
              onClick={handleSubmit}
              disabled={isPending || !onSubmit || submitDisabled}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
            <Button
              variant="outline"
              className="h-9 w-full transition-colors duration-200"
              onClick={handleCancel}
              disabled={isPending}
            >
              {cancelLabel}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
