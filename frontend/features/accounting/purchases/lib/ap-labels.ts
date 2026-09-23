import type { BadgeTone } from "@/components/ui/semantic-badge";
import type {
  ApDocumentStatus,
  ApDocumentType,
  ApPaymentStatus,
  TaxCategory,
} from "@/types/accounting/accounting-ap";
import type { ApAgingBucket } from "@/types/accounting/accounting-ap-payments";

export const AP_STATUS_LABELS: Readonly<Record<ApDocumentStatus, string>> = {
  DRAFT: "Draft",
  POSTED: "Awaiting payment",
  PARTIALLY_PAID: "Part paid",
  PAID: "Paid",
  VOID: "Void",
};

export const AP_STATUS_TONES: Readonly<Record<ApDocumentStatus, BadgeTone>> = {
  DRAFT: "neutral",
  POSTED: "warning",
  PARTIALLY_PAID: "info",
  PAID: "success",
  VOID: "neutral",
};

export const AP_PAYMENT_STATUS_LABELS: Readonly<
  Record<ApPaymentStatus, string>
> = {
  POSTED: "Sent",
  REVERSED: "Reversed",
};

export const AP_PAYMENT_STATUS_TONES: Readonly<
  Record<ApPaymentStatus, BadgeTone>
> = {
  POSTED: "success",
  REVERSED: "danger",
};

export const AP_DOCUMENT_TYPE_LABELS: Readonly<Record<ApDocumentType, string>> =
  {
    BILL: "Bill",
    DEBIT_NOTE: "Vendor credit",
  };

export const TAX_CATEGORY_LABELS: Readonly<Record<TaxCategory, string>> = {
  standard: "Standard rate",
  reduced: "Reduced rate",
  super_reduced: "Super-reduced rate",
  zero: "Zero rated",
  exempt: "Exempt",
  out_of_scope: "Outside the tax system",
  reverse_charge: "Reverse charge",
};

const TAX_CATEGORY_ORDER: readonly TaxCategory[] = [
  "standard",
  "reduced",
  "super_reduced",
  "zero",
  "exempt",
  "out_of_scope",
  "reverse_charge",
];

export const TAX_CATEGORY_OPTIONS: ReadonlyArray<{
  value: TaxCategory;
  label: string;
}> = TAX_CATEGORY_ORDER.map((value) => ({
  value,
  label: TAX_CATEGORY_LABELS[value],
}));

export const AGING_BUCKET_LABELS: Readonly<Record<ApAgingBucket, string>> = {
  "0-30": "Not yet late",
  "31-60": "1 to 2 months late",
  "61-90": "2 to 3 months late",
  "91+": "More than 3 months late",
};

export const REVERSE_CHARGE_EXPLAINER =
  "You account for the tax on this purchase. The vendor charges none, and the same amount is recorded as both tax you owe and tax you reclaim.";

export const BLOCKED_INPUT_TAX_EXPLAINER =
  "This tax cannot be reclaimed. It stays with the expense instead of going to your tax account, so the purchase costs the full amount.";

export function withholdingExplainer(withheldMinor: number): string {
  if (withheldMinor === 0)
    return "Nothing is being withheld, so the vendor receives the full amount.";
  return "Tax withheld is held back from the vendor and paid to the tax authority on their behalf.";
}
