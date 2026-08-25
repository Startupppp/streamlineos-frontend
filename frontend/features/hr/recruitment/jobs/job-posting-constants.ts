export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
  { value: "FILLED", label: "Filled" },
];

export const STATUS_STYLES: Record<string, { dot: string; label: string; badge: string }> = {
  OPEN: { dot: "bg-emerald-500", label: "Open", badge: "bg-status-success-surface text-status-success-ink" },
  DRAFT: { dot: "bg-muted-foreground/50", label: "Draft", badge: "bg-muted text-muted-foreground" },
  PAUSED: { dot: "bg-amber-500", label: "Paused", badge: "bg-status-warning-surface text-status-warning-ink" },
  CLOSED: { dot: "bg-rose-400", label: "Closed", badge: "bg-status-danger-surface text-status-danger-ink" },
  FILLED: { dot: "bg-blue-500", label: "Filled", badge: "bg-status-info-surface text-status-info-ink" },
};

export const PLATFORM_ICONS: Record<string, string> = {
  LINKEDIN: "in",
  WHATSAPP: "wa",
  TWITTER: "𝕏",
};
