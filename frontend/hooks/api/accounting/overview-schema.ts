import { z } from "zod";

const bankAccountSummaryContract = z.object({
  id: z.number(),
  name: z.string(),
  balance: z.string(),
});

const countAmountContract = z.object({
  count: z.number(),
  amount: z.string(),
});

const drillEntryContract = z.object({
  type: z.string(),
  params: z.record(z.string(), z.string()),
});

const monthlyTrendItemContract = z.object({
  month: z.string(),
  revenue: z.string(),
  expenses: z.string(),
});

export const overviewContract = z.object({
  cashBalance: z.string(),
  bankAccounts: z.array(bankAccountSummaryContract),
  revenueThisMonth: z.string(),
  expensesThisMonth: z.string(),
  netProfit: z.string(),
  arOverdue: countAmountContract,
  apDueNext7: countAmountContract,
  taxPayable: z.string(),
  burnRate: z.string(),
  runwayMonths: z.number().nullable(),
  reconciliationGaps: z.number(),
  openApprovals: z.number(),
  monthlyTrend: z.array(monthlyTrendItemContract),
  drill: z.record(z.string(), drillEntryContract),
  period: z.object({ from: z.string(), to: z.string() }),
});

export type Overview = z.infer<typeof overviewContract>;
