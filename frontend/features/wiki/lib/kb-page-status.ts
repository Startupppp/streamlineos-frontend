export const KB_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  archived: "Archived",
};

export const KB_STATUS_BADGE_CLASS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  in_review:
    "bg-status-warning-surface text-status-warning-ink-strong border-status-warning-rule",
  published:
    "bg-status-success-surface text-status-success-ink-strong border-status-success-rule",
  archived: "bg-muted text-muted-foreground border-border",
};
