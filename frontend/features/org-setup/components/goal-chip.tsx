"use client";

import { memo, type ComponentType, type MouseEvent, type Ref } from "react";
import type { IconHandle } from "@animateicons/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

type AnimatedIcon = ComponentType<{
  ref?: Ref<IconHandle>;
  size?: number;
  className?: string;
}>;

type GoalChipProps = {
  goalId: string;
  label: string;
  selected: boolean;
  Icon: AnimatedIcon;
  onToggle: (e: MouseEvent<HTMLButtonElement>) => void;
};

const CHIP_BASE =
  "flex min-h-10 items-center gap-1.5 p-2 rounded-lg border text-left text-xs font-medium transition-colors press-scale";
const CHIP_SELECTED =
  "border-brand-core bg-brand-core/10 text-brand-deep dark:bg-brand-core/15 dark:text-brand-bright";
const CHIP_IDLE = "border-border/80 bg-background/60 text-foreground hover:border-brand-core/40";

function GoalChipInner({ goalId, label, selected, Icon, onToggle }: GoalChipProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      data-goal-id={goalId}
      onClick={onToggle}
      {...hoverHandlers}
      className={cn(CHIP_BASE, selected ? CHIP_SELECTED : CHIP_IDLE)}
    >
      <Icon
        ref={iconRef as Ref<IconHandle>}
        size={14}
        className={cn("shrink-0", selected ? "text-brand-core" : "text-muted-foreground")}
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected && <Check className="ml-auto h-3 w-3 shrink-0 text-brand-core" aria-hidden />}
    </button>
  );
}

export const GoalChip = memo(GoalChipInner);
