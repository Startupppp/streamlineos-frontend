"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface GanttNavIconButtonProps {
  onClick: () => void;
  ariaLabel: string;
  direction: "left" | "right";
}

export function GanttNavIconButton({
  onClick,
  ariaLabel,
  direction,
}: GanttNavIconButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const Icon = direction === "left" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <Button
      variant="outline"
      size="icon"
      className="shrink-0"
      onClick={onClick}
      aria-label={ariaLabel}
      {...hoverHandlers}
    >
      <Icon ref={iconRef} size={14} />
    </Button>
  );
}
