"use client";

import { Loader2 } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AiFieldTriggerProps {
  label: string;
  disabledReason?: string;
  disabled?: boolean;
  isPending?: boolean;
  onClick: () => void;
  className?: string;
}

export function AiFieldTrigger({
  label,
  disabledReason,
  disabled = false,
  isPending = false,
  onClick,
  className,
}: AiFieldTriggerProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const isDisabled = disabled || Boolean(disabledReason) || isPending;
  const tooltipText = disabledReason ?? label;

  function handleClick() {
    if (isDisabled) return;
    onClick();
  }

  const button = (
    <button
      type="button"
      aria-label={label}
      title={isDisabled ? tooltipText : label}
      disabled={isDisabled}
      onClick={handleClick}
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-primary disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...(isDisabled ? {} : hoverHandlers)}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin text-primary" />
      ) : (
        <SparklesIcon ref={iconRef} size={14} className="text-primary" />
      )}
    </button>
  );

  if (!disabledReason) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex shrink-0">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[14rem] text-xs">
        {disabledReason}
      </TooltipContent>
    </Tooltip>
  );
}
