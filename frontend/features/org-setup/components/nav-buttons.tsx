"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavButtonsProps = {
  onBack: () => void;
  onNext: () => void;
  skipLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
};

export function NavButtons({
  onBack,
  onNext,
  skipLabel,
  nextLabel,
  nextDisabled,
}: NavButtonsProps) {
  return (
    <div className="flex gap-2 pt-1">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="h-9 px-3 text-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
      </Button>

      {skipLabel && (
        <Button
          type="button"
          variant="ghost"
          onClick={onNext}
          className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          {skipLabel}
        </Button>
      )}

      <Button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 h-9 text-sm gap-1.5"
      >
        {nextLabel ?? "Continue"} <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
