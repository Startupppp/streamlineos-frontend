import { accountingAndSupportQueryKeys } from "@/lib/query-keys/accounting-and-support";

const accountingBase = [...accountingAndSupportQueryKeys.accounting.all] as const;

export const bankingKeys = {
  all: [...accountingBase, "banking"] as const,
  accounts: (params?: object) =>
    [...accountingBase, "banking", "accounts", params] as const,
  account: (id: number) =>
    [...accountingBase, "banking", "accounts", id] as const,
  transactions: (id: number, params?: object) =>
    [...accountingBase, "banking", "transactions", id, params] as const,
  imports: (params?: object) =>
    [...accountingBase, "banking", "imports", params] as const,
  reconciliation: (id: number) =>
    [...accountingBase, "banking", "reconciliation", id] as const,
  rules: (id: number) =>
    [...accountingBase, "banking", "rules", id] as const,
  transfers: (params?: object) =>
    [...accountingBase, "banking", "transfers", params] as const,
};
