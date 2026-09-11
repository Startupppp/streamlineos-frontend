import { z } from "zod";

const periodContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  closedByMembershipId: z.number().nullable(),
  closedAt: z.string().nullable(),
  lockedByMembershipId: z.number().nullable(),
  lockedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const periodListContract = z.array(periodContract);

export const generatePeriodsContract = z.object({
  created: z.number(),
  total: z.number(),
});

const checklistItemContract = z.object({
  passed: z.boolean(),
  count: z.number(),
});

export const periodCloseChecklistContract = z.object({
  period: periodContract,
  checklist: z.object({
    noDraftJournals: checklistItemContract,
    noDraftBills: checklistItemContract,
    noUnreconciledTransactions: checklistItemContract,
    noPendingApprovals: checklistItemContract,
  }),
  canClose: z.boolean(),
});

export const periodMutationContract = periodContract;

export const reopenPeriodContract = z.object({
  id: z.number(),
  status: z.string(),
});

const openingBalanceLineContract = z.object({
  id: z.number(),
  accountId: z.number(),
  accountCode: z.string(),
  accountName: z.string(),
  debit: z.string().nullable(),
  credit: z.string().nullable(),
});

const openingBalanceEntryContract = z.object({
  id: z.number(),
  entryNumber: z.string(),
  entryDate: z.string(),
  status: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  lines: z.array(openingBalanceLineContract),
});

export const openingBalanceContract = z.discriminatedUnion("posted", [
  z.object({ posted: z.literal(false), entry: z.null() }),
  z.object({ posted: z.literal(true), entry: openingBalanceEntryContract }),
]);

export const postOpeningBalancesContract = z.object({ reimported: z.boolean() });

export type PeriodList = z.infer<typeof periodListContract>;
export type PeriodCloseChecklist = z.infer<typeof periodCloseChecklistContract>;
export type OpeningBalance = z.infer<typeof openingBalanceContract>;
