export type BudgetStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ARCHIVED";

export type BudgetPeriodType = "MONTHLY" | "QUARTERLY" | "YEARLY";

export type BudgetDimensionType = "NONE" | "DEPARTMENT" | "PROJECT";

export interface BudgetSummary {
  id: number;
  name: string;
  fiscalYear: string;
  periodType: BudgetPeriodType;
  dimensionType: BudgetDimensionType | null;
  status: BudgetStatus;
  totalAmount: string;
  createdBy: string;
  createdAt: string;
}

export interface BudgetLineRow {
  accountId: number;
  accountCode: string;
  accountName: string;
  periodKey: string;
  amount: string;
  departmentId: number | null;
  projectId: number | null;
}

export interface BudgetDetail {
  id: number;
  orgId: string;
  name: string;
  fiscalYear: string;
  periodType: string;
  dimensionType: string | null;
  status: string;
  totalAmount: string;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lines: BudgetLineRow[];
}

export interface BudgetRevision {
  id: number;
  revisionNumber: number;
  note: string | null;
  createdBy: string;
  createdAt: Date;
  lineCount: number;
}

export interface BudgetLineInput {
  accountId: number;
  periodKey: string;
  amount: number;
  departmentId?: number;
  projectId?: number;
}

export interface ReplaceBudgetLinesInput {
  lines: BudgetLineInput[];
  note?: string;
}

export interface CreateBudgetInput {
  name: string;
  fiscalYear: string;
  periodType: BudgetPeriodType;
  dimensionType: BudgetDimensionType;
}

export interface UpdateBudgetInput {
  name?: string;
  dimensionType?: BudgetDimensionType;
}

export interface DuplicateBudgetInput {
  newFiscalYear: string;
  newName: string;
  upliftPct: number;
}

export interface BudgetWorkflowInput {
  note?: string;
}

export interface BvaAccountPeriodRow {
  accountId: number;
  accountCode: string;
  accountName: string;
  periodKey: string;
  budgeted: string;
  actual: string;
  variance: string;
  variancePct: string;
  exceeded: boolean;
}

export interface BvaResponse {
  budgetId: number;
  from: string | null;
  to: string | null;
  rows: BvaAccountPeriodRow[];
  totals: {
    budgeted: string;
    actual: string;
    variance: string;
    variancePct: string;
  };
}

export interface ForecastWeek {
  weekIndex: number;
  weekStart: string;
  weekEnd: string;
  openingCash: string;
  inflows: string;
  outflows: string;
  net: string;
  closingCash: string;
  minimumBalanceWarning: boolean;
}

export interface ForecastResponse {
  scenarioId: number | null;
  generatedAt: string;
  weeks: ForecastWeek[];
  totalInflows: string;
  totalOutflows: string;
}

export type ScenarioKind =
  | "CONSERVATIVE"
  | "EXPECTED"
  | "AGGRESSIVE"
  | "CUSTOM";

export interface PlannedSpendItem {
  label: string;
  amount: number;
  startWeek: number;
  recurringWeekly: boolean;
}

export interface ScenarioAssumptions {
  collectionRatePct: number;
  payDelayDays: number;
  revenueGrowthPct: number;
  plannedSpend: PlannedSpendItem[];
}

export interface Scenario {
  id: number;
  name: string;
  kind: ScenarioKind;
  isDefault: boolean;
  assumptions: ScenarioAssumptions;
  createdAt: string;
}

export interface CreateScenarioInput {
  name: string;
  kind: ScenarioKind;
  assumptions: ScenarioAssumptions;
}

export interface UpdateScenarioInput {
  name?: string;
  kind?: ScenarioKind;
  assumptions?: Partial<ScenarioAssumptions>;
}

export interface ScenarioCompareResponse {
  scenarioIds: number[];
  scenarios: Array<{ id: number; name: string; kind: string }>;
  weeks: Array<{ weekIndex: number; weekStart: string; closingCash: Record<number, string> }>;
}
