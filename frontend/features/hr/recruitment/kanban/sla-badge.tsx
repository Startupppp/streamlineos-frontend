"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { SlaCandidateStatus } from "@/types/hr";
import { SLA_CONFIG, SLA_EMOJI } from "./types";

interface SlaBadgeProps {
  status: SlaCandidateStatus;
}

export const SlaBadge = memo(function SlaBadge({ status }: SlaBadgeProps) {
  const cfg = SLA_CONFIG[status];
  return (
    <span
      title={cfg.title}
      className={cn(
        "inline-flex items-center gap-0.5 text-[9px] font-semibold",
        cfg.label
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dot)} />
      {SLA_EMOJI[status]}
    </span>
  );
});
