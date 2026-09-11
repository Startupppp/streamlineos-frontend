import { asRecordValue, asRecordValues, type RecordValue } from "@/components/renderer";
import type { ClientAccount } from "@/types/crm";

/**
 * A client account as a row the renderer can read.
 *
 * `salesRep` and `assignedCrm` arrive as nested objects, and a layout can only
 * name a top-level key — so the two people are lifted to `salesRepName` and
 * `assignedCrmName` here, once, rather than at each surface. Naming them is not
 * optional: the flat columns are `salesRepId` and `assignedCrmId`, and a visible
 * id is a bug.
 */
function flatten(account: ClientAccount): Record<string, unknown> {
  return {
    ...account,
    salesRepName: account.salesRep?.name ?? null,
    assignedCrmName: account.assignedCrm?.name ?? null,
  };
}

export function clientRecord(account: ClientAccount): RecordValue {
  return asRecordValue(flatten(account));
}

export function clientRecords(accounts: readonly ClientAccount[]): RecordValue[] {
  return asRecordValues(accounts.map(flatten));
}
