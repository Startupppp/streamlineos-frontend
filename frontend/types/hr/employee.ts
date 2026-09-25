export type AssetStatus = string;
export type DocumentType =
  | "CONTRACT"
  | "CERTIFICATE"
  | "ID_PROOF"
  | "PAYSLIP"
  | "POLICY"
  | "OFFER_LETTER"
  | "RESUME"
  | "OTHER";

export interface Department {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  designation: string | null;
  employeeId: string | null;
  departmentId: number | null;
  department?: { id: string; name: string } | null;
  image: string | null;
  isActive: boolean;
  joiningDate: string | null;
  reportingTo: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  phone: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedEmployees {
  data: EmployeeListItem[];
  pagination: Pagination;
}

/**
 * `GET /hr/employees` projects thirteen columns. It does not select `email` as
 * non-null, nor `departmentId`, `bio`, `phone` or any of the four social URLs,
 * so a list row cannot be typed as a whole `Employee`.
 */
export type EmployeeListItem = Pick<
  Employee,
  | "id"
  | "name"
  | "firstName"
  | "lastName"
  | "role"
  | "designation"
  | "employeeId"
  | "image"
  | "isActive"
  | "joiningDate"
  | "reportingTo"
> & {
  email: string;
  department: { id: string; name: string } | null;
};

export interface EmployeeCursorPage {
  data: EmployeeListItem[];
  pageInfo: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface EmployeeAttendanceSummaryData {
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  totalHours: string;
  avgHoursPerDay: string;
}

export interface EmployeeStats {
  leaves: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    byType: Record<string, number>;
  };
  attendance: EmployeeAttendanceSummaryData | null;
}

export interface Asset {
  id: number;
  orgId: string;
  name: string;
  type: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  assignedTo: string | null;
  status: AssetStatus | null;
  purchaseDate: string | null;
  purchaseCost: string | null;
  location: string | null;
  notes: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export type DocumentClassification = "PERSONAL" | "CONFIDENTIAL" | "RESTRICTED" | "INTERNAL";

export interface Document {
  id: number;
  orgId: string;
  userId: string | null;
  departmentId: string | null;
  name: string;
  description: string | null;
  type: DocumentType;
  category: string | null;
  hasFile: boolean;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  version: number | null;
  parentDocumentId: number | null;
  isPublic: boolean | null;
  isActive: boolean | null;
  classification: DocumentClassification;
  effectiveDate: string | null;
  expiryDate: string | null;
  expiryReminderSent: boolean | null;
  tags: string[] | null;
  metadata: unknown | null;
  uploadedBy: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface WorkLog {
  id: number;
  orgId: string;
  userMembershipId: number | null;
  userId?: string | null;
  ticketId: number | null;
  date: string;
  hours: string | null;
  description: string | null;
  imageUrl: string | null;
  workLink: string | null;
  status: string | null;
  approvedByMembershipId: number | null;
  approvedBy?: string | null;
  approvedAt: Date | string | null;
  rejectionReason: string | null;
  isBillable: boolean | null;
  payrollStatus: string;
  payrollExportId: number | null;
  projectId: number | null;
  timesheetPeriodId: number | null;
  timerSessionId: number | null;
  billingType: string;
  billRate: string | null;
  costRate: string | null;
  currency: string | null;
  rateSource: string | null;
  invoicingStatus: string;
  submittedAt: Date | string | null;
  lockedAt: Date | string | null;
  lockedByMembershipId: number | null;
  voidedAt: Date | string | null;
  voidReason: string | null;
  source: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  ticket?: {
    id: number;
    title: string;
    ticketNumber: number;
    project?: { id: number; name: string; key: string } | null;
  } | null;
}

export interface CreateDepartmentInput {
  name: string;
}

export interface UpdateProfileInput {
  userId: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  designation?: string;
  departmentId?: string;
  phone?: string;
  image?: string;
  bio?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  skills?: string[];
  role?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  joiningDate?: string;
  reportingTo?: string | null;
}

export interface CreateAssetInput {
  name: string;
  type: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate?: Date | string;
  purchaseCost?: number;
  location?: string;
  notes?: string;
}

export interface UpdateAssetInput {
  assetId: number;
  name?: string;
  type?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  assignedTo?: string | null;
  status?: AssetStatus;
  purchaseDate?: Date | string;
  purchaseCost?: number;
  location?: string;
  notes?: string;
}

export interface AssignAssetInput {
  assetId: number;
  assignedTo: string | null;
}

export interface CreateDocumentInput {
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  userId?: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  expiryDate?: string;
  tags?: string[];
}

export interface UpsertWorkLogInput {
  /** Target employee; only a holder of hr:attendance:manage may widen past self. */
  userId?: string;
  date: Date | string;
  hours?: number;
  description?: string;
  workLink?: string;
}

export interface GetWorkLogsInput {
  year: number;
  quarter: number;
  userId?: string;
  month?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface OnboardEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  whatsappSameAsPhone?: boolean;
  whatsappNumber?: string;
  gender?: string;
  designation: string;
  departmentId?: string;
  /** Optional since HRM-15: omitted means the backend resolves it by policy. */
  reportingManagerUserId?: string;
  secondaryManagers?: Array<{ managerUserId: string; label?: string }>;
  topLevelRole?: boolean;
  topLevelRoleReason?: string;
  role: string;
  employeeId?: string;
  joiningDate?: Date | string;
  dateOfBirth?: Date | string;
  taxId?: string;
  monthlySalary?: number;
  salaryStructureTemplateId?: number;
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    ifsc?: string;
    accountHolder?: string;
    pfUanNumber?: string;
    esiIpNumber?: string;
  };
}

/** Spreadsheet row for bulk onboard — department name or org department id. */
export interface BulkOnboardEmployeeRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  whatsappSameAsPhone?: boolean;
  whatsappNumber?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  designation: string;
  departmentId?: string;
  department?: string;
  reportingManagerUserId?: string;
  primaryManagerEmail?: string;
  secondaryManagerEmail1?: string;
  secondaryManagerEmail2?: string;
  secondaryManagerEmail3?: string;
  effectiveFrom?: string;
  topLevelRole?: boolean;
  topLevelRoleReason?: string;
  role?: string;
  employeeId?: string;
  joiningDate?: string;
  dateOfBirth?: string;
  taxId?: string;
  monthlySalary?: number;
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    ifsc?: string;
    accountHolder?: string;
    pfUanNumber?: string;
    esiIpNumber?: string;
  };
}

