/**
 * HR domain tables: attendance, leaves, payroll, salary, expenses, assets, documents,
 * performance reviews, goals, holidays, WFH, devices, departments, helpdesk.
 */
import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  leaveStatusEnum, payrollStatusEnum, expenseStatusEnum, assetStatusEnum,
  documentTypeEnum, reviewStatusEnum, ticketPriorityEnum, ticketStatusEnum,
  wfhRequestStatusEnum, deviceStatusEnum,
  jobPostingStatusEnum, candidateStatusEnum, interviewTypeEnum,
  interviewResultEnum, applicationStatusEnum,
  reviewCycleStatusEnum, meetingStatusEnum,
  trainingStatusEnum, enrollmentStatusEnum,
  resignationStatusEnum, exitChecklistStatusEnum,
  ackStatusEnum, reimbursementStatusEnum, loanStatusEnum,
} from "./enums";
import { organizations, users } from "./auth";
import { projects } from "./projects";

// ─── Departments ───
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  managerId: text("manager_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const departmentMembers = pgTable("department_members", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_dept_members_dept_user").on(table.departmentId, table.userId),
]);

// ─── Attendance ───
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  status: text("status").default("PRESENT"),
  workHours: decimal("work_hours"),
  breakHours: decimal("break_hours").default("0"),
  breaks: jsonb("breaks").$type<{ start: string; end?: string }[]>().default([]),
  locationData: jsonb("location_data"),
  isOvertime: boolean("is_overtime").default(false),
  autoCheckedOut: boolean("auto_checked_out").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_attendance_user_id").on(table.userId),
  index("idx_attendance_org_date").on(table.orgId, table.date),
  index("idx_attendance_date").on(table.date),
  index("idx_attendance_user_date").on(table.userId, table.date),
]);

// ─── Leave Types & Balances & Requests ───
export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  daysPerYear: integer("days_per_year").notNull(),
  carryForward: boolean("carry_forward").default(false),
});

export const leaveBalances = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id),
  balance: decimal("balance").default("0").notNull(),
  year: integer("year").notNull(),
}, (table) => [
  index("idx_leave_balances_user_year").on(table.userId, table.year),
  index("idx_leave_balances_org_year").on(table.orgId, table.year),
  index("idx_leave_balances_type_org").on(table.leaveTypeId, table.orgId),
]);

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  priority: text("priority").default("MEDIUM"),
  status: leaveStatusEnum("status").default("PENDING"),
  approverId: text("approver_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_leave_requests_user_id").on(table.userId),
  index("idx_leave_requests_org_status").on(table.orgId, table.status),
]);

// ─── Payroll ───
export const payrolls = pgTable("payrolls", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  month: text("month").notNull(),
  basicSalary: decimal("basic_salary").notNull(),
  hra: decimal("hra").default("0"),
  allowances: decimal("allowances").default("0"),
  deductions: decimal("deductions").default("0"),
  grossSalary: decimal("gross_salary").notNull(),
  netSalary: decimal("net_salary").notNull(),
  status: payrollStatusEnum("status").default("DRAFT"),
  generatedBy: text("generated_by").references(() => users.id),
  approvedBy: text("approved_by").references(() => users.id),
  overtimeType: text("overtime_type"),
  overtimeDays: decimal("overtime_days").default("0"),
  overtimeHours: decimal("overtime_hours").default("0"),
  overtimeAmount: decimal("overtime_amount").default("0"),
  payslipUrl: text("payslip_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_payrolls_org_month").on(table.orgId, table.month),
]);

export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  basicSalary: decimal("basic_salary").notNull(),
  hraPercentage: decimal("hra_percentage").default("40"),
  allowances: decimal("allowances").default("0"),
  deductions: decimal("deductions").default("0"),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Expenses ───
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  budgetLimit: decimal("budget_limit"),
  budgetPeriod: text("budget_period").default("MONTHLY"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  categoryId: integer("category_id").references(() => expenseCategories.id),
  category: text("category").notNull(),
  amount: decimal("amount").notNull(),
  currency: text("currency").default("INR"),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  receiptFileName: text("receipt_file_name"),
  merchant: text("merchant"),
  paymentMethod: text("payment_method"),
  projectId: integer("project_id").references(() => projects.id),
  status: expenseStatusEnum("status").default("PENDING"),
  approverId: text("approver_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  paidAt: timestamp("paid_at"),
  transactionRef: text("transaction_ref"),
  expenseDate: date("expense_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_expenses_user_id").on(table.userId),
  index("idx_expenses_org_status").on(table.orgId, table.status),
  index("idx_expenses_date").on(table.expenseDate),
  index("idx_expenses_category").on(table.categoryId),
]);

