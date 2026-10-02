import {
  cycleReadinessHeadline,
  resolveCycleReadiness,
  type ReadinessState,
} from "@/lib/hrms/readiness-state";

export interface CyclePopulation {
  readonly inCycle: number;
  readonly isComplete: boolean;
}

export interface CycleSummaryInput {
  readonly isLoading: boolean;
  readonly isStale: boolean;
  readonly blockers: number;
  readonly blockedPeople: number;
  readonly waived: number;
  readonly population: CyclePopulation;
}

export interface CycleSummary {
  readonly state: ReadinessState;
  readonly headline: string;
  readonly blockers: number;
  readonly blockedPeople: number;
  readonly waived: number;
  readonly ready: number | null;
  readonly inCycle: number | null;
  readonly isAllClear: boolean;
}

const UNMEASURED_POPULATION_HEADLINE =
  "Blockers are measured for this cycle. The number of employees in it is not.";

export function summariseCycle(input: CycleSummaryInput): CycleSummary {
  const resolved = resolveCycleReadiness({
    isLoading: input.isLoading,
    isStale: input.isStale,
    blockers: input.blockers,
    inCycle: input.population.inCycle,
  });
  const state: ReadinessState =
    resolved === "ready" && !input.population.isComplete ? "unmeasured" : resolved;
  const ready = input.population.isComplete
    ? Math.max(0, input.population.inCycle - input.blockedPeople)
    : null;
  const headline =
    state === "unmeasured" && !input.isLoading && !input.population.isComplete
      ? UNMEASURED_POPULATION_HEADLINE
      : cycleReadinessHeadline(state, input.population.inCycle);

  return {
    state,
    headline,
    blockers: input.blockers,
    blockedPeople: input.blockedPeople,
    waived: input.waived,
    ready,
    inCycle: input.population.isComplete ? input.population.inCycle : null,
    isAllClear: state === "ready",
  };
}