export type BulkOnboardRowStatus = "READY" | "WARNING" | "ERROR" | "SKIPPED";
export type BulkOnboardCommitStatus = BulkOnboardRowStatus | "CREATED" | "FAILED";
export type ManagerResolutionKind = "SELECTED" | "IN_FILE" | "FALLBACK_CONFIGURED" | "FALLBACK_UPLOADER";

export interface OnboardingPrimaryManager {
  userId: string | null;
  name: string;
  email: string;
  resolution: ManagerResolutionKind;
}

export interface BulkOnboardResultRow {
  row: number;
  email: string;
  success: boolean;
  userId?: string;
  error?: string;
  status: BulkOnboardCommitStatus;
  codes: string[];
  primaryManager: OnboardingPrimaryManager | null;
}

export interface BulkOnboardResult {
  total: number;
  created: number;
  failed: number;
  skipped: number;
  results: BulkOnboardResultRow[];
}

export interface BulkOnboardPreviewRow {
  row: number;
  email: string;
  status: BulkOnboardRowStatus;
  codes: string[];
  messages: string[];
  primaryManager: OnboardingPrimaryManager | null;
  secondaryManagers: Array<{ name: string; email: string }>;
  dependsOnRow: number | null;
}

export interface BulkOnboardPreview {
  rows: BulkOnboardPreviewRow[];
  counts: { ready: number; warning: number; error: number; skipped: number };
}
