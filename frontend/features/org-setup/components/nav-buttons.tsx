"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavButtonsProps = {
  onBack: () => void;
  onNext: () => void;
  skipLabel?: string;
  nextLabel?: string;
  nextIcon?: LucideIcon;
  nextDisabled?: boolean;
};

// Sticky bottom action bar on mobile (<lg); inline within the main panel on desktop.
export function NavButtons({
  onBack,
  onNext,
  skipLabel,
  nextLabel,
  nextIcon: NextIcon,
  nextDisabled,
}: NavButtonsProps) {
  return (
    <div
      className={cn(
        "flex gap-2 pt-1",
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background px-4 pt-3",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:pt-1 lg:pb-0",
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className="h-9 px-3 text-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1" aria-hidden /> Back
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
        {NextIcon && <NextIcon className="h-3.5 w-3.5" aria-hidden />}
        {nextLabel ?? "Continue"} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}
