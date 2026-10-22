import { asRecordValue, asRecordValues, type RecordValue } from "@/components/renderer";
import type { ClientAccount } from "@/types/crm";

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
