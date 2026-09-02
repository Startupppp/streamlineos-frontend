import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

/**
 * Accounts receivable: what customers have paid and what has been credited back.
 *
 * Every amount is a `decimal` selected raw, so **every one is a string** — and
 * the two on a payment do not even share a scale: `amount` is `decimal(12,2)`
 * so it arrives `"1500.00"`, while `allocations[].amount` is `decimal(18,4)`
 * and arrives `"500.0000"`. Comparing them as strings is a bug; both must be
 * parsed before arithmetic.
 *
 * `paymentMethod` is a plain `text` column. The *filter* accepts six values but
 * nothing constrains what is stored, so narrowing the read to that union would
 * reject a row the database happily holds.
 */

export const arPaymentAllocationContract = z.object({
  invoiceId: z.number(),
  amount: z.string(),
});

export const arPaymentContract = z.object({
  id: z.number(),
  orgId: z.string(),
  invoiceId: z.number(),
  invoiceNumber: z.string(),
  clientId: z.number().nullable(),
  clientName: z.string().nullable(),
  amount: z.string(),
  paymentDate: z.string(),
  /**
   * The column is plain `text`, but the only writer is `recordPaymentSchema`,
   * whose `z.enum` is exactly these six. A seventh value on the wire means a
   * writer appeared that this client does not know about — which is a contract
   * violation worth failing on, not a string to render blindly.
   */
  paymentMethod: z.enum([
    "bank_transfer",
    "upi",
    "cheque",
    "cash",
    "card",
    "other",
  ]),
  referenceNumber: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  allocations: z.array(arPaymentAllocationContract),
});

export const arPaymentsPageContract = cursorPageContract(arPaymentContract);

export const creditNoteStatusContract = z.enum([
  "DRAFT",
  "POSTED",
  "APPLIED",
  "VOID",
]);

/**
 * The LIST projection. `cgstAmount` / `sgstAmount` / `igstAmount` and the
 * `items` array exist on the table but are returned only by the detail route,
 * so they are not declared here — a list contract that demanded them would
 * reject every real page.
 */
export const creditNoteContract = z.object({
  id: z.number(),
  creditNoteNumber: z.string(),
  clientId: z.number().nullable(),
  invoiceId: z.number().nullable(),
  status: creditNoteStatusContract,
  reason: z.string().nullable(),
  subtotal: z.string(),
  taxAmount: z.string(),
  total: z.string(),
  appliedAmount: z.string(),
  currency: z.string(),
  placeOfSupply: z.string().nullable(),
  customerGstin: z.string().nullable(),
  supplierGstin: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /**
   * Absent from the list projection and present on the detail row, hence
   * `.nullish()` rather than required. `client` is absent from BOTH — no
   * credit-note route loads that relation — so a screen reading it is reading
   * `undefined`.
   */
  orgId: z.string().nullish(),
  notes: z.string().nullish(),
  client: z.object({ id: z.number(), name: z.string() }).nullish(),
});

export const creditNotesPageContract = cursorPageContract(creditNoteContract);

export type ArPaymentAllocation = z.infer<typeof arPaymentAllocationContract>;
export type ArPayment = z.infer<typeof arPaymentContract>;
export type CreditNoteStatus = z.infer<typeof creditNoteStatusContract>;
export type CreditNote = z.infer<typeof creditNoteContract>;

export type ArPaymentsPage = z.infer<typeof arPaymentsPageContract>;
export type CreditNotesPage = z.infer<typeof creditNotesPageContract>;
