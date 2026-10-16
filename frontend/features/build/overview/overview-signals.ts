import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import type { StatusTone } from "@/lib/design-tokens";

type SummaryProduct = ManagedProductSummary["product"];
type Lifecycle = SummaryProduct["lifecycle"];
type Health = SummaryProduct["health"];

const DAY_MS = 86_400_000;
export const CLOSED_OPPORTUNITY_STATES: ReadonlySet<string> = new Set(["accepted", "declined", "archived"]);

export const LIFECYCLE_STAGES: ReadonlyArray<{ id: Lifecycle; label: string }> = [
  { id: "discovery", label: "Discovery" },
  { id: "build", label: "Build" },
  { id: "growth", label: "Growth" },
  { id: "mature", label: "Mature" },
  { id: "sunset", label: "Sunset" },
];

export const HEALTH_PRESENTATION: Readonly<Record<Health, { label: string; tone: StatusTone }>> = {
  on_track: { label: "On track", tone: "success" },
  at_risk: { label: "At risk", tone: "warning" },
  off_track: { label: "Off track", tone: "danger" },
  unknown: { label: "Not assessed", tone: "neutral" },
};

export function wholeDaysUntil(value: string, now: Date): number | null {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const targetDay = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((targetDay - today) / DAY_MS);
}

export function countdownLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${Math.abs(days)} days ago`;
}

export function percentOf(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

export function openOpportunityCount(byState: Record<string, number>): number {
  return Object.entries(byState).reduce(
    (total, [state, count]) => (CLOSED_OPPORTUNITY_STATES.has(state) ? total : total + count),
    0,
  );
}

export function hasStrategy(product: SummaryProduct): boolean {
  return (
    !!product.missionStatement ||
    !!product.targetCustomer ||
    !!product.northStarMetric ||
    !!product.vision ||
    !!product.differentiators ||
    (product.successMetrics?.length ?? 0) > 0
  );
}

export type ValueStreamStageId =
  | "feedback"
  | "themed"
  | "opportunities"
  | "roadmap"
  | "shipped"
  | "measured";

export interface ValueStreamStage {
  id: ValueStreamStageId;
  label: string;
  value: number;
  hint: string;
  href: string;
}

export function deriveValueStream(
  summary: ManagedProductSummary,
  managedProductId: number,
): ValueStreamStage[] {
  const base = `/build/managed-products/${managedProductId}`;
  const { evidence, delivery, outcomes } = summary;
  const onRoadmap =
    delivery.roadmapByHorizon.now +
    delivery.roadmapByHorizon.next +
    delivery.roadmapByHorizon.later +
    delivery.roadmapCompleted;
  const themedPct = percentOf(evidence.themedCount, evidence.feedbackCount);
  const accepted = evidence.opportunitiesByState["accepted"] ?? 0;
  const { completed, met, notMet } = outcomes.outcomeReviews;
  return [
    {
      id: "feedback",
      label: "Feedback",
      value: evidence.feedbackCount,
      hint: `${evidence.feedbackLast30d} in last 30 days`,
      href: `${base}/feedback`,
    },
    {
      id: "themed",
      label: "Themed",
      value: evidence.themedCount,
      hint: themedPct === null ? "Nothing to theme yet" : `${themedPct}% of feedback`,
      href: `${base}/feedback`,
    },
    {
      id: "opportunities",
      label: "Opportunities",
      value: evidence.opportunityCount,
      hint: `${accepted} accepted`,
      href: `${base}/insights`,
    },
    {
      id: "roadmap",
      label: "On roadmap",
      value: onRoadmap,
      hint: `${delivery.roadmapByHorizon.now} in Now`,
      href: `${base}/roadmap`,
    },
    {
      id: "shipped",
      label: "Shipped",
      value: delivery.roadmapCompleted,
      hint: delivery.roadmapCompleted > 0 ? "Roadmap items completed" : "Nothing completed yet",
      href: `${base}/roadmap`,
    },
    {
      id: "measured",
      label: "Measured",
      value: completed,
      hint: completed > 0 ? `${met} met · ${notMet} missed` : "No outcome reviews yet",
      href: `${base}/insights`,
    },
  ];
}
