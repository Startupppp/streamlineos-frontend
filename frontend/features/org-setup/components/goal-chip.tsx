"use client";

import { memo, type ComponentType, type MouseEvent, type Ref } from "react";
import type { IconHandle } from "@animateicons/react";
import { Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EVERYTHING_GOAL_ID } from "../lib/constants";

type AnimatedIcon = ComponentType<{
  ref?: Ref<IconHandle>;
  size?: number;
  className?: string;
}>;

type GoalChipProps = {
  goalId: string;
  label: string;
  outcome: string;
  selected: boolean;
  Icon: AnimatedIcon;
  onToggle: (e: MouseEvent<HTMLButtonElement>) => void;
};

const CHIP_BASE =
  "flex min-h-10 w-full items-center gap-1.5 p-2.5 rounded-lg border text-left text-xs font-medium transition-colors press-scale sm:min-h-10 sm:p-2";
const CHIP_SELECTED =
  "border-brand-core bg-brand-core/10 text-brand-deep dark:bg-brand-core/15 dark:text-brand-bright";
const CHIP_IDLE =
  "border-border/80 bg-background/60 text-foreground hover:border-brand-core/40";
const CHIP_EVERYTHING =
  "goal-everything-chip border-transparent font-semibold text-brand-deep";
const CHIP_EVERYTHING_SELECTED =
  "goal-everything-chip border-transparent font-semibold text-brand-deep dark:text-brand-bright";

function GoalChipInner({
  goalId,
  label,
  outcome,
  selected,
  Icon,
  onToggle,
}: GoalChipProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const isEverything = goalId === EVERYTHING_GOAL_ID;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          data-goal-id={goalId}
          onClick={onToggle}
          {...hoverHandlers}
          className={cn(
            CHIP_BASE,
            isEverything && "border-[2.5px] bg-transparent transition-none",
            isEverything
              ? selected
                ? CHIP_EVERYTHING_SELECTED
                : CHIP_EVERYTHING
              : selected
                ? CHIP_SELECTED
                : CHIP_IDLE,
          )}
        >
          <Icon
            ref={iconRef as Ref<IconHandle>}
            size={14}
            className={cn(
              "relative z-[1] shrink-0",
              isEverything
                ? "text-brand-core dark:text-brand-cyan"
                : selected
                  ? "text-brand-core"
                  : "text-muted-foreground",
            )}
          />
          <span className="relative z-[1] min-w-0 flex-1 truncate">
            {label}
          </span>
          {selected && (
            <Check
              className={cn(
                "relative z-[1] ml-auto h-3 w-3 shrink-0",
                isEverything ? "text-brand-cyan" : "text-brand-core",
              )}
              aria-hidden
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="max-w-56 space-y-0.5 px-2.5 py-1.5"
      >
        <p className="text-xs font-semibold leading-tight">{label}</p>
        <p className="text-xs leading-snug text-muted-foreground">{outcome}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export const GoalChip = memo(GoalChipInner);
