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
