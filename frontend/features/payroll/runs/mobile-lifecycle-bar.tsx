"use client";

import { cn } from "@/lib/utils";
import { RunActionsSlot } from "./run-actions-slot";
import type { PayrollRun } from "@/types/payroll/runs";

interface MobileLifecycleBarProps {
  run: PayrollRun;
  className?: string;
}

/**
 * Sticky bottom action bar for high-risk lifecycle controls on phones (375–390px).
 * Desktop continues to use the page header actions; this is sm-and-below only.
 */
export function MobileLifecycleBar({ run, className }: MobileLifecycleBarProps) {
  return (
    <div
      className={cn(
        "sm:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        "flex items-center justify-end gap-2 min-h-14",
        className,
      )}
      role="toolbar"
      aria-label="Payroll lifecycle actions"
    >
      <RunActionsSlot run={run} />
    </div>
  );
}
