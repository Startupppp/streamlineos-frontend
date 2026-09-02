import type { ArPayment } from "@/hooks/api/accounting/ar-schema";
export type { ArPayment };

export type ArInvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "FAILED"
  | "VOIDED";

export type ArPaymentMethod =
  | "bank_transfer"
  | "upi"
  | "cheque"
  | "cash"
  | "card"
  | "other";

export interface ArInvoiceClient {
  id: number;
  name: string;
}

export interface ArInvoiceProject {
  id: number;
  name: string;
}

export interface ArInvoice {
  id: number;
  invoiceNumber: string;
  orgId: number;
  clientId: number | null;
  projectId: number | null;
  status: ArInvoiceStatus;
  total: string;
  amountPaid: string;
  currency: string;
  dueDate: string | null;
  createdAt: string;
  collectionOwnerId: string | null;
  promiseToPayDate: string | null;
  client: ArInvoiceClient | null;
  project: ArInvoiceProject | null;
  creator: { id: number; name: string } | null;
  payments?: ArPayment[];
}

export interface PaymentAllocation {
  invoiceId: number;
  amount: number;
}

export interface RecordPaymentInput {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  allocations?: PaymentAllocation[];
}

export type { CreditNoteStatus } from "@/hooks/api/accounting/ar-schema";

export interface CreditNoteItem {
  description: string;
  hsnSacCode?: string;
  quantity: number;
  rate: number;
  gstRate: 0 | 5 | 12 | 18 | 28;
}

export type { CreditNote } from "@/hooks/api/accounting/ar-schema";

export interface CreateCreditNoteInput {
  clientId?: number;
  invoiceId?: number;
  reason?: string;
  currency: string;
  items: CreditNoteItem[];
  placeOfSupply?: string;
  customerGstin?: string;
  supplierGstin?: string;
  notes?: string;
}

export interface ApplyCreditNoteInput {
  invoiceId: number;
  amount: number;
}

export type RecurringFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export interface RecurringInvoiceTemplate {
  id: number;
  name: string;
  orgId: number;
  clientId: number | null;
  frequency: RecurringFrequency;
  nextRunDate: string | null;
  endDate: string | null;
  lastRunDate: string | null;
  payload: Record<string, unknown>;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
}

export interface CreateRecurringTemplateInput {
  name: string;
  clientId?: number;
  frequency: RecurringFrequency;
  nextRunDate?: string;
  endDate?: string;
  payload: Record<string, unknown>;
}

export type UpdateRecurringTemplateInput = Partial<CreateRecurringTemplateInput> & {
  isActive?: boolean;
};

export type ReminderChannel = "EMAIL" | "WHATSAPP";

export interface ReminderPolicy {
  id: number;
  orgId: number;
  name: string;
  offsets: number[];
  channel: ReminderChannel;
  template: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateReminderPolicyInput {
  name: string;
  offsets: number[];
  channel: ReminderChannel;
  template?: string;
}

export type UpdateReminderPolicyInput = Partial<CreateReminderPolicyInput> & {
  isActive?: boolean;
};

export interface ReminderLogEntry {
  id: number;
  orgId: number;
  invoiceId: number;
  channel: string;
  offsetDays: number;
  status: string;
  sentAt: string | null;
}

export type CollectionActivityType = "NOTE" | "PROMISE_TO_PAY" | "CALL" | "EMAIL";

export interface CollectionActivity {
  id: number;
  orgId: number;
  clientId: number;
  invoiceId: number | null;
  type: CollectionActivityType;
  note: string | null;
  promisedDate: string | null;
  createdAt: string;
}

export interface CreateCollectionActivityInput {
  clientId: number;
  invoiceId?: number;
  type: CollectionActivityType;
  note?: string;
  promisedDate?: string;
}

export interface CollectionAgingBucket {
  label: string;
  count: number;
  amount: number;
}

export interface TopRiskCustomer {
  clientId: number;
  overdueAmount: number;
  totalInvoiced: number;
  maxDaysOverdue: number;
  riskScore: number;
}

export interface CollectionsSummary {
  agingBuckets: CollectionAgingBucket[];
  topRiskCustomers: TopRiskCustomer[];
  asOf: string;
}

export interface UpdateInvoiceCollectionInput {
  collectionOwnerId?: string;
  promiseToPayDate?: string;
}

