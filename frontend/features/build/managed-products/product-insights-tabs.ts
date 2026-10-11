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

export function insightViewFromParam(value: string | null | undefined): InsightViewId {
  return INSIGHT_VIEWS.find((v) => v.id === value)?.id ?? "overview";
}

export function insightTabFromParam(value: string | null | undefined): InsightTabId {
  return INSIGHT_TABS.find((t) => t.id === value)?.id ?? "overview";
}
