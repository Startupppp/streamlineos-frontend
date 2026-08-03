"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ConfirmWithReasonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
  reasonErrorMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  onConfirm: (reason: string) => void;
}

export function ConfirmWithReasonSheet({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel = "Reason",
  reasonPlaceholder = "Enter a reason...",
  reasonRequired = false,
  reasonErrorMessage = "A reason is required.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  isPending = false,
  onConfirm,
}: ConfirmWithReasonSheetProps) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setTouched(false);
    }
  }, [open]);

  const trimmedReason = reason.trim();
  const showError = reasonRequired && touched && !trimmedReason;

  function handleConfirm() {
    if (reasonRequired && !trimmedReason) {
      setTouched(true);
      return;
    }
    onConfirm(trimmedReason);
  }

  return (
    <Sheet open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <SheetContent className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b border-border px-5 pb-4 pt-5 text-left">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          {description && (
            <SheetDescription className="text-xs text-muted-foreground">{description}</SheetDescription>
          )}
        </SheetHeader>

        <SheetBody className="space-y-1.5 px-5 py-5">
          <Label htmlFor="confirm-with-reason-textarea" className="text-sm font-semibold text-foreground">
            {reasonLabel} {reasonRequired && <span className="text-destructive">*</span>}
            {!reasonRequired && <span className="text-muted-foreground font-normal">(optional)</span>}
          </Label>
          <Textarea
            id="confirm-with-reason-textarea"
            placeholder={reasonPlaceholder}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (touched) setTouched(false);
            }}
            onBlur={() => setTouched(true)}
            rows={4}
            maxLength={1000}
            className="resize-none w-full"
            aria-invalid={showError || undefined}
            aria-describedby={showError ? "confirm-with-reason-error" : undefined}
          />
          {showError && <p id="confirm-with-reason-error" className="text-xs text-destructive">{reasonErrorMessage}</p>}
        </SheetBody>

        <SheetFooter className="shrink-0 flex-col gap-2 border-t border-border bg-muted/30 px-5 py-4">
          <LoadingButton
            variant={destructive ? "destructive" : "default"}
            className="h-9 w-full gap-1.5 transition-colors duration-200"
            onClick={handleConfirm}
            isPending={isPending}
            disabled={reasonRequired && !trimmedReason}
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