// ─── Assets ───
export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  serialNumber: text("serial_number"),
  assignedTo: text("assigned_to").references(() => users.id),
  status: assetStatusEnum("status").default("AVAILABLE"),
  purchaseDate: date("purchase_date"),
  purchaseCost: decimal("purchase_cost"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Documents ───
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id),
  departmentId: integer("department_id").references(() => departments.id),
  name: text("name").notNull(),
  description: text("description"),
  type: documentTypeEnum("type").notNull(),
  category: text("category"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  version: integer("version").default(1),
  parentDocumentId: integer("parent_document_id"),
  isPublic: boolean("is_public").default(false),
  isActive: boolean("is_active").default(true),
  expiryDate: date("expiry_date"),
  expiryReminderSent: boolean("expiry_reminder_sent").default(false),
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Review Cycles ───
export const reviewCycles = pgTable("review_cycles", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").default("QUARTERLY"),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  deadline: date("deadline"),
  status: reviewCycleStatusEnum("status").default("DRAFT"),
  description: text("description"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_review_cycles_org").on(table.orgId),
]);

// ─── Performance ───
export const performanceReviews = pgTable("performance_reviews", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  reviewerId: text("reviewer_id").references(() => users.id),
  cycleId: integer("cycle_id").references(() => reviewCycles.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  status: reviewStatusEnum("status").default("DRAFT"),
  ratings: jsonb("ratings").$type<{ category: string; score: number; comment?: string }[]>(),
  strengths: text("strengths"),
  improvements: text("improvements"),
  goals: jsonb("goals").$type<{ goal: string; achieved: boolean }[]>(),
  overallRating: decimal("overall_rating"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_perf_reviews_org_cycle").on(table.orgId, table.cycleId),
  index("idx_perf_reviews_user").on(table.userId),
]);

// ─── 1-on-1 Meetings ───
export const oneOnOneMeetings = pgTable("one_on_one_meetings", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  managerId: text("manager_id").references(() => users.id).notNull(),
  employeeId: text("employee_id").references(() => users.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(30),
  status: meetingStatusEnum("status").default("SCHEDULED"),
  notes: text("notes"),
  actionItems: jsonb("action_items").$type<{ text: string; done: boolean }[]>(),
  agenda: text("agenda"),
  meetingLink: text("meeting_link"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_one_on_ones_org").on(table.orgId),
  index("idx_one_on_ones_manager").on(table.managerId),
  index("idx_one_on_ones_scheduled").on(table.scheduledAt),
]);

// ─── Training & Development ───
export const trainingPrograms = pgTable("training_programs", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  duration: text("duration"),
  instructor: text("instructor"),
  maxParticipants: integer("max_participants"),
  status: trainingStatusEnum("status").default("DRAFT"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  location: text("location"),
  meetingLink: text("meeting_link"),
  materials: text("materials"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_training_programs_org").on(table.orgId),
]);

export const trainingEnrollments = pgTable("training_enrollments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  programId: integer("program_id").references(() => trainingPrograms.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  status: enrollmentStatusEnum("status").default("ENROLLED"),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  feedback: text("feedback"),
  certificateUrl: text("certificate_url"),
  enrolledAt: timestamp("enrolled_at").defaultNow(),
}, (table) => [
  index("idx_enrollments_program").on(table.programId),
  index("idx_enrollments_user").on(table.userId),
]);

// ─── Exit Management ───
export const resignations = pgTable("resignations", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  reason: text("reason"),
  lastWorkingDate: date("last_working_date"),
  noticePeriodDays: integer("notice_period_days").default(30),
  status: resignationStatusEnum("status").default("SUBMITTED"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  exitInterviewNotes: text("exit_interview_notes"),
  exitInterviewDate: timestamp("exit_interview_date"),
  exitInterviewConductedBy: text("exit_interview_conducted_by").references(() => users.id),
  feedback: jsonb("feedback").$type<{ question: string; answer: string }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_resignations_org").on(table.orgId),
  index("idx_resignations_user").on(table.userId),
]);

export const exitChecklists = pgTable("exit_checklists", {
  id: serial("id").primaryKey(),
  resignationId: integer("resignation_id").references(() => resignations.id, { onDelete: "cascade" }).notNull(),
  item: text("item").notNull(),
  assignedTo: text("assigned_to").references(() => users.id),
  status: exitChecklistStatusEnum("status").default("PENDING"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

// ─── Recognition / Kudos ───
export const recognitions = pgTable("recognitions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  fromUserId: text("from_user_id").references(() => users.id).notNull(),
  toUserId: text("to_user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  category: text("category").default("KUDOS"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_recognitions_org").on(table.orgId),
  index("idx_recognitions_to_user").on(table.toUserId),
]);

// ─── Compliance: Policy Acknowledgments ───
export const policyAcknowledgments = pgTable("policy_acknowledgments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  status: ackStatusEnum("status").default("PENDING"),
  acknowledgedAt: timestamp("acknowledged_at"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_policy_ack_doc").on(table.documentId),
  index("idx_policy_ack_user").on(table.userId),
]);

// ─── Payroll: Reimbursements ───
export const reimbursements = pgTable("reimbursements", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  category: text("category").notNull(),
  amount: decimal("amount").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  status: reimbursementStatusEnum("status").default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reimbursements_org").on(table.orgId),
  index("idx_reimbursements_user").on(table.userId),
]);

// ─── Payroll: Salary Advance / Loans ───
export const salaryLoans = pgTable("salary_loans", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  amount: decimal("amount").notNull(),
  reason: text("reason"),
  emiAmount: decimal("emi_amount"),
  totalEmis: integer("total_emis"),
  paidEmis: integer("paid_emis").default(0),
  status: loanStatusEnum("status").default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  disbursedAt: timestamp("disbursed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_loans_org").on(table.orgId),
  index("idx_loans_user").on(table.userId),
]);

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("OKR"),
  targetValue: decimal("target_value"),
  currentValue: decimal("current_value").default("0"),
  unit: text("unit"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").default("IN_PROGRESS"),
  progress: integer("progress").default(0),
  parentGoalId: integer("parent_goal_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Holidays, WFH, Devices ───
export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  message: text("message"),
  notificationSent: boolean("notification_sent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const wfhRequests = pgTable("wfh_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  reason: text("reason"),
  status: wfhRequestStatusEnum("status").default("PENDING"),
  approverId: text("approver_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employeeDevices = pgTable("employee_devices", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  deviceType: text("device_type").notNull(),
  deviceName: text("device_name").notNull(),
  serialNumber: text("serial_number"),
  brand: text("brand"),
  model: text("model"),
  assignedDate: date("assigned_date"),
  returnDate: date("return_date"),
  status: deviceStatusEnum("status").default("ACTIVE"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Helpdesk ───
export const helpdeskTickets = pgTable("helpdesk_tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  priority: ticketPriorityEnum("priority").default("MEDIUM"),
  status: ticketStatusEnum("status").default("TODO"),
  assigneeId: text("assignee_id").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Rich Documents ───
export const richDocuments = pgTable("rich_documents", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  contentJson: jsonb("content_json"),
  templateType: text("template_type"),
  isPublished: boolean("is_published").default(false),
  version: integer("version").default(1),
  createdBy: text("created_by").references(() => users.id).notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_rich_documents_org").on(table.orgId),
]);

// ─── Recruitment ───
export const jobPostings = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  location: text("location"),
  type: text("type").default("FULL_TIME"),
  experience: text("experience"),
  salaryMin: decimal("salary_min"),
  salaryMax: decimal("salary_max"),
  description: text("description"),
  requirements: text("requirements"),
  benefits: text("benefits"),
  status: jobPostingStatusEnum("status").default("DRAFT"),
  openings: integer("openings").default(1),
  applicationDeadline: date("application_deadline"),
  postedBy: text("posted_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_job_postings_org").on(table.orgId),
  index("idx_job_postings_status").on(table.status),
]);

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  resumeUrl: text("resume_url"),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  currentCompany: text("current_company"),
  currentRole: text("current_role"),
  experienceYears: decimal("experience_years"),
  skills: text("skills").array(),
  source: text("source").default("DIRECT"),
  status: candidateStatusEnum("status").default("NEW"),
  notes: text("notes"),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_candidates_org").on(table.orgId),
  index("idx_candidates_status").on(table.status),
  index("idx_candidates_email").on(table.email),
]);

export const candidateApplications = pgTable("candidate_applications", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id, { onDelete: "cascade" }).notNull(),
  status: applicationStatusEnum("status").default("APPLIED"),
  appliedAt: timestamp("applied_at").defaultNow(),
  coverLetter: text("cover_letter"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_applications_candidate").on(table.candidateId),
  index("idx_applications_job").on(table.jobPostingId),
]);

export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id),
  interviewerId: text("interviewer_id").references(() => users.id),
  type: interviewTypeEnum("type").default("VIDEO"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(60),
  location: text("location"),
  meetingLink: text("meeting_link"),
  result: interviewResultEnum("result").default("PENDING"),
  feedback: text("feedback"),
  rating: integer("rating"),
  rubric: jsonb("rubric").$type<{ category: string; score: number; maxScore: number; comment?: string }[]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_interviews_candidate").on(table.candidateId),
  index("idx_interviews_interviewer").on(table.interviewerId),
  index("idx_interviews_scheduled").on(table.scheduledAt),
]);

// ─── HR Relations ───
export const departmentsRelations = relations(departments, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [departments.orgId],
    references: [organizations.id],
  }),
  members: many(departmentMembers),
}));

