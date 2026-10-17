export type StateType = "unstarted" | "started" | "completed" | "cancelled";

export const STATE_TYPE_KEYS: readonly StateType[] = [
  "unstarted",
  "started",
  "completed",
  "cancelled",
];

export const TYPE_CONFIG: Record<StateType, { label: string; color: string }> = {
  unstarted: {
    label: "Unstarted",
    color: "bg-muted text-muted-foreground",
  },
  started: {
    label: "Started",
    color: "bg-status-info-surface text-status-info-ink-strong",
  },
  completed: {
    label: "Completed",
    color:
      "bg-status-success-surface text-status-success-ink-strong",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-status-danger-surface text-status-danger-ink-strong",
  },
};

export const MAX_STATUS_NAME = 50;

export function isStateType(value: string | null | undefined): value is StateType {
  return STATE_TYPE_KEYS.some((t) => t === value);
}

export function resolveStateType(type: string | null | undefined): StateType {
  return isStateType(type) ? type : "unstarted";
}

export function validateStatusName(
  name: string,
  currentName: string,
  existingNames: string[],
): string | null {
  if (!name) return "Name is required";
  if (!/[a-zA-Z0-9]/.test(name)) {
    return "Name must contain at least one letter or number";
  }
  if (name.length > MAX_STATUS_NAME) {
    return `Name must be ${MAX_STATUS_NAME} characters or fewer`;
  }
  if (name.toLowerCase() === currentName.toLowerCase()) return null;
  if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    return "A status with this name already exists";
  }
  return null;
}
