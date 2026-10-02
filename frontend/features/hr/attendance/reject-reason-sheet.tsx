"use client";

import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface RejectReasonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  placeholder: string;
  fieldId: string;
  value: string;
  onValueChange: (value: string) => void;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RejectReasonSheet({
  open,
  onOpenChange,
  title,
  description,
  placeholder,
  fieldId,
  value,
  onValueChange,
  isPending,
  onCancel,
  onConfirm,
}: RejectReasonSheetProps) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      onValueChange(event.target.value);
    },
    [onValueChange],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col p-0 sm:max-w-sm">
        <SheetHeader className="border-b p-5 pb-4">
          <SheetTitle className="text-base font-semibold">{title}</SheetTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </SheetHeader>
        <div className="flex-1 space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor={fieldId} className="text-xs font-medium text-foreground">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={fieldId}
              placeholder={placeholder}
              value={value}
              onChange={handleChange}
              rows={4}
              className="resize-none text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 border-t p-5 pt-4">
          <Button variant="outline" className="h-9 flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <LoadingButton
            variant="destructive"
            className="h-9 flex-1"
            isPending={isPending}
            disabled={!value.trim()}
            onClick={onConfirm}
          >
            Reject
          </LoadingButton>
        </div>
      </SheetContent>
    </Sheet>
  );
}
