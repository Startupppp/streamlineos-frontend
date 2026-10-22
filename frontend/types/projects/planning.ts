export interface MilestoneOwner {
  membershipId: number;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
}

export interface ProjectMilestone {
  id: number;
  projectId: number | null;
  orgId: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  status: string | null;
  createdBy: string | null;
  ownerMembershipId: number | null;
  owner: MilestoneOwner | null;
  linkedTicketCount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectBudgetUpdate {
  id: number;
  budget: number;
  currency: string | null;
}

export interface ProjectBudget {
  projectId: number;
  plannedBudget: number;
  actualCost: number;
  remaining: number;
  utilizationPct: number;
  currency: string | null;
  totalHours: number;
  unratedHours: number;
  currencyMismatch: boolean;
  excludedCurrencyHours: number;
  memberBreakdown: {
    userId: string;
    hours: number;
    cost: number;
    unratedHours: number;
  }[];
}
