/**
 * HR domain TypeScript types.
 * Derived from the DB schema and tRPC router return shapes.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type PayrollStatus = "DRAFT" | "APPROVED" | "PAID";
export type ExpenseStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
export type AssetStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "DISPOSED";
export type DocumentType =
  | "CONTRACT"
  | "CERTIFICATE"
  | "ID_PROOF"
  | "PAYSLIP"
  | "POLICY"
  | "OFFER_LETTER"
  | "RESUME"
  | "OTHER";
export type ReviewStatus = "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type WfhRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DeviceStatus = "ACTIVE" | "INACTIVE" | "RETURNED";
export type AttendanceStatus = "OFFLINE" | "PRESENT" | "ON_BREAK" | "CHECKED_OUT";
export type WorkLogStatus = "PENDING" | "APPROVED" | "REJECTED";

// ─── Department ───────────────────────────────────────────────────────────────

export interface Department {
  id: number;
  orgId: string;
  name: string;
  managerId: string | null;
  createdAt: Date | string | null;
}

// ─── Employee ─────────────────────────────────────────────────────────────────

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
  image: string | null;
  isActive: boolean;
  joiningDate: string | null;
  hasDashboardAccess: boolean;
  reportingTo: string | null;
  monthlySalary: string | null;
}

export interface PaginatedEmployees {
  data: Employee[];
  pagination: Pagination;
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface BreakEntry {
  start: string;
  end?: string;
}

export interface AttendanceLog {
  id: number;
  orgId: string;
  userId: string;
  date: string;
  checkIn: Date | string | null;
  checkOut: Date | string | null;
  status: string | null;
  workHours: string | null;
  breakHours: string | null;
  breaks: BreakEntry[] | null;
  locationData: unknown | null;
  isOvertime: boolean | null;
  autoCheckedOut: boolean | null;
  createdAt: Date | string | null;
}

export interface DailyStats {
  workHours: string;
  breakHours: string;
  isOvertime: boolean;
}

export interface AttendanceStatusResult {
  status: AttendanceStatus;
  logs: AttendanceLog[];
  todayLog: AttendanceLog | null | undefined;
  dailyStats: DailyStats;
  cooldownRemaining: number;
}

// ─── Leave ────────────────────────────────────────────────────────────────────

export interface LeaveType {
  id: number;
  orgId: string;
  name: string;
  daysPerYear: number;
  carryForward: boolean | null;
}

export interface LeaveBalance {
  id: number;
  orgId: string;
  userId: string;
  leaveTypeId: number | null;
  balance: string;
  year: number;
}

export interface LeaveRequest {
  id: number;
  orgId: string;
  userId: string;
  leaveTypeId: number | null;
  startDate: string;
  endDate: string;
  reason: string | null;
  priority: string | null;
  status: LeaveStatus | null;
  approverId: string | null;
  rejectionReason: string | null;
  attachmentUrl: string | null;
  createdAt: Date | string | null;
}

export interface LeavesResult {
  balances: LeaveBalance[];
  types: LeaveType[];
  requests: LeaveRequest[];
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export interface Payroll {
  id: number;
  orgId: string;
  userId: string;
  month: string;
  basicSalary: string;
  hra: string | null;
  allowances: string | null;
  deductions: string | null;
  grossSalary: string;
  netSalary: string;
  status: PayrollStatus | null;
  generatedBy: string | null;
  approvedBy: string | null;
  overtimeType: string | null;
  overtimeDays: string | null;
  overtimeHours: string | null;
  overtimeAmount: string | null;
  payslipUrl: string | null;
  createdAt: Date | string | null;
}

export interface SalaryStructure {
  id: number;
  orgId: string;
  userId: string;
  basicSalary: string;
  hraPercentage: string | null;
  allowances: string | null;
  deductions: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

// ─── Expense ──────────────────────────────────────────────────────────────────

export interface Expense {
  id: number;
  orgId: string;
  userId: string;
  categoryId: number | null;
  category: string;
  amount: string;
  currency: string | null;
  description: string | null;
  receiptUrl: string | null;
  receiptFileName: string | null;
  merchant: string | null;
  paymentMethod: string | null;
  projectId: number | null;
  status: ExpenseStatus | null;
  approverId: string | null;
  approvedAt: Date | string | null;
  rejectionReason: string | null;
  paidAt: Date | string | null;
  transactionRef: string | null;
  expenseDate: string;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface PaginatedExpenses {
  data: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Asset ────────────────────────────────────────────────────────────────────

export interface Asset {
  id: number;
  orgId: string;
  name: string;
  type: string;
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

// ─── Document ─────────────────────────────────────────────────────────────────

export interface Document {
  id: number;
  orgId: string;
  userId: string | null;
  departmentId: number | null;
  name: string;
  description: string | null;
  type: DocumentType;
  category: string | null;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  version: number | null;
  parentDocumentId: number | null;
  isPublic: boolean | null;
  isActive: boolean | null;
  expiryDate: string | null;
  expiryReminderSent: boolean | null;
  tags: string[] | null;
  metadata: unknown | null;
  uploadedBy: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

// ─── Performance ──────────────────────────────────────────────────────────────

export interface RatingEntry {
  category: string;
  score: number;
  comment?: string;
}

export interface GoalEntry {
  goal: string;
  achieved: boolean;
}

export interface PerformanceReview {
  id: number;
  orgId: string;
  userId: string;
  reviewerId: string | null;
  periodStart: string;
  periodEnd: string;
  status: ReviewStatus | null;
  ratings: RatingEntry[] | null;
  strengths: string | null;
  improvements: string | null;
  goals: GoalEntry[] | null;
  overallRating: string | null;
  comments: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

export interface Goal {
  id: number;
  orgId: string;
  userId: string;
  title: string;
  description: string | null;
  type: string | null;
  targetValue: string | null;
  currentValue: string | null;
  unit: string | null;
  startDate: string;
  endDate: string;
  status: string | null;
  progress: number | null;
  parentGoalId: number | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

// ─── Helpdesk ─────────────────────────────────────────────────────────────────

export interface HelpdeskTicket {
  id: number;
  orgId: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: TicketPriority | null;
  status: TicketStatus | null;
  assigneeId: string | null;
  resolvedAt: Date | string | null;
  resolution: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

// ─── Work Log (Timesheet) ─────────────────────────────────────────────────────

export interface WorkLog {
  id: number;
  orgId: string;
  userId: string | null;
  ticketId: number | null;
  date: string;
  hours: string | null;
  description: string | null;
  imageUrl: string | null;
  workLink: string | null;
  status: string | null;
  approvedBy: string | null;
  approvedAt: Date | string | null;
  rejectionReason: string | null;
  isBillable: boolean | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
}

// ─── Org Chart ────────────────────────────────────────────────────────────────

export interface OrgChartNode {
  id: string;
  name: string | null;
  email: string;
  role: string;
  designation: string | null;
  image: string | null;
  departmentId: number | null;
  reportingTo: string | null;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

// ─── Input types for mutations ────────────────────────────────────────────────

export interface CreateDepartmentInput {
  name: string;
}

export interface UpdateProfileInput {
  userId: string;
  name?: string;
  designation?: string;
  departmentId?: number;
  phone?: string;
  image?: string;
}

export interface CheckInInput {
  location?: {
    lat: number;
    lng: number;
    address?: string;
  } | null;
}

export interface RequestLeaveInput {
  typeId: number;
  startDate: Date | string;
  endDate: Date | string;
  reason?: string;
}

export interface ApproveLeaveInput {
  requestId: number;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export interface GeneratePayrollInput {
  month: string;
}

export interface CreateSalaryStructureInput {
  userId: string;
  basicSalary: number;
  hraPercentage: number;
  allowances: number;
  deductions: number;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string;
}

export interface CreateExpenseInput {
  category: string;
  amount: number;
  description?: string;
  receiptUrl?: string;
  expenseDate: Date | string;
}

export interface UpdateExpenseStatusInput {
  expenseId: number;
  status: "APPROVED" | "REJECTED" | "PAID";
  rejectionReason?: string;
}

export interface CreateAssetInput {
  name: string;
  type: string;
  serialNumber?: string;
  assignedTo?: string;
  purchaseDate?: Date | string;
  purchaseCost?: number;
  location?: string;
  notes?: string;
}

export interface UpdateAssetInput {
  assetId: number;
  name?: string;
  type?: string;
  serialNumber?: string;
  assignedTo?: string;
  status?: AssetStatus;
  location?: string;
  notes?: string;
}

export interface CreateDocumentInput {
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  userId?: string;
}

export interface CreatePerformanceReviewInput {
  userId: string;
  reviewerId?: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  ratings?: RatingEntry[];
  strengths?: string;
  improvements?: string;
  goals?: GoalEntry[];
  overallRating?: number;
  comments?: string;
}

export interface CreateGoalInput {
  userId: string;
  title: string;
  description?: string;
  type?: string;
  targetValue?: number;
  currentValue: number;
  unit?: string;
  startDate: Date | string;
  endDate: Date | string;
  parentGoalId?: number;
}

export interface UpdateGoalInput {
  goalId: number;
  title?: string;
  description?: string;
  targetValue?: number;
  currentValue?: number;
  status?: string;
  progress?: number;
}

export interface CreateHelpdeskTicketInput {
  title: string;
  description?: string;
  category?: string;
  priority?: TicketPriority;
}

export interface UpsertWorkLogInput {
  date: Date | string;
  hours?: number;
  description?: string;
}

export interface UpdateWorkLogStatusInput {
  id: number;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export interface GetWorkLogsInput {
  year: number;
  quarter: number;
  userId?: string;
}
