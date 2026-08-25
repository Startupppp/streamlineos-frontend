const ROUND_TYPE_COLORS: Record<string, string> = {
  HR_SCREENING: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  TECHNICAL: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  MANAGER: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  CULTURAL_FIT: "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  FINAL: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  CUSTOM: "bg-muted text-muted-foreground",
};

const ROUND_TYPE_LABELS: Record<string, string> = {
  HR_SCREENING: "HR Screening",
  TECHNICAL: "Technical",
  MANAGER: "Manager",
  CULTURAL_FIT: "Cultural Fit",
  FINAL: "Final",
  CUSTOM: "Custom",
};

const MODE_LABELS: Record<string, string> = {
  VIDEO: "Video",
  PHONE: "Phone",
  ONSITE: "On-site",
};

export function RoundTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-micro font-medium ${ROUND_TYPE_COLORS[type] ?? "bg-muted text-muted-foreground"}`}
    >
      {ROUND_TYPE_LABELS[type] ?? type}
    </span>
  );
}

export function ModeBadge({ mode }: { mode: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-micro font-medium text-muted-foreground">
      {MODE_LABELS[mode] ?? mode}
    </span>
  );
}
