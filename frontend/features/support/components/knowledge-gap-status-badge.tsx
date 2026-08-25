import { cn } from "@/lib/utils";
import type { KnowledgeGapStatus } from "@/features/support/lib/knowledge-gap.types";

const STATUS_CONFIG: Record<
  KnowledgeGapStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className:
      "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  },
  DRAFTED: {
    label: "Drafted",
    className:
      "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
  ROUTED: {
    label: "Routed",
    className:
      "bg-status-info-surface text-status-info-ink border-status-info-rule",
  },
  PUBLISHED: {
    label: "Published",
    className:
      "bg-status-success-surface text-status-success-ink border-status-success-rule",
  },
  DISMISSED: {
    label: "Dismissed",
    className:
      "bg-muted text-muted-foreground border-border",
  },
};

interface KnowledgeGapStatusBadgeProps {
  status: KnowledgeGapStatus;
  className?: string;
}

export function KnowledgeGapStatusBadge({
  status,
  className,
}: KnowledgeGapStatusBadgeProps) {
  const { label, className: colorClass } = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        colorClass,
        className,
      )}
    >
      {label}
    </span>
  );
}
