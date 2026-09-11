export interface ProjectMilestone {
  id: number;
  projectId: number;
  orgId: string;
  name: string;
  description: string | null;
  targetDate: string;
  status: "PENDING" | "ACHIEVED" | "MISSED";
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * The row `PATCH /build/:projectId/budget` returns.
 *
 * `budget` is a NUMBER of major units — the server builds it with `minorToMajor`,
 * which divides the stored integer minor amount and returns a number. The hook used
 * to declare it `string`, which typechecked forever because nothing on the success
 * path did arithmetic on it, and would have silently produced `"1000" + delta` string
 * concatenation the moment something did. `currency` was not declared at all, so the
 * one field that says which currency the amount is in was invisible to the client.
 */
export interface ProjectBudgetUpdate {
  id: number;
  /** Major units of `currency`. */
  budget: number;
  currency: string | null;
}

export interface ProjectBudget {
  projectId: number;
  /** Major units of `currency`. */
  plannedBudget: number;
  /** Major units of `currency`. Costed from the rate stamped on each timesheet entry. */
  actualCost: number;
  remaining: number;
  utilizationPct: number;
  /** The project's budget currency, or the currency the entries were costed in. */
  currency: string | null;
  totalHours: number;
  /** Billable hours carrying no stamped rate, so `actualCost` omits their cost. */
  unratedHours: number;
  /** True when rated hours exist in a currency other than `currency`. */
  currencyMismatch: boolean;
  /** Rated hours left out of `actualCost` because their currency differs. */
  excludedCurrencyHours: number;
  memberBreakdown: {
    userId: string;
    hours: number;
    cost: number;
    unratedHours: number;
  }[];
}
