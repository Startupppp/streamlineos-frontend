export type ViewType =
  | "board"
  | "list"
  | "table"
  | "calendar"
  | "timeline"
  | "workload";

export const VIEW_TYPES: readonly ViewType[] = [
  "board",
  "list",
  "table",
  "calendar",
  "timeline",
  "workload",
];

export const SAVED_VIEW_LAYOUTS = [
  "board",
  "list",
  "table",
  "calendar",
  "gantt",
] as const;

export type SavedViewLayout = (typeof SAVED_VIEW_LAYOUTS)[number];

const VIEW_TYPE_ALIASES: Readonly<Record<string, ViewType>> = {
  gantt: "timeline",
};

export function isViewType(value: string): value is ViewType {
  return VIEW_TYPES.some((t) => t === value);
}

export function isKnownViewParam(value: string): boolean {
  return isViewType(value) || value in VIEW_TYPE_ALIASES;
}

export function parseViewType(value: string | null): ViewType {
  if (!value) return "board";
  const alias = VIEW_TYPE_ALIASES[value];
  if (alias) return alias;
  return VIEW_TYPES.find((v) => v === value) ?? "board";
}

export function toSavedViewLayout(view: ViewType): SavedViewLayout {
  if (view === "timeline") return "gantt";
  if (view === "workload") return "board";
  return view;
}

