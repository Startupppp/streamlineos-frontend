export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type PayrollApprovalRow = {
  id: number;
  runId: number;
  orgId: string;
  stage: number;
  stageName: string;
  requiredPermission: string;
  status: ApprovalStatus;
  actedBy: string | null;
  actedAt: string | null;
  comment: string | null;
  createdAt: string;
  isCurrentUserApprover?: boolean;
  approverName?: string | null;
};

export type SubmitApprovalResult = {
  autoApproved: boolean;
  runStatus: string;
  stagesCreated?: number;
};

export type ApproveStageResult = {
  success: boolean;
  runStatus: string;
};

export type BankBatchStatus =
  | "DRAFT"
  | "GENERATED"
  | "SENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "FAILED";

export type BankItemStatus = "PENDING" | "SENT" | "PAID" | "FAILED" | "HELD";

export type BankScheme =
  | "IFSC"
  | "ABA_ROUTING"
  | "SORT_CODE"
  | "IBAN"
  | "BSB"
  | "SWIFT_ACCOUNT"
  | "GENERIC";

export type BatchFormat =
  | "NEFT_CSV"
  | "RTGS_CSV"
  | "GENERIC_CSV"
  | "ACH_CSV"
  | "SEPA_CSV";

export type PayoutBatch = {
  id: number;
  orgId: string;
  runId: number;
  batchNumber: string;
  status: BankBatchStatus;
  format: BatchFormat;
  totalAmount: string;
  itemCount: number;
  generatedBy: string | null;
  generatedAt: string | null;
  sentAt: string | null;
  idempotencyKey: string | null;
};

export type PayoutBatchItem = {
  id: number;
  orgId: string;
  batchId: number;
  userId: string;
  runEmployeeId: number;
  amount: string;
  accountMasked: string;
  ifsc: string | null;
  status: BankItemStatus;
  transactionRef: string | null;
  failureReason: string | null;
  paidAt: string | null;
};

export type ValidationItem = {
  userId: string;
  employeeName: string;
  netAmount: string;
  currency: string;
  maskedAccount: string | null;
  scheme: BankScheme;
  schemeLabel: string;
  errors: string[];
  warnings: string[];
  onHold: boolean;
};

export type CreateBatchResult = {
  batch: PayoutBatch;
  items: PayoutBatchItem[];
  fileUrl: string | null;
  replayed: boolean;
};

export type GetBatchResult = {
  batch: PayoutBatch;
  items: PayoutBatchItem[];
};

export type EmployeeBankDetails = {
  userId: string;
  employeeName: string;
  accountNumber: string | null;
  bankName: string | null;
  branch: string | null;
  ifsc: string | null;
  accountHolder: string | null;
  pfUanNumber: string | null;
  bankCountry?: string;
};

export type PayslipLayout = "CLASSIC" | "MODERN" | "COMPLIANCE";

export type PayslipTemplateConfig = {
  accent: string;
  showEmployerContributions: boolean;
  showYtd: boolean;
};

export type PayslipTemplate = {
  id: number;
  orgId: string;
  name: string;
  layout: PayslipLayout;
  config: PayslipTemplateConfig;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PublicationStatus = "PENDING" | "PUBLISHED" | "FAILED";

export type PayslipPublication = {
  id: number;
  runId: number;
  userId: string;
  runEmployeeId: number;
  status: PublicationStatus;
  channel: string;
  pdfUrl: string | null;
  publishedAt: string | null;
  snapshotHash: string | null;
};

export type PublishResult = {
  published: number;
  total: number;
  runStatus: string;
};
