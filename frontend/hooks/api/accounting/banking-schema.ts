import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Bank and cash accounts. `openingBalance` and `currentBalance` are
 * `decimal(18,4)` selected with no projection at all, so they arrive as
 * four-decimal STRINGS (`"0.0000"`), never numbers.
 *
 * `openingBalanceDate` is NOT declared here on purpose: it is not a column on
 * `fin_bank_accounts` and no read route has ever sent it.
 */

export const bankAccountTypeContract = z.enum([
  "BANK",
  "CASH",
  "CARD",
  "WALLET",
]);

export const bankAccountContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  accountType: bankAccountTypeContract,
  accountNumberMasked: z.string().nullable(),
  bankName: z.string().nullable(),
  ifsc: z.string().nullable(),
  currency: z.string(),
  ledgerAccountId: z.number().nullable(),
  openingBalance: z.string(),
  currentBalance: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const bankAccountsPageContract = cursorPageContract(bankAccountContract);

export type BankAccountType = z.infer<typeof bankAccountTypeContract>;

export type BankAccountsPage = z.infer<typeof bankAccountsPageContract>;
export type BankAccountRecord = z.infer<typeof bankAccountContract>;
