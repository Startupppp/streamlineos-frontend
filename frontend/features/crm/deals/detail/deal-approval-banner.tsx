"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DealApprovalBannerProps {
  dealId: number;
  className?: string;
}

export function DealApprovalBanner({ className }: DealApprovalBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-lg border bg-status-warning-surface text-status-warning-ink border-status-warning-rule text-sm",
        className,
      )}
    >
      <Clock className="h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Stage change pending approval</p>
        <p className="text-xs text-status-warning-ink mt-0.5">
          A manager must approve this deal before the stage advances.
        </p>
      </div>
    </div>
  );
}
