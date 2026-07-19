"use client";

/**
 * People Hub filter bar — same contract as EmployeesFilters (server-backed).
 * Kept as a thin alias for the hub page so both surfaces stay in sync.
 */
export {
  EmployeesFilters as HrFilterBar,
  type Department,
} from "./employees-filters";
