export const KB_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  archived: "Archived",
};

export const KB_STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  in_review:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  published:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  archived: "bg-muted text-muted-foreground border-border opacity-60",
};
