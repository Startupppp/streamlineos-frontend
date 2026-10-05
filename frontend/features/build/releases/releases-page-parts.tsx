"use client";

import type { Release } from "@/types/projects";

export const STATUS_CONFIG: Record<
  Release["status"],
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className:
      "text-status-warning-ink-strong border-status-warning-rule bg-status-warning-surface",
  },
  released: {
    label: "Released",
    className:
      "text-status-success-ink-strong border-status-success-rule bg-status-success-surface",
  },
  archived: {
    label: "Archived",
    className: "text-muted-foreground border-border bg-muted",
  },
};
