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
  /**
   * Whether `blockedPeople` counted every blocker or only the page that was read.
   *
   * A truncated blocker list makes it a floor rather than a count, and `ready` is
   * derived by subtracting it, so a floor there becomes an over-statement of how
   * many people are clear to pay.
   */
  readonly blockedPeopleIsComplete: boolean;
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

const UNMEASURED_BLOCKERS_HEADLINE =
  "The employees in this cycle are counted. Whether every blocker has been seen is not.";

export function summariseCycle(input: CycleSummaryInput): CycleSummary {
  const resolved = resolveCycleReadiness({
    isLoading: input.isLoading,
    isStale: input.isStale,
    blockers: input.blockers,
    inCycle: input.population.inCycle,
  });
  const measured = input.population.isComplete && input.blockedPeopleIsComplete;
  const unmeasurable =
    ((resolved === "ready" || resolved === "not-in-cycle") && !input.population.isComplete) ||
    (resolved === "ready" && !input.blockedPeopleIsComplete);
  const state: ReadinessState = unmeasurable ? "unmeasured" : resolved;
  const ready = measured ? Math.max(0, input.population.inCycle - input.blockedPeople) : null;
  const headline =
    state === "unmeasured" && !input.isLoading && !measured
      ? input.population.isComplete
        ? UNMEASURED_BLOCKERS_HEADLINE
        : UNMEASURED_POPULATION_HEADLINE
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
