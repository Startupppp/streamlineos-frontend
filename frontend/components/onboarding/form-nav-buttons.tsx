"use client";

import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";

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
    <div className={hasLeadingActions ? "flex items-center justify-between gap-3" : "flex justify-end"}>
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
      <Button type="submit" disabled={isLoading} aria-busy={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {submitLabel}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
