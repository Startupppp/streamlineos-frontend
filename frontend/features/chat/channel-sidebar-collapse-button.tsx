"use client";

import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isCollapsed ? "Expand channel sidebar" : "Collapse channel sidebar"}
      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      className={cn(
        "hidden md:flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
        className,
      )}
    >
      {isCollapsed ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4" />
      )}
    </button>
  );
}
