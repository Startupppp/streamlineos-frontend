import { cn } from "@/lib/utils";
import type { KnowledgeGapStatus } from "@/features/support/lib/knowledge-gap.types";

const STATUS_CONFIG: Record<
  KnowledgeGapStatus,
  { label: string; className: string }
> = {
  OPEN: {
    label: "Open",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  DRAFTED: {
    label: "Drafted",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  ROUTED: {
    label: "Routed",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  },
  PUBLISHED: {
    label: "Published",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  DISMISSED: {
    label: "Dismissed",
    className:
      "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30",
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
