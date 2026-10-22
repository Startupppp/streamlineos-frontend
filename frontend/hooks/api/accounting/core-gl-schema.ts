import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";


export const glRowContract = z.object({
  lineId: z.number(),
  entryId: z.number(),
  entryNumber: z.string(),
  entryDate: z.string(),
  description: z.string().nullable(),
  entryDescription: z.string().nullable(),
  accountId: z.number(),
  accountCode: z.string(),
  accountName: z.string(),
  debit: z.number(),
  credit: z.number(),
  sourceType: z.string(),
  sourceId: z.string().nullable(),
  clientId: z.number().nullable(),
  vendorId: z.number().nullable(),
  projectId: z.number().nullable(),
  departmentId: z.string().nullable(),
  runningBalance: z.number(),
});

export const glResponseContract = z.object({
  openingBalance: z.number(),
  closingBalance: z.number(),
  items: z.array(glRowContract),
  nextCursor: z.string().nullable(),
});

export const glAccountContract = z.object({
  accountId: z.number(),
  code: z.string(),
  name: z.string(),
  accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  periodDebit: z.number(),
  periodCredit: z.number(),
  netActivity: z.number(),
});

export const glAccountsContract = z.array(glAccountContract);

export type GlRow = z.infer<typeof glRowContract>;
export type GlResponse = z.infer<typeof glResponseContract>;
export type GlAccount = z.infer<typeof glAccountContract>;

export const ledgerAccountContract = z.object({
  id: z.number(),
  orgId: z.string(),
  code: z.string(),
  name: z.string(),
  accountType: z.string(),
  parentAccountId: z.number().nullable(),
  isActive: z.boolean(),
  normalBalance: z.string().nullable(),
  isSystem: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
});

export const ledgerAccountListContract = cursorPageContract(ledgerAccountContract);

export type LedgerAccount = z.infer<typeof ledgerAccountContract>;
