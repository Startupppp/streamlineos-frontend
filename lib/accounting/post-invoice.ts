import "server-only";
import { ACCOUNT_CODES, splitTaxPool } from "./posting-rules";
import { persistJournalEntry, type DraftLine, type PersistedEntry } from "./persist-entry";

export type PostInvoiceInput = {
  orgId: string;
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate: string;
  supplierStateCode: string;
  placeOfSupplyStateCode: string;
  subtotal: number;
  discount: number;
  taxPool: number;
  total: number;
  createdBy: string;
};

export async function postInvoiceSend(input: PostInvoiceInput): Promise<PersistedEntry> {
  const split = splitTaxPool(input.taxPool, {
    supplierStateCode: input.supplierStateCode,
    placeOfSupplyStateCode: input.placeOfSupplyStateCode,
  });

  const lines: DraftLine[] = [
    { accountCode: ACCOUNT_CODES.accountsReceivable, debit: input.total, credit: 0, description: `Invoice ${input.invoiceNumber}` },
    { accountCode: ACCOUNT_CODES.salesRevenue, debit: 0, credit: Math.max(0, input.subtotal - input.discount), description: `Invoice ${input.invoiceNumber}` },
  ];
  if (split.cgst > 0) lines.push({ accountCode: ACCOUNT_CODES.outputCgst, debit: 0, credit: split.cgst, description: `Invoice ${input.invoiceNumber} CGST` });
  if (split.sgst > 0) lines.push({ accountCode: ACCOUNT_CODES.outputSgst, debit: 0, credit: split.sgst, description: `Invoice ${input.invoiceNumber} SGST` });
  if (split.igst > 0) lines.push({ accountCode: ACCOUNT_CODES.outputIgst, debit: 0, credit: split.igst, description: `Invoice ${input.invoiceNumber} IGST` });

  return persistJournalEntry({
    orgId: input.orgId,
    entryDate: input.invoiceDate,
    description: `Invoice ${input.invoiceNumber} sent`,
    sourceType: "invoice",
    sourceId: String(input.invoiceId),
    sourceEvent: "send",
    createdBy: input.createdBy,
    lines,
  });
}
