export const INSIGHT_VIEWS = [
  { id: "overview", label: "Overview" },
  { id: "discovery", label: "Discovery" },
] as const;

export const INSIGHT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "delivery", label: "Delivery" },
  { id: "feedback", label: "Feedback" },
  { id: "discovery", label: "Discovery" },
] as const;

export type InsightViewId = (typeof INSIGHT_VIEWS)[number]["id"];
export type InsightTabId = (typeof INSIGHT_TABS)[number]["id"];

const INSIGHT_TAB_IDS: ReadonlySet<string> = new Set(INSIGHT_TABS.map((tab) => tab.id));

const INSIGHT_VIEW_IDS: ReadonlySet<string> = new Set(INSIGHT_VIEWS.map((view) => view.id));

export function insightViewFromParam(value: string | null | undefined): InsightViewId {
  if (value && INSIGHT_VIEW_IDS.has(value)) return value as InsightViewId;
  return "overview";
}

export function insightTabFromParam(value: string | null | undefined): InsightTabId {
  if (value && INSIGHT_TAB_IDS.has(value)) return value as InsightTabId;
  return "overview";
}
