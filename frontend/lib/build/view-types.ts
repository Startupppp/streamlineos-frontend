export type ViewType = "board" | "list" | "table" | "calendar" | "gantt" | "workload";

export const VIEW_TYPES: readonly ViewType[] = [
  "board",
  "list",
  "table",
  "calendar",
  "gantt",
  "workload",
];

export const ALL_VIEW_VALUES: readonly ViewType[] = [
  "board",
  "list",
  "table",
  "calendar",
  "gantt",
  "workload",
];

export function isViewType(value: string): value is ViewType {
  return VIEW_TYPES.some((t) => t === value);
}

export function parseViewType(value: string | null): ViewType {
  if (!value) return "board";
  return VIEW_TYPES.find((v) => v === value) ?? "board";
}
