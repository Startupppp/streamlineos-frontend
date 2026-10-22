"use client";

import { Badge } from "@/components/ui/badge";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ReturnStatus } from "@/hooks/api/inventory/returns";

const RETURN_STATUS_TONE: Readonly<Record<ReturnStatus, StatusTone>> = {
  DRAFT: "info",
  APPROVED: "warning",
  POSTED: "success",
  CANCELLED: "danger",
};

const RETURN_STATUS_LABEL: Readonly<Record<ReturnStatus, string>> = {
  DRAFT: "Draft",
  APPROVED: "Approved",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
};

export interface ReturnStatusBadgeProps {
  status: ReturnStatus;
  className?: string;
}

export function ReturnStatusBadge({ status, className }: ReturnStatusBadgeProps) {
  const tone = statusToneClasses(RETURN_STATUS_TONE[status] ?? "neutral");
  return (
    <Badge
      variant="outline"
      className={cn("h-4 px-1.5 py-0 text-micro", tone.surface, tone.ink, tone.rule, className)}
    >
      {RETURN_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
