"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ComponentType, Ref } from "react";
import type { IconHandle } from "@animateicons/react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { ORG_SETUP_COL_PAD_X } from "../lib/constants";

type AnimatedIcon = ComponentType<{
  ref?: Ref<IconHandle>;
  size?: number;
  className?: string;
}>;

type NavButtonsProps = {
  onBack: () => void;
  onNext: () => void;
  skipLabel?: string;
  nextLabel?: string;
  nextIcon?: LucideIcon | AnimatedIcon;
  nextDisabled?: boolean;
  isPending?: boolean;
  loadingText?: string;
};

export function NavButtons({
  onBack,
  onNext,
  skipLabel,
  nextLabel,
  nextIcon: NextIcon,
  nextDisabled,
  isPending = false,
  loadingText,
}: NavButtonsProps) {
  return (
    <div
      className={cn(
        "grid w-full items-stretch gap-2.5",
        skipLabel
          ? "grid-cols-[auto_auto_minmax(0,1fr)]"
          : "grid-cols-[auto_minmax(0,1fr)]",
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-sm",
        ORG_SETUP_COL_PAD_X,
        "pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none",
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isPending}
        className="h-10 shrink-0 px-3.5 text-sm text-muted-foreground hover:text-foreground md:h-10 md:min-h-10"
      >
        <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden />
        Back
      </Button>

      {skipLabel ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onNext}
          disabled={isPending}
          className="h-10 shrink-0 px-3 text-sm text-muted-foreground hover:text-foreground md:h-10 md:min-h-10"
        >
          {skipLabel}
        </Button>
      ) : null}

      <LoadingButton
        type="button"
        onClick={onNext}
        disabled={Boolean(nextDisabled)}
        isPending={isPending}
        loadingText={loadingText}
        className="h-10 min-w-0 gap-1.5 text-sm md:h-10 md:min-h-10"
      >
        {NextIcon ? (
          <NextIcon className="h-3.5 w-3.5 shrink-0" size={14} aria-hidden />
        ) : null}
        <span className="truncate">{nextLabel ?? "Continue"}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </LoadingButton>
    </div>
  );
}
