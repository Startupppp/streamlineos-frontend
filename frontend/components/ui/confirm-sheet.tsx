"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
    <Sheet open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 px-5 pb-5 pt-5 text-left">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">{description}</SheetDescription>
        </SheetHeader>

        <SheetFooter className="shrink-0 flex-col gap-2 border-t border-border bg-muted/30 px-5 py-4">
          <LoadingButton
            variant={destructive ? "destructive" : "default"}
            className="h-9 w-full gap-1.5 transition-colors duration-200"
            onClick={onConfirm}
            isPending={isPending}
          >
            {confirmLabel}
          </LoadingButton>
          <Button
            variant="outline"
            className="h-9 w-full transition-colors duration-200"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {cancelLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
