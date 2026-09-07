export type BudgetType = "HOURS" | "AMOUNT";

export interface BudgetBurn {
  budget: number;
  consumed: number;
  percentUsed: number;
  remaining: number;
  alertLevel: number;
  over: boolean;
}

export interface TimesheetBudget {
  id: number;
  orgId: string;
  projectId: number | null;
  projectName: string | null;
  clientId: number | null;
  budgetType: BudgetType;
  budgetHours: string | null;
  budgetAmount: string | null;
  currency: string;
  alertThresholds: number[];
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  burn: BudgetBurn;
}

export interface CreateBudgetInput {
  projectId?: number;
  clientId?: number;
  budgetType?: BudgetType;
  budgetHours?: number;
  budgetAmount?: number;
  currency?: string;
  alertThresholds?: number[];
  startsAt?: string;
  endsAt?: string;
  status?: "ACTIVE" | "ARCHIVED";
}
