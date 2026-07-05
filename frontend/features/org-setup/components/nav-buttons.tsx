"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavButtonsProps = {
  onBack: () => void;
  onNext: () => void;
  skipLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
};

// Sticky bottom action bar on mobile (<lg); inline within the main panel on desktop.
export function NavButtons({
  onBack,
  onNext,
  skipLabel,
  nextLabel,
  nextDisabled,
}: NavButtonsProps) {
  return (
    <div
      className={cn(
        "flex gap-2 pt-1",
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 py-3",
        "lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0",
      )}
    >
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
