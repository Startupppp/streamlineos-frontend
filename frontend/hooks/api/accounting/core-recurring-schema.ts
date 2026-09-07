import { z } from "zod";

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
  lines: z.array(z.record(z.string(), z.unknown())),
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
