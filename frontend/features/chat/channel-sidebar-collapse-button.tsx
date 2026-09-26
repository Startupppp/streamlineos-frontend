"use client";

import { useCallback } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";

interface ChannelSidebarCollapseButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export function ChannelSidebarCollapseButton({
  isCollapsed,
  onToggle,
  className,
}: ChannelSidebarCollapseButtonProps) {
  const handleClick = useCallback(() => onToggle(), [onToggle]);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isCollapsed ? "Expand channel sidebar" : "Collapse channel sidebar"}
      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      {...hoverHandlers}
      className={cn(
        "hidden size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex",
        className,
      )}
    >
      {isCollapsed ? (
        <ChevronRightIcon ref={iconRef} size={16} />
      ) : (
        <ChevronLeftIcon ref={iconRef} size={16} />
      )}
    </button>
  );
}
