import type { ProjectView, ViewLayoutType } from "@/types/projects";
import {
  BUILD_LIST_CURSOR_PARAM,
  BUILD_LIST_SHAPE_PARAMS,
} from "@/features/build/shared/use-build-list-url-state";
import type { AllWorkView } from "./all-work-view-switcher";

const VIEW_PARAM_KEYS = [
  ...BUILD_LIST_SHAPE_PARAMS,
  "cycle",
  "scope",
  "productId",
  "teamId",
] as const satisfies readonly string[];

export const VIEW_TO_LAYOUT: Record<AllWorkView, ViewLayoutType> = {
  list: "list",
  table: "table",
  board: "board",
  calendar: "calendar",
  timeline: "gantt",
};

const LAYOUT_TO_VIEW: Record<ViewLayoutType, AllWorkView> = {
  list: "list",
  table: "table",
  board: "board",
  calendar: "calendar",
  gantt: "timeline",
};

export function buildCurrentFilters(
  searchParams: Pick<URLSearchParams, "get">,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of VIEW_PARAM_KEYS) {
    const val = searchParams.get(key);
    if (val) result[key] = val;
  }
  return result;
}

export function viewToSearchParams(
  view: Pick<ProjectView, "filters" | "layoutType">,
  current: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const key of VIEW_PARAM_KEYS) next.delete(key);
  next.delete("page");
  next.delete(BUILD_LIST_CURSOR_PARAM);

  if (view.filters && typeof view.filters === "object") {
    for (const [k, val] of Object.entries(view.filters)) {
      if (typeof val === "string" && val) next.set(k, val);
    }
  }

  const layoutView = LAYOUT_TO_VIEW[view.layoutType];
  if (layoutView) next.set("view", layoutView);
  return next;
}
