"use client";

import { cn } from "@/lib/utils";

export {
  RichPanel as HrPanel,
  RichHero as HrHero,
  RichQuickAction as HrQuickAction,
  RichSectionHeader as HrSectionHeader,
  RichIconWell as HrIconWell,
  RichPageContent as HrPageContent,
} from "@/components/shared/rich-surface";

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string; border: string }
> = {
  active: {
    bg: "bg-status-success-surface",
    text: "text-status-success-ink",
    dot: "bg-status-success-fill",
    border: "border-status-success-rule",
  },
  inactive: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/40",
    border: "border-border",
  },
  pending: {
    bg: "bg-status-warning-surface",
    text: "text-status-warning-ink",
    dot: "bg-status-warning-fill",
    border: "border-status-warning-rule",
  },
  approved: {
    bg: "bg-status-success-surface",
    text: "text-status-success-ink",
    dot: "bg-status-success-fill",
    border: "border-status-success-rule",
  },
  rejected: {
    bg: "bg-status-danger-surface",
    text: "text-status-danger-ink",
    dot: "bg-status-danger-fill",
    border: "border-status-danger-rule",
  },
  default: {
    bg: "bg-status-info-surface",
    text: "text-status-info-ink",
    dot: "bg-status-info-fill",
    border: "border-status-info-rule",
  },
};

export function HrStatusBadge({
  status,
  label,
  className,
}: {
  status: "active" | "inactive" | "pending" | "approved" | "rejected" | "default" | string;
  label?: string;
  className?: string;
}) {
  const key = status.toLowerCase() as keyof typeof STATUS_STYLES;
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.default;
  const text = label ?? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-dense font-semibold px-2 py-0.5 rounded-full border",
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dot)} />
      {text}
    </span>
  );
}
