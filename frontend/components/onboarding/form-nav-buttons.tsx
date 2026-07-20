"use client";

import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface FormNavButtonsProps {
  onBack?: () => void;
  onClear?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function FormNavButtons({
  onBack,
  onClear,
  isLoading,
  submitLabel = "Save & Continue",
}: FormNavButtonsProps) {
  const hasLeadingActions = Boolean(onBack || onClear);

  return (
    <div
      className={
        hasLeadingActions
          ? "flex flex-wrap items-center justify-between gap-2 sm:gap-3"
          : "flex justify-end"
      }
    >
      {hasLeadingActions && (
        <div className="flex items-center gap-2">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          {onClear && (
            <Button type="button" variant="ghost" onClick={onClear} disabled={isLoading}>
              Clear
            </Button>
          )}
        </div>
      )}
      <LoadingButton type="submit" isPending={isLoading}>
        {submitLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </LoadingButton>
    </div>
  );
}
