import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

const budgetListItemContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  fiscalYear: z.string(),
  periodType: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
  dimensionType: z.enum(["NONE", "DEPARTMENT", "PROJECT"]).nullable(),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "ARCHIVED"]),
  totalAmount: z.string(),
  createdByMembershipId: z.number().nullable(),
  approvedByMembershipId: z.number().nullable(),
  approvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const budgetListContract = cursorPageContract(budgetListItemContract);

const budgetLineContract = z.object({
  accountId: z.number(),
  accountCode: z.string(),
  accountName: z.string(),
  periodKey: z.string(),
  amount: z.string(),
  departmentId: z.string().nullable(),
  projectId: z.number().nullable(),
});

export const budgetDetailContract = budgetListItemContract.extend({
  lines: z.array(budgetLineContract),
});

export const budgetWorkflowContract = budgetListItemContract;

export const budgetRevisionListContract = z.array(
  z.object({
    id: z.number(),
    revisionNumber: z.number(),
    note: z.string().nullable(),
    createdBy: z.string(),
    createdAt: z.string(),
    lineCount: z.number(),
  }),
);

export const budgetSeedDefaultsContract = z.object({ created: z.number() });

const bvaAccountPeriodRowContract = z.object({
  accountId: z.number(),
  accountCode: z.string(),
  accountName: z.string(),
  periodKey: z.string(),
  budgeted: z.string(),
  actual: z.string(),
  variance: z.string(),
  variancePct: z.string(),
  exceeded: z.boolean(),
});

export const bvaContract = z.object({
  budgetId: z.number(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  rows: z.array(bvaAccountPeriodRowContract),
  totals: z.object({
    budgeted: z.string(),
    actual: z.string(),
    variance: z.string(),
    variancePct: z.string(),
  }),
});

const forecastWeekContract = z.object({
  weekIndex: z.number(),
  weekStart: z.string(),
  weekEnd: z.string(),
  openingCash: z.string(),
  inflows: z.string(),
  outflows: z.string(),
  net: z.string(),
  closingCash: z.string(),
  minimumBalanceWarning: z.boolean(),
});

export const forecastContract = z.object({
  scenarioId: z.number().nullable(),
  generatedAt: z.string(),
  weeks: z.array(forecastWeekContract),
  totalInflows: z.string(),
  totalOutflows: z.string(),
});

const compareRowContract = z.object({
  weekIndex: z.number(),
  weekStart: z.string(),
  closingCash: z.record(z.string(), z.string()),
});

export const scenarioCompareContract = z.object({
  scenarioIds: z.array(z.number()),
  scenarios: z.array(z.object({ id: z.number(), name: z.string(), kind: z.string() })),
  weeks: z.array(compareRowContract),
});

const plannedSpendItemContract = z.object({
  label: z.string(),
  amount: z.number(),
  startWeek: z.number(),
  recurringWeekly: z.boolean(),
});

const scenarioAssumptionsShapeContract = z.object({
  collectionRatePct: z.number(),
  payDelayDays: z.number(),
  revenueGrowthPct: z.number(),
  plannedSpend: z.array(plannedSpendItemContract),
});

const DEFAULT_SCENARIO_ASSUMPTIONS = {
  collectionRatePct: 90,
  payDelayDays: 0,
  revenueGrowthPct: 0,
  plannedSpend: [] as { label: string; amount: number; startWeek: number; recurringWeekly: boolean }[],
};

// Wire type is `unknown | null`; parse against the create schema's shape and fall back to its defaults.
const scenarioAssumptionsContract = z.unknown().nullable().transform((value) => {
  const parsed = scenarioAssumptionsShapeContract.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_SCENARIO_ASSUMPTIONS;
});

export const scenarioContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  kind: z.enum(["CONSERVATIVE", "EXPECTED", "AGGRESSIVE", "CUSTOM"]),
  assumptions: scenarioAssumptionsContract,
  isDefault: z.boolean(),
  createdByMembershipId: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const scenarioListContract = z.array(scenarioContract);

export const scenarioCreatedContract = scenarioContract;

export const scenarioUpdatedContract = scenarioContract;

export const scenarioDeleteContract = z.object({ success: z.literal(true) });

export const scenarioSeedDefaultsContract = z.array(scenarioContract);

export const replaceLinesSuccessContract = z.object({ success: z.literal(true) });

export type BudgetList = z.infer<typeof budgetListContract>;
export type BudgetDetail = z.infer<typeof budgetDetailContract>;
export type ForecastResult = z.infer<typeof forecastContract>;
export type ScenarioList = z.infer<typeof scenarioListContract>;
