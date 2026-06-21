import "server-only";
import { ACCOUNT_CODES, paymentMethodToAccountCode } from "./posting-rules";
import { persistJournalEntry, type DbOrTx, type DraftLine, type PersistedEntry } from "./persist-entry";

export type PostPaymentInput = {
  orgId: string;
  paymentId: number;
  invoiceNumber: string;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  createdBy: string;
};

export async function postPaymentReceipt(input: PostPaymentInput, tx?: DbOrTx): Promise<PersistedEntry> {
  const cashCode = paymentMethodToAccountCode(input.paymentMethod);
  const lines: DraftLine[] = [
    { accountCode: cashCode, debit: input.amount, credit: 0, description: `Payment for ${input.invoiceNumber} (${input.paymentMethod})` },
    { accountCode: ACCOUNT_CODES.accountsReceivable, debit: 0, credit: input.amount, description: `Payment for ${input.invoiceNumber}` },
  ];

  return persistJournalEntry({
    orgId: input.orgId,
    entryDate: input.paymentDate,
    description: `Payment received for ${input.invoiceNumber}`,
    sourceType: "payment",
    sourceId: String(input.paymentId),
    sourceEvent: "receipt",
    createdBy: input.createdBy,
    lines,
  }, tx);
}
