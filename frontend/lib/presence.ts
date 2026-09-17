export const PRESENCE_STATUSES = [
  "ONLINE",
  "AWAY",
  "OFFLINE",
  "BUSY",
  "DO_NOT_DISTURB",
  "IN_A_MEETING",
  "ON_LEAVE",
  "VACATION",
  "WORKING_REMOTELY",
] as const;

export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

export const AUTO_PRESENCE_STATUSES: readonly PresenceStatus[] = [
  "ONLINE",
  "AWAY",
  "OFFLINE",
];

export const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  ONLINE: "Available",
  AWAY: "Away",
  OFFLINE: "Offline",
  BUSY: "Busy",
  DO_NOT_DISTURB: "Do not disturb",
  IN_A_MEETING: "In a meeting",
  ON_LEAVE: "On leave",
  VACATION: "Vacation",
  WORKING_REMOTELY: "Working remotely",
};

export const PRESENCE_DOT_CLASS: Record<PresenceStatus, string> = {
  ONLINE: "bg-status-success-fill",
  AWAY: "bg-status-warning-fill",
  OFFLINE: "bg-muted-foreground/40",
  BUSY: "bg-status-danger-fill",
  DO_NOT_DISTURB: "bg-status-danger-fill",
  IN_A_MEETING: "bg-status-danger-fill",
  ON_LEAVE: "bg-status-info-fill",
  VACATION: "bg-status-info-fill",
  WORKING_REMOTELY: "bg-status-info-fill",
};

export function isPresenceStatus(value: unknown): value is PresenceStatus {
  return (
    typeof value === "string" &&
    (PRESENCE_STATUSES as readonly string[]).includes(value)
  );
}

export function presenceLabel(value: unknown): string {
  return isPresenceStatus(value) ? PRESENCE_LABELS[value] : PRESENCE_LABELS.OFFLINE;
}

export function presenceDotClass(value: unknown): string {
  return isPresenceStatus(value)
    ? PRESENCE_DOT_CLASS[value]
    : PRESENCE_DOT_CLASS.OFFLINE;
}
