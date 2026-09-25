"use client";

import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";
import type { ManagerResolutionKind } from "@/types/hr";

const RESOLUTION_DISPLAY: Record<ManagerResolutionKind, { label: string; tone: BadgeTone; why: string }> = {
  SELECTED: { label: "Selected", tone: "neutral", why: "Chosen on the form" },
  IN_FILE: { label: "From file", tone: "neutral", why: "Named in the file" },
  FALLBACK_CONFIGURED: { label: "Fallback", tone: "info", why: "The organisation's default reporting manager" },
  FALLBACK_UPLOADER: { label: "Fallback", tone: "info", why: "You, as the HR administrator uploading this file" },
};

export function resolutionReason(resolution: ManagerResolutionKind): string {
  return RESOLUTION_DISPLAY[resolution].why;
}

interface ManagerResolutionCellProps {
  primaryManager: { name: string; email: string; resolution: ManagerResolutionKind } | null;
  /** The file row that creates this manager, when they are new in the same upload. */
  dependsOnRow?: number | null;
}

/**
 * Who a row's primary manager resolved to and why (PRD §7.3.6): a fallback always
 * names the person it picked and the rule that picked them — never "automatic".
 */
export function ManagerResolutionCell({ primaryManager, dependsOnRow }: ManagerResolutionCellProps) {
  if (!primaryManager) return <span className="text-xs text-muted-foreground">No manager</span>;
  const display = RESOLUTION_DISPLAY[primaryManager.resolution];
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="truncate text-xs font-medium">{primaryManager.name}</span>
        <SemanticBadge tone={display.tone} label={display.label} size="xs" />
      </span>
      <span className="text-micro text-muted-foreground">
        {display.why}
        {dependsOnRow ? ` · created by row ${dependsOnRow} (${primaryManager.email})` : ""}
      </span>
    </span>
  );
}
