"use client";

import { memo } from "react";
import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const config = {
  URGENT: {
    label: "Urgent",
    icon: AlertTriangle,
    color: "text-status-danger-ink",
    bg: "bg-status-danger-surface",
  },
  HIGH: {
    label: "High",
    icon: ArrowUp,
    color: "text-category-orange-ink",
    bg: "bg-category-orange-surface",
  },
  MEDIUM: {
    label: "Medium",
    icon: Minus,
    color: "text-status-warning-ink",
    bg: "bg-status-warning-surface",
  },
  LOW: {
    label: "Low",
    icon: ArrowDown,
    color: "text-status-info-ink",
    bg: "bg-status-info-surface",
  },
} as const;

export function getPriorityColor(priority: string | null | undefined): string {
  const key = (priority ?? "MEDIUM").toUpperCase();
  const isKey = (k: string): k is keyof typeof config => k in config;
  return isKey(key) ? config[key].color : "text-muted-foreground";
}

interface PriorityBadgeProps {
  priority: string | null | undefined;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export const PriorityBadge = memo(function PriorityBadge({
  priority,
  showLabel = false,
  size = "sm",
  className,
}: PriorityBadgeProps) {
  const rawKey = (priority ?? "MEDIUM").toUpperCase();
  const isConfigKey = (k: string): k is keyof typeof config => k in config;
  const c = isConfigKey(rawKey) ? config[rawKey] : config.MEDIUM;
  const Icon = c.icon;
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (showLabel) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
          c.bg,
          c.color,
          className
        )}
      >
        <Icon className={iconSize} />
        {c.label}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex", c.color, className)}>
            <Icon className={iconSize} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {c.label} Priority
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
