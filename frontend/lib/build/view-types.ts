export type ViewType = "board" | "list" | "table" | "calendar" | "gantt" | "workload";

export const VIEW_TYPES: readonly ViewType[] = [
  "board",
  "list",
  "table",
  "calendar",
  "gantt",
  "workload",
];

export function parseViewType(value: string | null): ViewType {
  if (!value) return "board";
  return VIEW_TYPES.find((v) => v === value) ?? "board";
}
