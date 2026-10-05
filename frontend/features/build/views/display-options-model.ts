import type {
  DisplayOptions,
  ColumnByOption,
  GroupByOption,
  SwimlaneBy,
  OrderByOption,
  CompletedIssuesFilter,
} from "../shared/types";
import type { ViewType } from "./view-switcher";

export const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = {
  columnBy: "status",
  rowBy: "none",
  groupBy: "status",
  orderBy: "manual",
  orderCompleteByRecency: false,
  completedIssues: "all",
  showSubIssues: false,
  showEmptyGroups: true,
  showEmptyColumns: true,
  showEmptyRows: false,
  showId: true,
  showStatus: true,
  showAssignee: true,
  showPriority: true,
  showEstimate: true,
  showCycle: true,
  showLabels: true,
  showDescription: false,
  showDueDate: true,
  showProject: false,
  showMilestone: false,
  showLinks: false,
  showTimeInStatus: false,
  showCreated: false,
  showUpdated: false,
  showPRs: false,
};

export const COLUMN_OPTIONS: { value: ColumnByOption; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "label", label: "Label" },
  { value: "cycle", label: "Cycle" },
  { value: "project", label: "Project" },
];

export const GROUP_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: "none", label: "None" },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "label", label: "Label" },
  { value: "cycle", label: "Cycle" },
  { value: "project", label: "Project" },
];

export type PropertyKey = keyof Pick<
  DisplayOptions,
  | "showId"
  | "showStatus"
  | "showAssignee"
  | "showPriority"
  | "showEstimate"
  | "showCycle"
  | "showLabels"
  | "showDescription"
  | "showDueDate"
  | "showProject"
  | "showMilestone"
  | "showLinks"
  | "showTimeInStatus"
  | "showCreated"
  | "showUpdated"
  | "showPRs"
>;

export const PROPERTY_CHIPS: { key: PropertyKey; label: string }[] = [
  { key: "showId", label: "ID" },
  { key: "showStatus", label: "Status" },
  { key: "showAssignee", label: "Assignee" },
  { key: "showPriority", label: "Priority" },
  { key: "showProject", label: "Project" },
  { key: "showDueDate", label: "Due date" },
  { key: "showMilestone", label: "Milestone" },
  { key: "showCycle", label: "Cycle" },
  { key: "showEstimate", label: "Estimate" },
  { key: "showLabels", label: "Labels" },
  { key: "showDescription", label: "Description" },
  { key: "showLinks", label: "Links" },
  { key: "showTimeInStatus", label: "Time in status" },
  { key: "showCreated", label: "Created" },
  { key: "showUpdated", label: "Updated" },
  { key: "showPRs", label: "PRs" },
];

export const BOARD_PROPERTIES: PropertyKey[] = [
  "showId",
  "showPriority",
  "showAssignee",
  "showEstimate",
  "showCycle",
  "showLabels",
  "showDescription",
  "showDueDate",
];

export const LIST_PROPERTIES: PropertyKey[] = [
  "showId",
  "showPriority",
  "showAssignee",
  "showEstimate",
  "showLabels",
  "showDueDate",
];

export const TABLE_PROPERTIES: PropertyKey[] = [
  "showId",
  "showStatus",
  "showPriority",
  "showAssignee",
  "showEstimate",
  "showLabels",
  "showDueDate",
  "showCycle",
];

export const ROW_OPTIONS: { value: SwimlaneBy; label: string }[] = [
  { value: "none", label: "None" },
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "cycle", label: "Cycle" },
];

export const ORDER_OPTIONS: { value: OrderByOption; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "priority", label: "Priority" },
  { value: "dueDate", label: "Due date" },
];

export const COMPLETED_OPTIONS: { value: CompletedIssuesFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "none", label: "None" },
  { value: "last-day", label: "Last day" },
  { value: "last-week", label: "Last week" },
  { value: "last-month", label: "Last month" },
];

export function propertyChipsForView(
  viewType: ViewType,
): { key: PropertyKey; label: string }[] {
  const keys =
    viewType === "board"
      ? BOARD_PROPERTIES
      : viewType === "list"
        ? LIST_PROPERTIES
        : viewType === "table"
          ? TABLE_PROPERTIES
          : [];
  const keySet = new Set<PropertyKey>(keys);
  return PROPERTY_CHIPS.filter((chip) => keySet.has(chip.key));
}
