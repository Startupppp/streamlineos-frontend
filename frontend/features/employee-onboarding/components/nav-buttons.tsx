"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ComponentType, Ref } from "react";
import type { IconHandle } from "@animateicons/react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";

type AnimatedIcon = ComponentType<{
  ref?: Ref<IconHandle>;
  size?: number;
  className?: string;
}>;

type NavButtonsProps = {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextIcon?: LucideIcon | AnimatedIcon;
  nextDisabled?: boolean;
  isPending?: boolean;
  loadingText?: string;
  nextType?: "button" | "submit";
  clearLabel?: string;
  onClear?: () => void;
};

export function NavButtons({
  onBack,
  onNext,
  nextLabel,
  nextIcon: NextIcon,
  nextDisabled,
  isPending = false,
  loadingText,
  nextType = "button",
  clearLabel,
  onClear,
}: NavButtonsProps) {
  const hasClear = Boolean(clearLabel && onClear);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 items-stretch gap-2.5",
        "fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-sm",
        "px-4 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "md:static md:inset-auto md:border-0 md:bg-transparent md:px-0 md:pt-0 md:pb-0 md:backdrop-blur-none",
      )}
    >
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isPending}
          className="h-10 w-auto shrink-0 px-3.5 text-sm text-muted-foreground hover:text-foreground md:h-10 md:min-h-10"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden />
          Back
        </Button>
      ) : null}

      {hasClear ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onClear}
          disabled={isPending}
          className="h-10 w-auto shrink-0 px-3 text-sm text-muted-foreground hover:text-foreground md:h-10 md:min-h-10"
        >
          {clearLabel}
        </Button>
      ) : null}

      <div className="flex min-w-0 flex-1">
        <LoadingButton
          type={nextType}
          onClick={nextType === "button" ? onNext : undefined}
          disabled={Boolean(nextDisabled)}
          isPending={isPending}
          loadingText={loadingText}
          className="h-10 min-w-0 flex-1 gap-1.5 text-sm md:h-10 md:min-h-10"
        >
          {NextIcon ? (
            <NextIcon className="h-3.5 w-3.5 shrink-0" size={14} aria-hidden />
          ) : null}
          <span className="truncate">{nextLabel ?? "Continue"}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </LoadingButton>
      </div>
    </div>
  );
}
