export type AssetStatus = "AVAILABLE" | "ASSIGNED" | "MAINTENANCE" | "RETIRED";
export type DocumentType =
  | "CONTRACT"
  | "CERTIFICATE"
  | "ID_PROOF"
  | "PAYSLIP"
  | "POLICY"
  | "OFFER_LETTER"
  | "RESUME"
  | "OTHER";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TicketStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type DeviceStatus = "ACTIVE" | "INACTIVE" | "RETURNED";
export type DeviceStatusExtended = "ACTIVE" | "INACTIVE" | "LOST" | "RETURNED";
export type WorkLogStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Department {
  id: number;
  orgId: string;
  name: string;
  managerId: string | null;
  createdAt: Date | string | null;
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
  department?: { id: number; name: string } | null;
  image: string | null;
  isActive: boolean;
  joiningDate: string | null;
  hasDashboardAccess: boolean;
  reportingTo: string | null;
  monthlySalary: string | null;
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

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

export interface PaginatedEmployees {
  data: Employee[];
  pagination: Pagination;
}

export interface OrgChartNode {
  id: string;
  name: string | null;
  email: string;
  role: string;
  designation: string | null;
  image: string | null;
  departmentId: number | null;
  departmentName: string | null;
  reportingTo: string | null;
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
  ticket?: {
    id: number;
    title: string;
    ticketNumber: number;
    project?: { id: number; name: string; key: string } | null;
  } | null;
}

export interface Device {
  id: number;
  orgId: string;
  userId: string;
  deviceType: string;
  deviceName: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  notes: string | null;
  assignedDate: Date | string | null;
  returnDate: Date | string | null;
  status: DeviceStatusExtended | null;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
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
  departmentId?: number;
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
  taxId?: string;
  monthlySalary?: number;
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    ifsc?: string;
    accountHolder?: string;
  };
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
  workLink?: string;
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
  month?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateDeviceInput {
  userId: string;
  deviceType: string;
  deviceName: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  notes?: string;
  assignedDate?: Date | string;
}

export interface UpdateDeviceInput {
  deviceId: number;
  userId?: string;
  deviceType?: string;
  deviceName?: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  notes?: string;
  status?: DeviceStatusExtended;
  returnDate?: Date | string;
}

export interface DeleteDeviceInput {
  deviceId: number;
}

export interface OnboardEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  whatsappSameAsPhone?: boolean;
  whatsappNumber?: string;
  gender?: string;
  password: string;
  designation: string;
  departmentId?: number;
  role: string;
  employeeId?: string;
  joiningDate?: Date | string;
  dateOfBirth?: Date | string;
  taxId?: string;
  monthlySalary?: number;
  bankDetails?: {
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    ifsc?: string;
    accountHolder?: string;
    pfUanNumber?: string;
  };
}

/** Spreadsheet row for bulk onboard — department name or numeric id. */
export interface BulkOnboardEmployeeRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  whatsappSameAsPhone?: boolean;
  whatsappNumber?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  password?: string;
  designation: string;
  departmentId?: number;
  department?: string;
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
  };
}

export interface BulkOnboardResultRow {
  row: number;
  email: string;
  success: boolean;
  userId?: string;
  error?: string;
}

export interface BulkOnboardResult {
  total: number;
  created: number;
  failed: number;
  results: BulkOnboardResultRow[];
}