export const departmentMembersRelations = relations(departmentMembers, ({ one }) => ({
  department: one(departments, {
    fields: [departmentMembers.departmentId],
    references: [departments.id],
  }),
  user: one(users, {
    fields: [departmentMembers.userId],
    references: [users.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user: one(users, { fields: [leaveRequests.userId], references: [users.id] }),
  leaveType: one(leaveTypes, { fields: [leaveRequests.leaveTypeId], references: [leaveTypes.id] }),
  approver: one(users, { fields: [leaveRequests.approverId], references: [users.id], relationName: "leaveApprover" }),
}));

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
  leaveType: one(leaveTypes, { fields: [leaveBalances.leaveTypeId], references: [leaveTypes.id] }),
}));

export const payrollsRelations = relations(payrolls, ({ one }) => ({
  user: one(users, { fields: [payrolls.userId], references: [users.id] }),
  generatedByUser: one(users, { fields: [payrolls.generatedBy], references: [users.id], relationName: "payrollGeneratedBy" }),
  approvedByUser: one(users, { fields: [payrolls.approvedBy], references: [users.id], relationName: "payrollApprovedBy" }),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({ one }) => ({
  user: one(users, { fields: [salaryStructures.userId], references: [users.id] }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, { fields: [expenses.userId], references: [users.id], relationName: "expenseUser" }),
  approver: one(users, { fields: [expenses.approverId], references: [users.id], relationName: "expenseApprover" }),
  expenseCategory: one(expenseCategories, { fields: [expenses.categoryId], references: [expenseCategories.id] }),
  project: one(projects, { fields: [expenses.projectId], references: [projects.id] }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  assignedUser: one(users, { fields: [assets.assignedTo], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
  uploader: one(users, { fields: [documents.uploadedBy], references: [users.id], relationName: "documentUploader" }),
  parent: one(documents, { fields: [documents.parentDocumentId], references: [documents.id] }),
}));

export const reviewCyclesRelations = relations(reviewCycles, ({ one, many }) => ({
  organization: one(organizations, { fields: [reviewCycles.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [reviewCycles.createdBy], references: [users.id] }),
  reviews: many(performanceReviews),
}));

export const performanceReviewsRelations = relations(performanceReviews, ({ one }) => ({
  user: one(users, { fields: [performanceReviews.userId], references: [users.id], relationName: "reviewUser" }),
  reviewer: one(users, { fields: [performanceReviews.reviewerId], references: [users.id], relationName: "reviewReviewer" }),
  cycle: one(reviewCycles, { fields: [performanceReviews.cycleId], references: [reviewCycles.id] }),
}));

export const oneOnOneMeetingsRelations = relations(oneOnOneMeetings, ({ one }) => ({
  organization: one(organizations, { fields: [oneOnOneMeetings.orgId], references: [organizations.id] }),
  manager: one(users, { fields: [oneOnOneMeetings.managerId], references: [users.id], relationName: "meetingManager" }),
  employee: one(users, { fields: [oneOnOneMeetings.employeeId], references: [users.id], relationName: "meetingEmployee" }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, { fields: [goals.userId], references: [users.id] }),
  parent: one(goals, { fields: [goals.parentGoalId], references: [goals.id] }),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  organization: one(organizations, { fields: [holidays.orgId], references: [organizations.id] }),
}));

export const wfhRequestsRelations = relations(wfhRequests, ({ one }) => ({
  user: one(users, { fields: [wfhRequests.userId], references: [users.id] }),
  approver: one(users, { fields: [wfhRequests.approverId], references: [users.id], relationName: "wfhApprover" }),
}));

export const employeeDevicesRelations = relations(employeeDevices, ({ one }) => ({
  user: one(users, { fields: [employeeDevices.userId], references: [users.id] }),
}));

// ─── Recruitment Relations ───
export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  organization: one(organizations, { fields: [jobPostings.orgId], references: [organizations.id] }),
  department: one(departments, { fields: [jobPostings.departmentId], references: [departments.id] }),
  postedByUser: one(users, { fields: [jobPostings.postedBy], references: [users.id] }),
  applications: many(candidateApplications),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  applications: many(candidateApplications),
  interviews: many(interviews),
}));

export const candidateApplicationsRelations = relations(candidateApplications, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateApplications.candidateId], references: [candidates.id] }),
  jobPosting: one(jobPostings, { fields: [candidateApplications.jobPostingId], references: [jobPostings.id] }),
}));

