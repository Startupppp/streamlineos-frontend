import { Badge } from "@/components/ui/badge";
import { statusToneClasses, type StatusTone } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type {
  ArDocumentStatus,
  PartyRole,
  SupplyNature,
  TaxCategory,
} from "@/types/accounting-ar";
import type { AgingBucketKey, ArReceiptStatus } from "@/types/accounting-ar-receipts";

const DOCUMENT_STATUS_LABEL: Readonly<Record<ArDocumentStatus, string>> = {
  DRAFT: "Draft",
  POSTED: "Awaiting payment",
  PARTIALLY_PAID: "Part paid",
  PAID: "Paid",
  VOID: "Cancelled",
};

const DOCUMENT_STATUS_TONE: Readonly<Record<ArDocumentStatus, StatusTone>> = {
  DRAFT: "neutral",
  POSTED: "info",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  VOID: "danger",
};

export const DOCUMENT_STATUS_OPTIONS: ReadonlyArray<{ value: ArDocumentStatus; label: string }> = [
  { value: "DRAFT", label: DOCUMENT_STATUS_LABEL.DRAFT },
  { value: "POSTED", label: DOCUMENT_STATUS_LABEL.POSTED },
  { value: "PARTIALLY_PAID", label: DOCUMENT_STATUS_LABEL.PARTIALLY_PAID },
  { value: "PAID", label: DOCUMENT_STATUS_LABEL.PAID },
  { value: "VOID", label: DOCUMENT_STATUS_LABEL.VOID },
];

export function documentStatusLabel(status: ArDocumentStatus): string {
  return DOCUMENT_STATUS_LABEL[status];
}

export function isDocumentStatus(value: string): value is ArDocumentStatus {
  return value in DOCUMENT_STATUS_LABEL;
}

export function ArStatusBadge({
  status,
  className,
}: {
  status: ArDocumentStatus;
  className?: string;
}) {
  const tone = statusToneClasses(DOCUMENT_STATUS_TONE[status]);
  return (
    <Badge
      variant="outline"
      className={cn("h-5 px-2 py-0.5 text-micro", tone.surface, tone.ink, tone.rule, className)}
    >
      {DOCUMENT_STATUS_LABEL[status]}
    </Badge>
  );
}

const RECEIPT_STATUS_TONE: Readonly<Record<ArReceiptStatus, StatusTone>> = {
  POSTED: "success",
  REVERSED: "danger",
};

const RECEIPT_STATUS_LABEL: Readonly<Record<ArReceiptStatus, string>> = {
  POSTED: "Received",
  REVERSED: "Reversed",
};

export function ReceiptStatusBadge({
  status,
  className,
}: {
  status: ArReceiptStatus;
  className?: string;
}) {
  const tone = statusToneClasses(RECEIPT_STATUS_TONE[status]);
  return (
    <Badge
      variant="outline"
      className={cn("h-5 px-2 py-0.5 text-micro", tone.surface, tone.ink, tone.rule, className)}
    >
      {RECEIPT_STATUS_LABEL[status]}
    </Badge>
  );
}

export const PARTY_ROLE_LABEL: Readonly<Record<PartyRole, string>> = {
  customer: "Customer",
  vendor: "Supplier",
  both: "Customer and supplier",
};

export const TAX_CATEGORY_OPTIONS: ReadonlyArray<{ value: TaxCategory; label: string }> = [
  { value: "standard", label: "Standard rate" },
  { value: "reduced", label: "Reduced rate" },
  { value: "super_reduced", label: "Super reduced rate" },
  { value: "zero", label: "Zero rated" },
  { value: "exempt", label: "Exempt" },
  { value: "out_of_scope", label: "Outside tax" },
  { value: "reverse_charge", label: "Reverse charge" },
];

export const SUPPLY_NATURE_OPTIONS: ReadonlyArray<{ value: SupplyNature; label: string }> = [
  { value: "domestic_b2b", label: "Domestic business" },
  { value: "domestic_b2c", label: "Domestic consumer" },
  { value: "export", label: "Export" },
  { value: "import", label: "Import" },
  { value: "intra_community", label: "Intra-community" },
  { value: "oss_b2c", label: "OSS consumer" },
  { value: "reverse_charge", label: "Reverse charge" },
  { value: "outside_scope", label: "Outside scope" },
];

export const AGING_BUCKET_LABEL: Readonly<Record<AgingBucketKey, string>> = {
  days0to30: "0-30 days",
  days31to60: "31-60 days",
  days61to90: "61-90 days",
  days91Plus: "91+ days",
};

export const AGING_BUCKET_KEYS: ReadonlyArray<AgingBucketKey> = [
  "days0to30",
  "days31to60",
  "days61to90",
  "days91Plus",
];
