export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "ALL", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "PAUSED", label: "Paused" },
  { value: "CLOSED", label: "Closed" },
  { value: "FILLED", label: "Filled" },
];

export const STATUS_STYLES: Record<string, { dot: string; label: string; badge: string }> = {
  OPEN: { dot: "bg-emerald-500", label: "Open", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  DRAFT: { dot: "bg-muted-foreground/50", label: "Draft", badge: "bg-muted text-muted-foreground" },
  PAUSED: { dot: "bg-amber-500", label: "Paused", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  CLOSED: { dot: "bg-rose-400", label: "Closed", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  FILLED: { dot: "bg-blue-500", label: "Filled", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
};

export const PLATFORM_ICONS: Record<string, string> = {
  LINKEDIN: "in",
  WHATSAPP: "wa",
  TWITTER: "𝕏",
};
