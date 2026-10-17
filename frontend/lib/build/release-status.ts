import type { Release } from "@/types/projects";

interface ReleaseStatusPresentation {
  label: string;
  className: string;
}

export const RELEASE_STATUS_PRESENTATION: Record<Release["status"], ReleaseStatusPresentation> = {
  draft: {
    label: "Draft",
    className: "border-status-warning-rule bg-status-warning-surface text-status-warning-ink-strong",
  },
  released: {
    label: "Released",
    className: "border-status-success-rule bg-status-success-surface text-status-success-ink-strong",
  },
  archived: {
    label: "Archived",
    className: "border-border bg-muted text-muted-foreground",
  },
};
