import { z } from "zod";
import { parseMoneyInput } from "@/lib/accounting/money";
import type { CreateReceiptInput, DepositAccountTag } from "@/types/accounting-ar-receipts";

export const DEPOSIT_ACCOUNT_OPTIONS: ReadonlyArray<{ value: DepositAccountTag; label: string }> = [
  { value: "bank", label: "Straight into the bank" },
  { value: "cash", label: "Cash in hand" },
  { value: "undeposited", label: "Received but not banked yet" },
  { value: "psp_clearing", label: "Held by the payment gateway" },
];

export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Something else" },
];

export const receiptFormSchema = z
  .object({
    partyId: z.string().trim().min(1, "Choose the customer who paid"),
    receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
    amount: z.string().trim().min(1, "Enter the amount received"),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, "Three-letter currency code"),
    depositAccountTag: z.enum(["bank", "cash", "undeposited", "psp_clearing"]),
    paymentMethod: z.string().trim().max(64),
    reference: z.string().trim().max(255),
    memo: z.string().trim().max(4000),
    autoAllocateFifo: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const minor = parseMoneyInput(values.amount, values.currency);
    if (minor === null || minor <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Enter an amount this currency supports",
      });
    }
  });

export type ReceiptFormValues = z.infer<typeof receiptFormSchema>;

export function emptyReceiptForm(currency: string, partyId: string = ""): ReceiptFormValues {
  return {
    partyId,
    receiptDate: new Date().toISOString().slice(0, 10),
    amount: "",
    currency,
    depositAccountTag: "bank",
    paymentMethod: "bank_transfer",
    reference: "",
    memo: "",
    autoAllocateFifo: true,
  };
}

export function toCreateReceiptInput(values: ReceiptFormValues): CreateReceiptInput {
  const currency = values.currency.toUpperCase();
  return {
    partyId: values.partyId,
    receiptDate: values.receiptDate,
    depositAccountTag: values.depositAccountTag,
    currency,
    amountMinor: parseMoneyInput(values.amount, currency) ?? 0,
    paymentMethod: values.paymentMethod.length > 0 ? values.paymentMethod : null,
    reference: values.reference.length > 0 ? values.reference : null,
    memo: values.memo.length > 0 ? values.memo : null,
    autoAllocateFifo: values.autoAllocateFifo,
  };
}
