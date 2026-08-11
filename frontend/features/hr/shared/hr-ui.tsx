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
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    border: "border-emerald-200/80 dark:border-emerald-800/50",
  },
  inactive: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/40",
    border: "border-border",
  },
  pending: {
    bg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    border: "border-amber-200/80 dark:border-amber-800/50",
  },
  approved: {
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    border: "border-emerald-200/80 dark:border-emerald-800/50",
  },
  rejected: {
    bg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    border: "border-rose-200/80 dark:border-rose-800/50",
  },
  default: {
    bg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
    border: "border-blue-200/80 dark:border-blue-800/50",
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
        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
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
