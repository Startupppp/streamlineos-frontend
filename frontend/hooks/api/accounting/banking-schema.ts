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

export const bankTransactionContract = z.object({
  id: z.number(),
  orgId: z.string(),
  bankAccountId: z.number(),
  importId: z.number().nullable(),
  txnDate: z.string(),
  description: z.string().nullable(),
  reference: z.string().nullable(),
  amount: z.string(),
  balanceAfter: z.string().nullable(),
  counterparty: z.string().nullable(),
  fingerprint: z.string(),
  status: z.enum(["UNMATCHED", "SUGGESTED", "MATCHED", "RECONCILED", "IGNORED"]),
  matchedJournalEntryId: z.number().nullable(),
  createdAt: z.string(),
});

export const bankTransactionListContract = cursorPageContract(bankTransactionContract);

export const bankImportCreateContract = z.object({
  id: z.number(),
  importedCount: z.number(),
  duplicateCount: z.number(),
  totalRows: z.number(),
});

const reconMatchContract = z.object({
  id: z.number(),
  orgId: z.string(),
  bankTransactionId: z.number(),
  journalEntryId: z.number().nullable(),
  matchedType: z.string(),
  matchedRecordId: z.number().nullable(),
  amount: z.string(),
  confidence: z.string().nullable(),
  isConfirmed: z.boolean(),
  confirmedByMembershipId: z.number().nullable(),
  confirmedAt: z.string().nullable(),
  createdAt: z.string(),
});

const bankTxnWithMatchesContract = bankTransactionContract.extend({
  suggestedMatches: z.array(reconMatchContract),
});

export const reconWorkspaceContract = z.object({
  unmatched: z.array(bankTransactionContract),
  suggested: z.array(bankTxnWithMatchesContract),
  reconciledCount: z.number(),
  ledgerBalance: z.string().nullable(),
  bankBalance: z.string(),
});

const ruleConditionShapeContract = z.object({
  field: z.enum(["description", "counterparty", "amount"]),
  op: z.enum(["contains", "equals", "gt", "lt"]),
  value: z.string(),
});

const ruleActionShapeContract = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("categorize"),
    accountPurposeOrId: z.union([z.string(), z.number()]),
    memo: z.string().optional(),
  }),
  z.object({ type: z.literal("transfer") }),
  z.object({ type: z.literal("fee") }),
]);

const DEFAULT_RULE_ACTION = { type: "fee" as const };

/**
 * `conditions`/`action` are jsonb the backend does not strictly type on the
 * way out; these transforms parse against the same shapes its own create
 * schema enforces on the way in, falling back to an empty condition list /
 * the safest no-op action rather than surfacing `unknown` to every renderer.
 */
export const reconRuleContract = z.object({
  id: z.number(),
  orgId: z.string(),
  name: z.string(),
  priority: z.number(),
  conditions: z.unknown().transform((value) => {
    const parsed = z.array(ruleConditionShapeContract).safeParse(value);
    return parsed.success ? parsed.data : [];
  }),
  action: z.unknown().transform((value) => {
    const parsed = ruleActionShapeContract.safeParse(value);
    return parsed.success ? parsed.data : DEFAULT_RULE_ACTION;
  }),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const reconRuleListContract = cursorPageContract(reconRuleContract);

export const bankTransferContract = z.object({
  id: z.number(),
  orgId: z.string(),
  fromBankAccountId: z.number(),
  toBankAccountId: z.number(),
  amount: z.string(),
  transferDate: z.string(),
  reference: z.string().nullable(),
  journalEntryId: z.number().nullable(),
  createdByMembershipId: z.number().nullable(),
  createdAt: z.string(),
});

export const bankTransferListContract = cursorPageContract(bankTransferContract);

export type BankAccountType = z.infer<typeof bankAccountTypeContract>;

export type BankAccountsPage = z.infer<typeof bankAccountsPageContract>;
export type BankAccountRecord = z.infer<typeof bankAccountContract>;
export type BankTransactionList = z.infer<typeof bankTransactionListContract>;
export type ReconWorkspace = z.infer<typeof reconWorkspaceContract>;
