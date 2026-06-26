import "server-only";
import { paymentMethodToAccountCode } from "./posting-rules";
import { persistJournalEntry, type DbOrTx, type DraftLine, type PersistedEntry } from "./persist-entry";

const ACCOUNTS_PAYABLE = "2000";

export type PostVendorPaymentInput = {
  orgId: string;
  paymentId: number;
  billNumber: string;
  paymentDate: string;
  paymentMethod: string;
  amount: number;
  createdBy: string;
};

export async function postVendorPayment(input: PostVendorPaymentInput, tx?: DbOrTx): Promise<PersistedEntry> {
  const cashCode = paymentMethodToAccountCode(input.paymentMethod);
  const lines: DraftLine[] = [
    {
      accountCode: ACCOUNTS_PAYABLE,
      debit: input.amount,
      credit: 0,
      description: `Payment to vendor for ${input.billNumber}`,
    },
    {
      accountCode: cashCode,
      debit: 0,
      credit: input.amount,
      description: `Payment to vendor for ${input.billNumber} (${input.paymentMethod})`,
    },
  ];

  return persistJournalEntry(
    {
      orgId: input.orgId,
      entryDate: input.paymentDate,
      description: `Payment to vendor for ${input.billNumber}`,
      sourceType: "vendor_payment",
      sourceId: String(input.paymentId),
      sourceEvent: "payment",
      createdBy: input.createdBy,
      lines,
    },
    tx,
  );
}
