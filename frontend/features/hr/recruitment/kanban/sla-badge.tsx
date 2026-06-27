"use client";

import { memo } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlaCandidateStatus } from "@/types/hr";

interface SlaBadgeProps {
  status: SlaCandidateStatus;
}

const SLA_BADGE_CONFIG: Record<SlaCandidateStatus, { label: string; colorClass: string; title: string }> = {
  ON_TRACK: {
    label: "On Track",
    colorClass: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800",
    title: "SLA: On Track",
  },
  AT_RISK: {
    label: "At Risk",
    colorClass: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800",
    title: "SLA: At Risk",
  },
  BREACHED: {
    label: "Breached",
    colorClass: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800",
    title: "SLA: Breached",
  },
};

export const SlaBadge = memo(function SlaBadge({ status }: SlaBadgeProps) {
  const cfg = SLA_BADGE_CONFIG[status];
  return (
    <span
      title={cfg.title}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
        cfg.colorClass
      )}
    >
      <Clock className="h-2.5 w-2.5 shrink-0" />
      {cfg.label}
    </span>
  );
});
