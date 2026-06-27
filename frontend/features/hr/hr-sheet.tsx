"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

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
  const handleSubmit = () => {
    if (onSubmit) onSubmit();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="flex flex-col p-0 gap-0 sm:max-w-md">
        <SheetHeader className="shrink-0 px-5 pt-5 pb-4 border-b">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-xs text-muted-foreground">{description}</SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-5 py-5 space-y-5">
            {children}
          </div>
        </ScrollArea>

        {showSubmit && (
          <SheetFooter className="shrink-0 px-5 py-4 border-t flex-col gap-2">
            <Button
              className="w-full h-9 gap-1.5 transition-colors duration-200"
              onClick={handleSubmit}
              disabled={isPending || !onSubmit || submitDisabled}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
            <Button
              variant="outline"
              className="w-full h-9 transition-colors duration-200"
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