export const interviewsRelations = relations(interviews, ({ one }) => ({
  candidate: one(candidates, { fields: [interviews.candidateId], references: [candidates.id] }),
  jobPosting: one(jobPostings, { fields: [interviews.jobPostingId], references: [jobPostings.id] }),
  interviewer: one(users, { fields: [interviews.interviewerId], references: [users.id] }),
}));

export const richDocumentsRelations = relations(richDocuments, ({ one }) => ({
  organization: one(organizations, { fields: [richDocuments.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [richDocuments.createdBy], references: [users.id] }),
}));

export const trainingProgramsRelations = relations(trainingPrograms, ({ one, many }) => ({
  organization: one(organizations, { fields: [trainingPrograms.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [trainingPrograms.createdBy], references: [users.id] }),
  enrollments: many(trainingEnrollments),
}));

export const trainingEnrollmentsRelations = relations(trainingEnrollments, ({ one }) => ({
  program: one(trainingPrograms, { fields: [trainingEnrollments.programId], references: [trainingPrograms.id] }),
  user: one(users, { fields: [trainingEnrollments.userId], references: [users.id] }),
}));

export const resignationsRelations = relations(resignations, ({ one, many }) => ({
  user: one(users, { fields: [resignations.userId], references: [users.id] }),
  approver: one(users, { fields: [resignations.approvedBy], references: [users.id], relationName: "resignationApprover" }),
  interviewer: one(users, { fields: [resignations.exitInterviewConductedBy], references: [users.id], relationName: "exitInterviewer" }),
  checklists: many(exitChecklists),
}));

export const exitChecklistsRelations = relations(exitChecklists, ({ one }) => ({
  resignation: one(resignations, { fields: [exitChecklists.resignationId], references: [resignations.id] }),
  assignee: one(users, { fields: [exitChecklists.assignedTo], references: [users.id] }),
}));

export const recognitionsRelations = relations(recognitions, ({ one }) => ({
  fromUser: one(users, { fields: [recognitions.fromUserId], references: [users.id], relationName: "recognitionFrom" }),
  toUser: one(users, { fields: [recognitions.toUserId], references: [users.id], relationName: "recognitionTo" }),
}));

export const policyAcknowledgmentsRelations = relations(policyAcknowledgments, ({ one }) => ({
  document: one(documents, { fields: [policyAcknowledgments.documentId], references: [documents.id] }),
  user: one(users, { fields: [policyAcknowledgments.userId], references: [users.id] }),
}));

export const reimbursementsRelations = relations(reimbursements, ({ one }) => ({
  user: one(users, { fields: [reimbursements.userId], references: [users.id] }),
  approver: one(users, { fields: [reimbursements.approvedBy], references: [users.id], relationName: "reimbursementApprover" }),
}));

export const salaryLoansRelations = relations(salaryLoans, ({ one }) => ({
  user: one(users, { fields: [salaryLoans.userId], references: [users.id] }),
  approver: one(users, { fields: [salaryLoans.approvedBy], references: [users.id], relationName: "loanApprover" }),
}));
