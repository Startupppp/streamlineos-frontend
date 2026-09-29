"use client";

import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Shared trigger classes for Filters / Display controls that are icon-only
 * below `md` and labeled from `md` up (FE-117: aria-label on the button).
 */
export const RESPONSIVE_ICON_LABEL_TRIGGER_CLASS =
  "size-9 shrink-0 gap-1.5 p-0 text-xs font-normal md:h-9 md:w-auto md:px-2.5";

export const RESPONSIVE_ICON_LABEL_TEXT_CLASS = "hidden md:inline";

interface MobileOnlyLabelTooltipProps {
  label: string;
  children: ReactElement;
}

/** Tooltip naming the control on mobile only; desktop keeps the visible label. */
export function MobileOnlyLabelTooltip({
  label,
  children,
}: MobileOnlyLabelTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs md:hidden">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ResponsiveIconLabelTextProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveIconLabelText({
  children,
  className,
}: ResponsiveIconLabelTextProps) {
  return (
    <span className={cn(RESPONSIVE_ICON_LABEL_TEXT_CLASS, className)}>
      {children}
    </span>
  );
}
