const ROUND_TYPE_COLORS: Record<string, string> = {
  HR_SCREENING: "bg-status-info-surface text-status-info-ink",
  TECHNICAL: "bg-status-info-surface text-status-info-ink",
  MANAGER: "bg-status-warning-surface text-status-warning-ink",
  CULTURAL_FIT: "bg-status-success-surface text-status-success-ink",
  FINAL: "bg-status-danger-surface text-status-danger-ink",
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
