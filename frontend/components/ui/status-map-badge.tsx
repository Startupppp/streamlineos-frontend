"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";

export interface StatusEntry {
  label: string;
  tone: BadgeTone;
  className?: string;
}

interface StatusMapBadgeProps {
  status: string;
  map: Record<string, StatusEntry>;
  className?: string;
}

export const StatusMapBadge = memo(function StatusMapBadge({
  status,
  map,
  className,
}: StatusMapBadgeProps) {
  const entry = map[status] ?? { label: status.replace(/_/g, " "), tone: "neutral" as BadgeTone };
  return (
    <SemanticBadge
      tone={entry.tone}
      label={entry.label}
      size="xs"
      className={cn("rounded-full", entry.className, className)}
    />
  );
});
