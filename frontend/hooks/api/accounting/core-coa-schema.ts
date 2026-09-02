import { z } from "zod";
import type { ResponseContract } from "@/lib/api-envelope";

/**
 * Chart of accounts and the accounting setup checklist. No money crosses these
 * two, which is exactly why they are contracted: the COA tree decides which
 * ledger every posting lands in, and a silently renamed `accountType` would
 * mis-file a journal rather than mis-display a figure.
 *
 * The tree is recursive, so the contract is declared with an explicit type
 * annotation and a lazy child — a `z.infer` on a self-referencing schema cannot
 * be resolved by the compiler on its own. `accountType` is a pg enum
 * (`account_type`), so the contract validates the five members at runtime while
 * the annotation keeps the compile-time field a plain string for the filter and
 * badge lookups that already treat it as one.
 */

export const accountTypeContract = z.enum([
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
]);

export interface AccountTreeNode {
  id: number;
  code: string;
  name: string;
  accountType: string;
  normalBalance: string | null;
  isSystem: boolean;
  isActive: boolean;
  description: string | null;
  parentAccountId: number | null;
  hasActivity: boolean;
  children: AccountTreeNode[];
}

export const accountTreeNodeContract: ResponseContract<AccountTreeNode> =
  z.lazy(() =>
    z.object({
      id: z.number(),
      code: z.string(),
      name: z.string(),
      accountType: accountTypeContract,
      normalBalance: z.string().nullable(),
      isSystem: z.boolean(),
      isActive: z.boolean(),
      description: z.string().nullable(),
      parentAccountId: z.number().nullable(),
      hasActivity: z.boolean(),
      children: z.array(accountTreeNodeContract),
    }),
  );

export const coaTreeContract = z.object({
  items: z.array(accountTreeNodeContract),
});

export const setupStepContract = z.object({
  key: z.string(),
  label: z.string(),
  done: z.boolean(),
});

export const setupStatusContract = z.object({
  steps: z.array(setupStepContract),
});

export type SetupStep = z.infer<typeof setupStepContract>;
export type SetupStatus = z.infer<typeof setupStatusContract>;
