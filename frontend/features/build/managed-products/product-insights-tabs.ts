export const INSIGHT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "delivery", label: "Delivery" },
  { id: "feedback", label: "Feedback" },
  { id: "discovery", label: "Discovery" },
] as const;

export type InsightTabId = (typeof INSIGHT_TABS)[number]["id"];

const INSIGHT_TAB_IDS: ReadonlySet<string> = new Set(INSIGHT_TABS.map((tab) => tab.id));

export function insightTabFromParam(value: string | null | undefined): InsightTabId {
  if (value && INSIGHT_TAB_IDS.has(value)) return value as InsightTabId;
  return "overview";
}
