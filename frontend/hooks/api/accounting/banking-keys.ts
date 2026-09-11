import { queryKeys } from "@/lib/query-keys";

// One key factory for all banking hooks: banking.ts and
// banking-reconciliation.ts both build their keys here, so an invalidation in
// one half hits the cache entries the other half created.
const accountingBase = [...queryKeys.accounting.all] as const;

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

export function toQuery<P extends object>(params: P): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}
