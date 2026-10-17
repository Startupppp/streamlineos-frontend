import type { StatusTone } from "@/lib/design-tokens";

export const READINESS_STATES = [
  "ready",
  "blocked",
  "not-in-cycle",
  "waived",
  "stale",
  "unmeasured",
] as const;

export type ReadinessState = (typeof READINESS_STATES)[number];

interface ReadinessStateMeta {
  readonly label: string;
  readonly tone: StatusTone;
}

const READINESS_STATE_META: Readonly<Record<ReadinessState, ReadinessStateMeta>> = {
  ready: { label: "Ready", tone: "success" },
  blocked: { label: "Blocked", tone: "danger" },
  "not-in-cycle": { label: "Not in cycle", tone: "neutral" },
  waived: { label: "Waived", tone: "info" },
  stale: { label: "Out of date", tone: "warning" },
  unmeasured: { label: "Not measured", tone: "neutral" },
};

export function readinessStateMeta(state: ReadinessState): ReadinessStateMeta {
  return READINESS_STATE_META[state];
}

export interface ReadinessCountsInput {
  readonly isLoading: boolean;
  readonly isStale: boolean;
  readonly blockers: number;
  readonly inCycle: number;
}

export function resolveCycleReadiness(input: ReadinessCountsInput): ReadinessState {
  if (input.isLoading) return "unmeasured";
  if (input.isStale) return "stale";
  if (input.blockers > 0) return "blocked";
  if (input.inCycle === 0) return "not-in-cycle";
  return "ready";
}

export function cycleReadinessHeadline(state: ReadinessState, inCycle: number): string {
  if (state === "ready") return `All ${inCycle} employees in cycle are ready.`;
  if (state === "stale") return "Readiness out of date — refresh failed.";
  if (state === "not-in-cycle") return "No employees are in this cycle yet.";
  if (state === "unmeasured") return "Checking this cycle…";
  return "This cycle is blocked.";
}
