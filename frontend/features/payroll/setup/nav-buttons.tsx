"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";

type NavButtonsProps = {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  isLoading?: boolean;
  disableBack?: boolean;
  disableNext?: boolean;
};

export function NavButtons({
  onBack,
  onNext,
  nextLabel = "Continue",
  isLoading,
  disableBack,
  disableNext,
}: NavButtonsProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
      {onBack ? (
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={disableBack}
          className="gap-1.5"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      ) : (
        <div />
      )}
      {onNext && (
        <Button
          onClick={onNext}
          disabled={disableNext || isLoading}
          className="gap-1.5"
        >
          {nextLabel}
          {nextLabel === "Continue" && <ArrowRight className="h-3.5 w-3.5" />}
        </Button>
      )}
    </div>
  );
}
