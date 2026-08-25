// Round type is a taxonomy: a final round is not an error and a cultural-fit
// round is not a success. TECHNICAL takes indigo — the hue it also wears in the
// interview list — rather than the blue it shared with HR_SCREENING.
const ROUND_TYPE_COLORS: Record<string, string> = {
  HR_SCREENING: "bg-category-blue-surface text-category-blue-ink",
  TECHNICAL: "bg-category-indigo-surface text-category-indigo-ink",
  MANAGER: "bg-category-amber-surface text-category-amber-ink",
  CULTURAL_FIT: "bg-category-green-surface text-category-green-ink",
  FINAL: "bg-category-red-surface text-category-red-ink",
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
