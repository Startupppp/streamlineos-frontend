import { z } from "zod";

// lines is jsonb, but the only writer uses z.number() for debit/credit, so money here is a JSON number, not a decimal string.
const recurringJournalLineContract = z.object({
  accountId: z.number(),
  debit: z.number(),
  credit: z.number(),
  description: z.string().optional(),
});

const recurringJournalTemplateContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  frequency: z.string(),
  nextRunDate: z.string().nullable(),
  lastRunDate: z.string().nullable(),
  endDate: z.string().nullable(),
  isActive: z.boolean(),
  lines: z.array(recurringJournalLineContract),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const recurringJournalListContract = z.object({
  data: z.array(recurringJournalTemplateContract),
  pagination: z.object({
    limit: z.number(),
    hasMore: z.boolean(),
    nextCursor: z.string().nullable(),
  }),
});

export const recurringJournalTemplateResponseContract = recurringJournalTemplateContract;

export const recurringJournalDeleteContract = z.object({
  id: z.number(),
  deleted: z.boolean(),
});

export const recurringJournalRunNowContract = z.object({
  id: z.number(),
  entryNumber: z.string(),
});

export type RecurringJournalList = z.infer<typeof recurringJournalListContract>;
export type RecurringJournalTemplate = z.infer<typeof recurringJournalTemplateContract>;
