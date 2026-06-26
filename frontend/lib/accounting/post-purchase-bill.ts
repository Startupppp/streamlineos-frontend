import "server-only";
import { splitTaxPool } from "./posting-rules";
import { persistJournalEntry, type DbOrTx, type DraftLine, type PersistedEntry } from "./persist-entry";

export type PostPurchaseBillInput = {
  orgId: string;
  billId: number;
  billNumber: string;
  billDate: string;
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
  subtotal: number;
  discount: number;
  taxPool: number;
  total: number;
  expenseAccountCode: string;
  createdBy: string;
};

const ACCOUNTS_PAYABLE = "2000";
const INPUT_CGST = "1410";
const INPUT_SGST = "1411";
const INPUT_IGST = "1412";

export async function postPurchaseBill(input: PostPurchaseBillInput, tx?: DbOrTx): Promise<PersistedEntry> {
  const split = splitTaxPool(input.taxPool, {
    supplierStateCode: input.supplierStateCode,
    placeOfSupplyStateCode: input.placeOfSupplyStateCode,
  });

  const expenseAmount = Math.max(0, input.subtotal - input.discount);
  const lines: DraftLine[] = [
    {
      accountCode: input.expenseAccountCode,
      debit: expenseAmount,
      credit: 0,
      description: `Bill ${input.billNumber}`,
    },
    {
      accountCode: ACCOUNTS_PAYABLE,
      debit: 0,
      credit: input.total,
      description: `Bill ${input.billNumber}`,
    },
  ];
  if (split.cgst > 0) {
    lines.push({ accountCode: INPUT_CGST, debit: split.cgst, credit: 0, description: `Bill ${input.billNumber} CGST` });
  }
  if (split.sgst > 0) {
    lines.push({ accountCode: INPUT_SGST, debit: split.sgst, credit: 0, description: `Bill ${input.billNumber} SGST` });
  }
  if (split.igst > 0) {
    lines.push({ accountCode: INPUT_IGST, debit: split.igst, credit: 0, description: `Bill ${input.billNumber} IGST` });
  }

  return persistJournalEntry(
    {
      orgId: input.orgId,
      entryDate: input.billDate,
      description: `Purchase bill ${input.billNumber} posted`,
      sourceType: "purchase_bill",
      sourceId: String(input.billId),
      sourceEvent: "post",
      createdBy: input.createdBy,
      lines,
    },
    tx,
  );
}
