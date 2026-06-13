
import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, index, uniqueIndex, foreignKey, type AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  leaveStatusEnum, payrollStatusEnum, expenseStatusEnum, assetStatusEnum,
  documentTypeEnum, reviewStatusEnum, ticketPriorityEnum, ticketStatusEnum,
  wfhRequestStatusEnum, deviceStatusEnum,
  jobPostingStatusEnum, candidateStatusEnum, interviewTypeEnum,
  interviewResultEnum, applicationStatusEnum,
  reviewCycleStatusEnum, meetingStatusEnum,
  trainingStatusEnum, enrollmentStatusEnum,
  resignationStatusEnum, terminationStatusEnum, exitChecklistStatusEnum,
  ackStatusEnum, reimbursementStatusEnum, loanStatusEnum,
  pipStatusEnum, surveyStatusEnum,
  feedbackTypeEnum, bonusTypeEnum, fnfStatusEnum,
  onboardingDocStatusEnum, onboardingDocumentStatusEnum, docAuditActionEnum,
} from "./enums";
import { organizations, users } from "./auth";
import { projects } from "./projects";

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  managerId: text("manager_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_departments_org_name").on(table.orgId, table.name),
]);

export const departmentMembers = pgTable("department_members", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => departments.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("member").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_dept_members_dept_user").on(table.departmentId, table.userId),
]);

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  status: text("status").default("PRESENT").notNull(),
  workHours: decimal("work_hours", { precision: 6, scale: 2 }),
  breakHours: decimal("break_hours", { precision: 6, scale: 2 }).default("0").notNull(),
  breaks: jsonb("breaks").$type<{ start: string; end?: string }[]>().default([]).notNull(),
  locationData: jsonb("location_data").$type<{ lat?: number; lng?: number; address?: string }>(),
  isOvertime: boolean("is_overtime").default(false).notNull(),
  autoCheckedOut: boolean("auto_checked_out").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_attendance_user_date").on(table.userId, table.date),
  index("idx_attendance_org_date_status").on(table.orgId, table.date, table.status),
]);

export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  daysPerYear: integer("days_per_year").notNull(),
  carryForward: boolean("carry_forward").default(false).notNull(),
}, (table) => [
  uniqueIndex("uniq_leave_types_org_name").on(table.orgId, table.name),
]);

export const leaveBalances = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id, { onDelete: "cascade" }).notNull(),
  balance: decimal("balance", { precision: 6, scale: 2 }).default("0").notNull(),
  year: integer("year").notNull(),
}, (table) => [
  uniqueIndex("uniq_leave_balances_user_type_year").on(table.userId, table.leaveTypeId, table.year),
  index("idx_leave_balances_org_year").on(table.orgId, table.year),
]);

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id, { onDelete: "restrict" }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  priority: text("priority").default("MEDIUM").notNull(),
  status: leaveStatusEnum("status").default("PENDING").notNull(),
  approverId: text("approver_id").references(() => users.id, { onDelete: "set null" }),
  rejectionReason: text("rejection_reason"),
  managerComment: text("manager_comment"),
  attachmentUrl: text("attachment_url"),
  isHalfDay: boolean("is_half_day").default(false).notNull(),
  halfDayPeriod: text("half_day_period"),
  coveringEmployeeId: text("covering_employee_id").references(() => users.id, { onDelete: "set null" }),
  lopDays: decimal("lop_days", { precision: 5, scale: 1 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_leave_requests_user_id").on(table.userId),
  index("idx_leave_requests_org_status").on(table.orgId, table.status),
  index("idx_leave_requests_dates").on(table.startDate, table.endDate),
  index("idx_leave_requests_org_user_status").on(table.orgId, table.userId, table.status),
]);

export const payrolls = pgTable("payrolls", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  month: text("month").notNull(),
  basicSalary: decimal("basic_salary", { precision: 15, scale: 2 }).notNull(),
  hra: decimal("hra", { precision: 15, scale: 2 }).default("0").notNull(),
  allowances: decimal("allowances", { precision: 15, scale: 2 }).default("0").notNull(),
  deductions: decimal("deductions", { precision: 15, scale: 2 }).default("0").notNull(),
  grossSalary: decimal("gross_salary", { precision: 15, scale: 2 }).notNull(),
  netSalary: decimal("net_salary", { precision: 15, scale: 2 }).notNull(),
  status: payrollStatusEnum("status").default("DRAFT").notNull(),
  generatedBy: text("generated_by").references(() => users.id, { onDelete: "set null" }),
  approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
  overtimeType: text("overtime_type"),
  overtimeDays: decimal("overtime_days", { precision: 6, scale: 2 }).default("0").notNull(),
  overtimeHours: decimal("overtime_hours", { precision: 6, scale: 2 }).default("0").notNull(),
  overtimeAmount: decimal("overtime_amount", { precision: 15, scale: 2 }).default("0").notNull(),
  payslipUrl: text("payslip_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_payrolls_user_month").on(table.userId, table.month),
  index("idx_payrolls_org_month_status").on(table.orgId, table.month, table.status),
]);

export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  basicSalary: decimal("basic_salary", { precision: 15, scale: 2 }).notNull(),
  hraPercentage: decimal("hra_percentage", { precision: 5, scale: 2 }).default("40").notNull(),
  allowances: decimal("allowances", { precision: 15, scale: 2 }).default("0").notNull(),
  deductions: decimal("deductions", { precision: 15, scale: 2 }).default("0").notNull(),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_salary_structures_user_active").on(table.userId, table.isActive),
]);

export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  budgetLimit: decimal("budget_limit", { precision: 15, scale: 2 }),
  budgetPeriod: text("budget_period").default("MONTHLY").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_expense_categories_org_name").on(table.orgId, table.name),
]);

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").references(() => expenseCategories.id, { onDelete: "set null" }),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").default("INR").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  receiptFileName: text("receipt_file_name"),
  merchant: text("merchant"),
  paymentMethod: text("payment_method"),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
  status: expenseStatusEnum("status").default("PENDING").notNull(),
  approverId: text("approver_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  paidAt: timestamp("paid_at"),
  transactionRef: text("transaction_ref"),
  expenseDate: date("expense_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_expenses_user_id").on(table.userId),
  index("idx_expenses_org_status_date").on(table.orgId, table.status, table.expenseDate),
  index("idx_expenses_category").on(table.categoryId),
]);

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  serialNumber: text("serial_number"),
  assignedTo: text("assigned_to").references(() => users.id, { onDelete: "set null" }),
  status: assetStatusEnum("status").default("AVAILABLE").notNull(),
  purchaseDate: date("purchase_date"),
  purchaseCost: decimal("purchase_cost", { precision: 15, scale: 2 }),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_assets_org_status").on(table.orgId, table.status),
  index("idx_assets_assigned").on(table.assignedTo),
]);

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  departmentId: integer("department_id").references(() => departments.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  type: documentTypeEnum("type").notNull(),
  category: text("category"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  version: integer("version").default(1).notNull(),
  parentDocumentId: integer("parent_document_id"),
  isPublic: boolean("is_public").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  expiryDate: date("expiry_date"),
  expiryReminderSent: boolean("expiry_reminder_sent").default(false).notNull(),
  tags: text("tags").array().default([]).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  foreignKey({ columns: [table.parentDocumentId], foreignColumns: [table.id] }).onDelete("cascade"),
  index("idx_documents_org_type").on(table.orgId, table.type),
  index("idx_documents_user").on(table.userId),
  index("idx_documents_expiry").on(table.expiryDate),
]);

export const reviewCycles = pgTable("review_cycles", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type").default("QUARTERLY").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  deadline: date("deadline"),
  status: reviewCycleStatusEnum("status").default("DRAFT").notNull(),
  description: text("description"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_review_cycles_org").on(table.orgId),
]);

export const performanceReviews = pgTable("performance_reviews", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  reviewerId: text("reviewer_id").references(() => users.id),
  cycleId: integer("cycle_id").references(() => reviewCycles.id),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  status: reviewStatusEnum("status").default("DRAFT").notNull(),
  ratings: jsonb("ratings").$type<{ category: string; score: number; comment?: string }[]>(),
  strengths: text("strengths"),
  improvements: text("improvements"),
  goals: jsonb("goals").$type<{ goal: string; achieved: boolean }[]>(),
  overallRating: decimal("overall_rating", { precision: 4, scale: 2 }),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_perf_reviews_org_cycle").on(table.orgId, table.cycleId),
  index("idx_perf_reviews_user").on(table.userId),
]);

export const oneOnOneMeetings = pgTable("one_on_one_meetings", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  managerId: text("manager_id").references(() => users.id).notNull(),
  employeeId: text("employee_id").references(() => users.id).notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(30).notNull(),
  status: meetingStatusEnum("status").default("SCHEDULED").notNull(),
  notes: text("notes"),
  actionItems: jsonb("action_items").$type<{ text: string; done: boolean }[]>(),
  agenda: text("agenda"),
  meetingLink: text("meeting_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_one_on_ones_org").on(table.orgId),
  index("idx_one_on_ones_manager").on(table.managerId),
  index("idx_one_on_ones_scheduled").on(table.scheduledAt),
]);

export const trainingPrograms = pgTable("training_programs", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  duration: text("duration"),
  instructor: text("instructor"),
  maxParticipants: integer("max_participants"),
  status: trainingStatusEnum("status").default("DRAFT").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  location: text("location"),
  meetingLink: text("meeting_link"),
  materials: text("materials"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_training_programs_org").on(table.orgId),
]);

export const trainingEnrollments = pgTable("training_enrollments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  programId: integer("program_id").references(() => trainingPrograms.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  status: enrollmentStatusEnum("status").default("ENROLLED").notNull(),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
  feedback: text("feedback"),
  certificateUrl: text("certificate_url"),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
}, (table) => [
  index("idx_enrollments_program").on(table.programId),
  index("idx_enrollments_user").on(table.userId),
]);

export const resignations = pgTable("resignations", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  reason: text("reason"),
  reasonCategory: text("reason_category"),
  lastWorkingDate: date("last_working_date"),
  noticePeriodDays: integer("notice_period_days").default(30).notNull(),
  status: resignationStatusEnum("status").default("SUBMITTED").notNull(),
  resignationLetterUrl: text("resignation_letter_url"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  hrReviewedBy: text("hr_reviewed_by").references(() => users.id),
  hrReviewedAt: timestamp("hr_reviewed_at"),
  hrRemarks: text("hr_remarks"),
  ceoReviewedBy: text("ceo_reviewed_by").references(() => users.id),
  ceoReviewedAt: timestamp("ceo_reviewed_at"),
  ceoRemarks: text("ceo_remarks"),
  willingForExitInterview: boolean("willing_for_exit_interview").default(true).notNull(),
  companyFeedback: text("company_feedback"),
  exitInterviewNotes: text("exit_interview_notes"),
  exitInterviewDate: timestamp("exit_interview_date"),
  exitInterviewConductedBy: text("exit_interview_conducted_by").references(() => users.id),
  feedback: jsonb("feedback").$type<{ question: string; answer: string }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_resignations_org").on(table.orgId),
  index("idx_resignations_user").on(table.userId),
]);

export const exitChecklists = pgTable("exit_checklists", {
  id: serial("id").primaryKey(),
  resignationId: integer("resignation_id").references(() => resignations.id, { onDelete: "cascade" }).notNull(),
  item: text("item").notNull(),
  assignedTo: text("assigned_to").references(() => users.id),
  status: exitChecklistStatusEnum("status").default("PENDING").notNull(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

export const terminations = pgTable("terminations", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  reasons: text("reasons").array().notNull().default([]),
  detailedExplanation: text("detailed_explanation").notNull(),
  effectiveDate: date("effective_date").notNull(),
  severanceAmount: decimal("severance_amount", { precision: 15, scale: 2 }),
  noticePeriodWaived: boolean("notice_period_waived").default(false).notNull(),
  terminationLetterUrl: text("termination_letter_url"),
  supportingDocUrls: text("supporting_doc_urls").array().default([]),
  internalNotes: text("internal_notes"),
  status: terminationStatusEnum("status").default("DRAFT").notNull(),
  initiatedBy: text("initiated_by").references(() => users.id),
  ceoReviewedBy: text("ceo_reviewed_by").references(() => users.id),
  ceoReviewedAt: timestamp("ceo_reviewed_at"),
  ceoRemarks: text("ceo_remarks"),
  emailSentAt: timestamp("email_sent_at"),
  emailStatus: text("email_status"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_terminations_org").on(table.orgId),
  index("idx_terminations_user").on(table.userId),
  index("idx_terminations_status").on(table.status),
]);

export const documentTypes = pgTable("document_types", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  isMandatory: boolean("is_mandatory").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  applicableRoles: text("applicable_roles").array().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_doc_types_org").on(table.orgId),
]);

export const onboardingDocuments = pgTable("onboarding_documents", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  documentTypeId: integer("document_type_id").references(() => documentTypes.id).notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  version: integer("version").default(1).notNull(),
  status: onboardingDocumentStatusEnum("status").default("SUBMITTED").notNull(),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_onboarding_docs_user").on(table.userId),
  index("idx_onboarding_docs_org").on(table.orgId),
]);

export const documentAuditLogs = pgTable("document_audit_logs", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  onboardingDocumentId: integer("onboarding_document_id").references(() => onboardingDocuments.id).notNull(),
  action: docAuditActionEnum("action").notNull(),
  performedBy: text("performed_by").references(() => users.id).notNull(),
  remarks: text("remarks"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const recognitions = pgTable("recognitions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  fromUserId: text("from_user_id").references(() => users.id).notNull(),
  toUserId: text("to_user_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  category: text("category").default("KUDOS").notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_recognitions_org").on(table.orgId),
  index("idx_recognitions_to_user").on(table.toUserId),
]);

export const policyAcknowledgments = pgTable("policy_acknowledgments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  documentId: integer("document_id").references(() => documents.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  status: ackStatusEnum("status").default("PENDING").notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_policy_ack_doc").on(table.documentId),
  index("idx_policy_ack_user").on(table.userId),
]);

export const reimbursements = pgTable("reimbursements", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  status: reimbursementStatusEnum("status").default("PENDING").notNull(),
  approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_reimbursements_org").on(table.orgId),
  index("idx_reimbursements_user").on(table.userId),
]);

export const salaryLoans = pgTable("salary_loans", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  reason: text("reason"),
  emiAmount: decimal("emi_amount", { precision: 15, scale: 2 }),
  totalEmis: integer("total_emis"),
  paidEmis: integer("paid_emis").default(0).notNull(),
  status: loanStatusEnum("status").default("PENDING").notNull(),
  approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  disbursedAt: timestamp("disbursed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_loans_org").on(table.orgId),
  index("idx_loans_user").on(table.userId),
]);

export const certifications = pgTable("certifications", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  issuingOrganization: text("issuing_organization"),
  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  credentialId: text("credential_id"),
  credentialUrl: text("credential_url"),
  documentUrl: text("document_url"),
  reminderSent: boolean("reminder_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_certifications_user").on(table.userId),
  index("idx_certifications_expiry").on(table.expiryDate),
]);

export const backgroundVerifications = pgTable("background_verifications", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  status: text("status").default("PENDING").notNull(),
  provider: text("provider"),
  referenceNumber: text("reference_number"),
  result: text("result"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_bgv_user").on(table.userId),
]);

export const performanceImprovementPlans = pgTable("performance_improvement_plans", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  managerId: text("manager_id").references(() => users.id).notNull(),
  hrRepId: text("hr_rep_id").references(() => users.id),
  reason: text("reason").notNull(),
  objectives: jsonb("objectives").$type<{ objective: string; metric: string; deadline: string }[]>(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: pipStatusEnum("status").default("ACTIVE").notNull(),
  outcome: text("outcome"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_pip_user").on(table.userId),
]);

export const keyResults = pgTable("key_results", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").references(() => goals.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).default("0").notNull(),
  unit: text("unit"),
  progress: integer("progress").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_key_results_goal").on(table.goalId),
]);

export const employeeSkills = pgTable("employee_skills", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  skillName: text("skill_name").notNull(),
  level: integer("level").default(1).notNull(),
  verifiedBy: text("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_employee_skills_user").on(table.userId),
  index("idx_employee_skills_name").on(table.skillName),
]);

export const skillAssessments = pgTable("skill_assessments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  skillName: text("skill_name").notNull(),
  questions: jsonb("questions").$type<{ id: string; question: string; options: string[]; correctIndex: number }[]>(),
  passingScore: integer("passing_score").default(70).notNull(),
  timeLimit: integer("time_limit"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_skill_assessments_org").on(table.orgId),
]);

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").references(() => skillAssessments.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  answers: jsonb("answers").$type<{ questionId: string; selectedIndex: number }[]>(),
  score: integer("score"),
  passed: boolean("passed").default(false).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
}, (table) => [
  index("idx_assessment_attempts_user").on(table.userId),
]);

export const learningPaths = pgTable("learning_paths", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  targetRole: text("target_role"),
  steps: jsonb("steps").$type<{ order: number; type: "training" | "assessment" | "certification"; referenceId: number; title: string }[]>(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_learning_paths_org").on(table.orgId),
]);

export const teamEvents = pgTable("team_events", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("TEAM_BUILDING").notNull(),
  date: date("date").notNull(),
  time: text("time"),
  location: text("location"),
  maxParticipants: integer("max_participants"),
  organizedBy: text("organized_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_team_events_org").on(table.orgId),
]);

export const teamEventParticipants = pgTable("team_event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => teamEvents.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  status: text("status").default("GOING").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const pulseSurveys = pgTable("pulse_surveys", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  questions: jsonb("questions").$type<{ id: string; text: string; type: "rating" | "text" | "choice"; options?: string[] }[]>(),
  status: surveyStatusEnum("status").default("DRAFT").notNull(),
  isAnonymous: boolean("is_anonymous").default(true).notNull(),
  createdBy: text("created_by").references(() => users.id),
  closesAt: timestamp("closes_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_surveys_org").on(table.orgId),
]);

export const surveyResponses = pgTable("survey_responses", {
  id: serial("id").primaryKey(),
  surveyId: integer("survey_id").references(() => pulseSurveys.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id),
  answers: jsonb("answers").$type<{ questionId: string; value: string | number }[]>(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
}, (table) => [
  index("idx_survey_responses_survey").on(table.surveyId),
]);

export const feedbackRequests = pgTable("feedback_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  subjectUserId: text("subject_user_id").references(() => users.id).notNull(),
  reviewerUserId: text("reviewer_user_id").references(() => users.id).notNull(),
  type: feedbackTypeEnum("type").notNull(),
  cycleId: integer("cycle_id").references(() => reviewCycles.id),
  ratings: jsonb("ratings").$type<{ category: string; score: number; comment?: string }[]>(),
  strengths: text("strengths"),
  improvements: text("improvements"),
  overallRating: integer("overall_rating"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_feedback_subject").on(table.subjectUserId),
  index("idx_feedback_reviewer").on(table.reviewerUserId),
]);

export const emailTemplates = pgTable("hr_email_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category").default("GENERAL").notNull(),
  variables: text("variables").array(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_email_templates_org").on(table.orgId),
]);

export const careerLadders = pgTable("career_ladders", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  department: text("department"),
  levels: jsonb("levels").$type<{ level: number; title: string; description: string; minExperience: number; skills: string[] }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_career_ladders_org").on(table.orgId),
]);

export const bonuses = pgTable("bonuses", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: bonusTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  reason: text("reason"),
  month: text("month"),
  status: text("status").default("PENDING").notNull(),
  approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_bonuses_user").on(table.userId),
]);

export const fnfSettlements = pgTable("fnf_settlements", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  resignationId: integer("resignation_id").references(() => resignations.id, { onDelete: "set null" }),
  basicDues: decimal("basic_dues", { precision: 15, scale: 2 }).default("0").notNull(),
  leaveEncashment: decimal("leave_encashment", { precision: 15, scale: 2 }).default("0").notNull(),
  bonusDue: decimal("bonus_due", { precision: 15, scale: 2 }).default("0").notNull(),
  deductions: decimal("deductions", { precision: 15, scale: 2 }).default("0").notNull(),
  loanRecovery: decimal("loan_recovery", { precision: 15, scale: 2 }).default("0").notNull(),
  netPayable: decimal("net_payable", { precision: 15, scale: 2 }).default("0").notNull(),
  status: fnfStatusEnum("status").default("DRAFT").notNull(),
  approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_fnf_user").on(table.userId),
]);

export const assetReturns = pgTable("asset_returns", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  assetId: integer("asset_id").references(() => assets.id),
  assetName: text("asset_name").notNull(),
  status: text("status").default("PENDING").notNull(),
  returnedAt: timestamp("returned_at"),
  condition: text("condition"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_asset_returns_user").on(table.userId),
]);

export const alumniProfiles = pgTable("alumni_profiles", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  currentCompany: text("current_company"),
  currentRole: text("current_role"),
  linkedinUrl: text("linkedin_url"),
  email: text("email"),
  leftDate: date("left_date"),
  isOptedIn: boolean("is_opted_in").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_alumni_org").on(table.orgId),
]);

export const enpsScores = pgTable("enps_scores", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id),
  score: integer("score").notNull(),
  comment: text("comment"),
  isAnonymous: boolean("is_anonymous").default(true).notNull(),
  period: text("period"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_enps_org_period").on(table.orgId, table.period),
]);

export const handbookVersions = pgTable("handbook_versions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  version: text("version").notNull(),
  documentId: integer("document_id").references(() => richDocuments.id),
  changelog: text("changelog"),
  publishedAt: timestamp("published_at"),
  publishedBy: text("published_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_handbook_org").on(table.orgId),
]);

export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("OKR").notNull(),
  targetValue: decimal("target_value", { precision: 15, scale: 2 }),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }).default("0").notNull(),
  unit: text("unit"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").default("IN_PROGRESS").notNull(),
  progress: integer("progress").default(0).notNull(),
  parentGoalId: integer("parent_goal_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  foreignKey({ columns: [table.parentGoalId], foreignColumns: [table.id] }).onDelete("set null"),
  index("idx_goals_user_status").on(table.userId, table.status),
  index("idx_goals_org_status").on(table.orgId, table.status),
]);

export const holidays = pgTable("holidays", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  date: date("date").notNull(),
  message: text("message"),
  isPublic: boolean("is_public").default(false).notNull(),
  notificationSent: boolean("notification_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const wfhRequests = pgTable("wfh_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  date: date("date").notNull(),
  reason: text("reason"),
  status: wfhRequestStatusEnum("status").default("PENDING").notNull(),
  approverId: text("approver_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const employeeDevices = pgTable("employee_devices", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  deviceType: text("device_type").notNull(),
  deviceName: text("device_name").notNull(),
  serialNumber: text("serial_number"),
  brand: text("brand"),
  model: text("model"),
  assignedDate: date("assigned_date"),
  returnDate: date("return_date"),
  status: deviceStatusEnum("status").default("ACTIVE").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const helpdeskTickets = pgTable("helpdesk_tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  priority: ticketPriorityEnum("priority").default("MEDIUM").notNull(),
  status: ticketStatusEnum("status").default("TODO").notNull(),
  assigneeId: text("assignee_id").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const richDocuments = pgTable("rich_documents", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  contentJson: jsonb("content_json"),
  templateType: text("template_type"),
  isPublished: boolean("is_published").default(false).notNull(),
  version: integer("version").default(1).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  updatedBy: text("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_rich_documents_org").on(table.orgId),
]);

export const jobPostings = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  location: text("location"),
  type: text("type").default("FULL_TIME").notNull(),
  experience: text("experience"),
  salaryMin: decimal("salary_min", { precision: 15, scale: 2 }),
  salaryMax: decimal("salary_max", { precision: 15, scale: 2 }),
  description: text("description"),
  requirements: text("requirements"),
  benefits: text("benefits"),
  status: jobPostingStatusEnum("status").default("DRAFT").notNull(),
  openings: integer("openings").default(1).notNull(),
  applicationDeadline: date("application_deadline"),
  closingDate: timestamp("closing_date"),
  postedBy: text("posted_by").references(() => users.id),
  
  externalPostingIds: jsonb("external_posting_ids").$type<Record<string, string>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_job_postings_org").on(table.orgId),
  index("idx_job_postings_status").on(table.status),
]);


export const candidateSources = pgTable("candidate_sources", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  platform: text("platform").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  
  oauthToken: text("oauth_token"),
  
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  lastSyncedAt: timestamp("last_synced_at"),
  lastSyncCount: integer("last_sync_count").default(0).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_candidate_sources_org").on(table.orgId),
  uniqueIndex("uq_candidate_sources_org_platform").on(table.orgId, table.platform),
]);

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  resumeUrl: text("resume_url"),
  linkedinUrl: text("linkedin_url"),
  portfolioUrl: text("portfolio_url"),
  currentCompany: text("current_company"),
  currentRole: text("current_role"),
  experienceYears: decimal("experience_years", { precision: 5, scale: 2 }),
  skills: text("skills").array(),
  source: text("source").default("DIRECT").notNull(),
  status: candidateStatusEnum("status").default("NEW").notNull(),
  notes: text("notes"),
  rating: integer("rating"),
  referredBy: text("referred_by").references(() => users.id),
  externalId: text("external_id"),
  duplicateOfId: integer("duplicate_of_id").references((): AnyPgColumn => candidates.id, { onDelete: "set null" }),
  resumeText: text("resume_text"),
  aiScore: integer("ai_score"),
  aiScoreBreakdown: jsonb("ai_score_breakdown").$type<Record<string, number>>(),
  aiScoreGeneratedAt: timestamp("ai_score_generated_at"),
  bgvStatus: text("bgv_status").$type<"NOT_INITIATED" | "INITIATED" | "PENDING" | "CLEARED" | "FAILED">().default("NOT_INITIATED"),
  bgvAgency: text("bgv_agency"),
  bgvNotes: text("bgv_notes"),
  bgvInitiatedAt: timestamp("bgv_initiated_at"),
  bgvCompletedAt: timestamp("bgv_completed_at"),
  sourceUrl: text("source_url"),
  location: text("location"),
  gender: text("gender").$type<"MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_candidates_org").on(table.orgId),
  index("idx_candidates_status").on(table.status),
  index("idx_candidates_email").on(table.email),
]);

export const candidateApplications = pgTable("candidate_applications", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id, { onDelete: "cascade" }).notNull(),
  status: applicationStatusEnum("status").default("APPLIED").notNull(),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  coverLetter: text("cover_letter"),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_applications_candidate").on(table.candidateId),
  index("idx_applications_job").on(table.jobPostingId),
]);

export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id),
  interviewerId: text("interviewer_id").references(() => users.id),
  type: interviewTypeEnum("type").default("VIDEO").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(60).notNull(),
  location: text("location"),
  meetingLink: text("meeting_link"),
  result: interviewResultEnum("result").default("PENDING").notNull(),
  feedback: text("feedback"),
  rating: integer("rating"),
  rubric: jsonb("rubric").$type<{ category: string; score: number; maxScore: number; comment?: string }[]>(),
  notes: text("notes"),
  recordingUrl: text("recording_url"),
  recordingPlatform: text("recording_platform"),
  panelInterviewerIds: jsonb("panel_interviewer_ids").$type<string[]>().default([]),
  remindersSent: jsonb("reminders_sent").$type<Record<string, boolean>>().notNull().default({}),
  calendarSyncToken: text("calendar_sync_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_interviews_candidate").on(table.candidateId),
  index("idx_interviews_interviewer").on(table.interviewerId),
  index("idx_interviews_scheduled").on(table.scheduledAt),
]);


export const scorecardTemplates = pgTable("scorecard_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  criteria: jsonb("criteria").$type<Array<{ name: string; weight: number }>>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_scorecard_templates_org").on(table.orgId),
]);

export const interviewScorecards = pgTable("interview_scorecards", {
  id: serial("id").primaryKey(),
  interviewId: integer("interview_id").references(() => interviews.id, { onDelete: "cascade" }).notNull(),
  interviewerId: text("interviewer_id").references(() => users.id).notNull(),
  templateId: integer("template_id").references(() => scorecardTemplates.id),
  ratings: jsonb("ratings").$type<Record<string, number>>().notNull().default({}),
  recommendation: text("recommendation").notNull().default("MAYBE"),
  notes: text("notes"),
  isBlindMode: boolean("is_blind_mode").notNull().default(false),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_scorecards_interview").on(table.interviewId),
  index("idx_scorecards_interviewer").on(table.interviewerId),
  uniqueIndex("uniq_scorecard_interview_interviewer").on(table.interviewId, table.interviewerId),
]);


export interface BookingSlot {
  start: string;
  end: string;
}

export const interviewBookingLinks = pgTable("interview_booking_links", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id),
  token: text("token").notNull().unique(),
  interviewerIds: jsonb("interviewer_ids").$type<string[]>().notNull().default([]),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  interviewType: text("interview_type").notNull().default("VIDEO"),
  availableSlots: jsonb("available_slots").$type<BookingSlot[]>().notNull().default([]),
  selectedSlot: timestamp("selected_slot"),
  status: text("status").$type<"pending" | "booked" | "expired" | "cancelled">().notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_booking_links_token").on(table.token),
  index("idx_booking_links_candidate").on(table.candidateId),
]);


export const candidateReferrals = pgTable("candidate_referrals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  referredBy: text("referred_by").references(() => users.id).notNull(),
  relationship: text("relationship"),
  notes: text("notes"),
  bonusEligible: boolean("bonus_eligible").notNull().default(true),
  bonusAmount: decimal("bonus_amount", { precision: 12, scale: 2 }),
  bonusPaidAt: timestamp("bonus_paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_referrals_candidate").on(table.candidateId),
  index("idx_referrals_referred_by").on(table.referredBy),
]);


export const calibrationSessions = pgTable("calibration_sessions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id),
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").$type<"pending" | "scheduled" | "completed" | "cancelled">().notNull().default("pending"),
  notes: text("notes"),
  decision: text("decision").$type<"STRONG_HIRE" | "HIRE" | "NO_HIRE" | "HOLD" | null>(),
  participantIds: jsonb("participant_ids").$type<string[]>().notNull().default([]),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_calibration_sessions_candidate").on(table.candidateId),
  index("idx_calibration_sessions_org").on(table.orgId),
]);


export const candidateDocumentsVault = pgTable("candidate_documents_vault", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  filename: text("filename").notNull(),
  s3Key: text("s3_key").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  
  documentType: text("document_type"),
  avResult: text("av_result").$type<"PENDING" | "CLEAN" | "INFECTED">().notNull().default("PENDING"),
  expiresAt: date("expires_at"),
  uploadedBy: text("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_vault_candidate").on(table.candidateId),
  index("idx_vault_org").on(table.orgId),
]);

export const vaultAccessLogs = pgTable("vault_access_logs", {
  id: serial("id").primaryKey(),
  vaultDocumentId: integer("vault_document_id").references(() => candidateDocumentsVault.id, { onDelete: "cascade" }).notNull(),
  accessedBy: text("accessed_by").references(() => users.id).notNull(),
  action: text("action").notNull().default("VIEW"),
  accessedAt: timestamp("accessed_at").defaultNow().notNull(),
});


export const onboardingTemplates = pgTable("onboarding_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => departments.id, { onDelete: "set null" }),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_onboarding_templates_org").on(table.orgId),
]);

export const onboardingTemplateSteps = pgTable("onboarding_template_steps", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => onboardingTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  ownerRole: text("owner_role").notNull().default("NEW_HIRE"),
  dueOffsetDays: integer("due_offset_days").notNull().default(0),
  isRequired: boolean("is_required").notNull().default(true),
  isComplianceItem: boolean("is_compliance_item").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const onboardingTasks = pgTable("onboarding_tasks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  orgId: text("org_id").notNull().references(() => organizations.id),
  templateStepId: integer("template_step_id").references(() => onboardingTemplateSteps.id),
  title: text("title").notNull(),
  description: text("description"),
  ownerRole: text("owner_role").notNull().default("NEW_HIRE"),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("PENDING"),
  completedAt: timestamp("completed_at"),
  completedBy: text("completed_by").references(() => users.id),
  dependsOnTaskIds: jsonb("depends_on_task_ids").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_onboarding_tasks_user").on(table.userId, table.orgId),
  index("idx_onboarding_tasks_status").on(table.orgId, table.status),
]);


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
  coveringEmployee: one(users, { fields: [leaveRequests.coveringEmployeeId], references: [users.id], relationName: "leaveCoveringEmployee" }),
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

export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  organization: one(organizations, { fields: [jobPostings.orgId], references: [organizations.id] }),
  department: one(departments, { fields: [jobPostings.departmentId], references: [departments.id] }),
  postedByUser: one(users, { fields: [jobPostings.postedBy], references: [users.id] }),
  applications: many(candidateApplications),
}));

export const candidateSourcesRelations = relations(candidateSources, ({ one }) => ({
  organization: one(organizations, { fields: [candidateSources.orgId], references: [organizations.id] }),
  createdByUser: one(users, { fields: [candidateSources.createdBy], references: [users.id] }),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  applications: many(candidateApplications),
  interviews: many(interviews),
}));

export const candidateApplicationsRelations = relations(candidateApplications, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateApplications.candidateId], references: [candidates.id] }),
  jobPosting: one(jobPostings, { fields: [candidateApplications.jobPostingId], references: [jobPostings.id] }),
}));

export const interviewsRelations = relations(interviews, ({ one, many }) => ({
  candidate: one(candidates, { fields: [interviews.candidateId], references: [candidates.id] }),
  jobPosting: one(jobPostings, { fields: [interviews.jobPostingId], references: [jobPostings.id] }),
  interviewer: one(users, { fields: [interviews.interviewerId], references: [users.id] }),
  scorecards: many(interviewScorecards),
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
  hrReviewer: one(users, { fields: [resignations.hrReviewedBy], references: [users.id], relationName: "resignationHrReviewer" }),
  ceoReviewer: one(users, { fields: [resignations.ceoReviewedBy], references: [users.id], relationName: "resignationCeoReviewer" }),
  interviewer: one(users, { fields: [resignations.exitInterviewConductedBy], references: [users.id], relationName: "exitInterviewer" }),
  checklists: many(exitChecklists),
}));

export const terminationsRelations = relations(terminations, ({ one }) => ({
  user: one(users, { fields: [terminations.userId], references: [users.id] }),
  initiator: one(users, { fields: [terminations.initiatedBy], references: [users.id], relationName: "terminationInitiator" }),
  ceoReviewer: one(users, { fields: [terminations.ceoReviewedBy], references: [users.id], relationName: "terminationCeoReviewer" }),
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

export const certificationsRelations = relations(certifications, ({ one }) => ({
  user: one(users, { fields: [certifications.userId], references: [users.id] }),
}));

export const backgroundVerificationsRelations = relations(backgroundVerifications, ({ one }) => ({
  user: one(users, { fields: [backgroundVerifications.userId], references: [users.id] }),
}));

export const pipRelations = relations(performanceImprovementPlans, ({ one }) => ({
  user: one(users, { fields: [performanceImprovementPlans.userId], references: [users.id] }),
  manager: one(users, { fields: [performanceImprovementPlans.managerId], references: [users.id], relationName: "pipManager" }),
  hrRep: one(users, { fields: [performanceImprovementPlans.hrRepId], references: [users.id], relationName: "pipHrRep" }),
}));

export const keyResultsRelations = relations(keyResults, ({ one }) => ({
  goal: one(goals, { fields: [keyResults.goalId], references: [goals.id] }),
}));

export const employeeSkillsRelations = relations(employeeSkills, ({ one }) => ({
  user: one(users, { fields: [employeeSkills.userId], references: [users.id] }),
  verifier: one(users, { fields: [employeeSkills.verifiedBy], references: [users.id], relationName: "skillVerifier" }),
}));

export const pulseSurveysRelations = relations(pulseSurveys, ({ one, many }) => ({
  creator: one(users, { fields: [pulseSurveys.createdBy], references: [users.id] }),
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  survey: one(pulseSurveys, { fields: [surveyResponses.surveyId], references: [pulseSurveys.id] }),
  user: one(users, { fields: [surveyResponses.userId], references: [users.id] }),
}));

export const feedbackRequestsRelations = relations(feedbackRequests, ({ one }) => ({
  subject: one(users, { fields: [feedbackRequests.subjectUserId], references: [users.id], relationName: "feedbackSubject" }),
  reviewer: one(users, { fields: [feedbackRequests.reviewerUserId], references: [users.id], relationName: "feedbackReviewer" }),
  cycle: one(reviewCycles, { fields: [feedbackRequests.cycleId], references: [reviewCycles.id] }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  creator: one(users, { fields: [emailTemplates.createdBy], references: [users.id] }),
}));

export const bonusesRelations = relations(bonuses, ({ one }) => ({
  user: one(users, { fields: [bonuses.userId], references: [users.id] }),
  approver: one(users, { fields: [bonuses.approvedBy], references: [users.id], relationName: "bonusApprover" }),
}));

export const fnfSettlementsRelations = relations(fnfSettlements, ({ one }) => ({
  user: one(users, { fields: [fnfSettlements.userId], references: [users.id] }),
  resignation: one(resignations, { fields: [fnfSettlements.resignationId], references: [resignations.id] }),
}));

export const assetReturnsRelations = relations(assetReturns, ({ one }) => ({
  user: one(users, { fields: [assetReturns.userId], references: [users.id] }),
  asset: one(assets, { fields: [assetReturns.assetId], references: [assets.id] }),
}));

export const alumniProfilesRelations = relations(alumniProfiles, ({ one }) => ({
  user: one(users, { fields: [alumniProfiles.userId], references: [users.id] }),
}));

export const handbookVersionsRelations = relations(handbookVersions, ({ one }) => ({
  document: one(richDocuments, { fields: [handbookVersions.documentId], references: [richDocuments.id] }),
  publisher: one(users, { fields: [handbookVersions.publishedBy], references: [users.id] }),
}));

export const skillAssessmentsRelations = relations(skillAssessments, ({ one, many }) => ({
  creator: one(users, { fields: [skillAssessments.createdBy], references: [users.id] }),
  attempts: many(assessmentAttempts),
}));

export const assessmentAttemptsRelations = relations(assessmentAttempts, ({ one }) => ({
  assessment: one(skillAssessments, { fields: [assessmentAttempts.assessmentId], references: [skillAssessments.id] }),
  user: one(users, { fields: [assessmentAttempts.userId], references: [users.id] }),
}));

export const learningPathsRelations = relations(learningPaths, ({ one }) => ({
  creator: one(users, { fields: [learningPaths.createdBy], references: [users.id] }),
}));

export const teamEventsRelations = relations(teamEvents, ({ one, many }) => ({
  organizer: one(users, { fields: [teamEvents.organizedBy], references: [users.id] }),
  participants: many(teamEventParticipants),
}));

export const teamEventParticipantsRelations = relations(teamEventParticipants, ({ one }) => ({
  event: one(teamEvents, { fields: [teamEventParticipants.eventId], references: [teamEvents.id] }),
  user: one(users, { fields: [teamEventParticipants.userId], references: [users.id] }),
}));

export const scorecardTemplatesRelations = relations(scorecardTemplates, ({ one, many }) => ({
  organization: one(organizations, { fields: [scorecardTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [scorecardTemplates.createdBy], references: [users.id] }),
  scorecards: many(interviewScorecards),
}));

export const interviewScorecardsRelations = relations(interviewScorecards, ({ one }) => ({
  interview: one(interviews, { fields: [interviewScorecards.interviewId], references: [interviews.id] }),
  interviewer: one(users, { fields: [interviewScorecards.interviewerId], references: [users.id] }),
  template: one(scorecardTemplates, { fields: [interviewScorecards.templateId], references: [scorecardTemplates.id] }),
}));

export const candidateDocumentsVaultRelations = relations(candidateDocumentsVault, ({ one, many }) => ({
  organization: one(organizations, { fields: [candidateDocumentsVault.orgId], references: [organizations.id] }),
  uploader: one(users, { fields: [candidateDocumentsVault.uploadedBy], references: [users.id] }),
  accessLogs: many(vaultAccessLogs),
}));

export const vaultAccessLogsRelations = relations(vaultAccessLogs, ({ one }) => ({
  document: one(candidateDocumentsVault, { fields: [vaultAccessLogs.vaultDocumentId], references: [candidateDocumentsVault.id] }),
  accessor: one(users, { fields: [vaultAccessLogs.accessedBy], references: [users.id] }),
}));

export const onboardingTemplatesRelations = relations(onboardingTemplates, ({ one, many }) => ({
  organization: one(organizations, { fields: [onboardingTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [onboardingTemplates.createdBy], references: [users.id] }),
  steps: many(onboardingTemplateSteps),
}));

export const onboardingTemplateStepsRelations = relations(onboardingTemplateSteps, ({ one }) => ({
  template: one(onboardingTemplates, { fields: [onboardingTemplateSteps.templateId], references: [onboardingTemplates.id] }),
}));

export const onboardingTasksRelations = relations(onboardingTasks, ({ one }) => ({
  user: one(users, { fields: [onboardingTasks.userId], references: [users.id], relationName: "onboardingTaskUser" }),
  completedByUser: one(users, { fields: [onboardingTasks.completedBy], references: [users.id], relationName: "onboardingTaskCompletedBy" }),
  templateStep: one(onboardingTemplateSteps, { fields: [onboardingTasks.templateStepId], references: [onboardingTemplateSteps.id] }),
}));


export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  type: text("type").notNull().default("OFFER"),
  htmlContent: text("html_content").notNull().default(""),
  variables: jsonb("variables").$type<string[]>().notNull().default([]),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_doc_templates_org").on(table.orgId, table.type),
]);

export const candidateDocuments = pgTable("candidate_documents", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  templateId: integer("template_id").references(() => documentTemplates.id),
  title: text("title").notNull(),
  htmlContent: text("html_content").notNull().default(""),
  status: text("status").notNull().default("GENERATED"),
  
  externalDocId: text("external_doc_id"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  signedAt: timestamp("signed_at"),
  declinedAt: timestamp("declined_at"),
  
  acceptanceDeadline: timestamp("acceptance_deadline"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_candidate_docs_candidate").on(table.candidateId),
  index("idx_candidate_docs_external").on(table.externalDocId),
]);

export const documentTemplateVersions = pgTable("document_template_versions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => documentTemplates.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  htmlContent: text("html_content").notNull(),
  variables: jsonb("variables").$type<string[]>().notNull().default([]),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
  archivedBy: text("archived_by").notNull().references(() => users.id),
}, (table) => [
  index("idx_dtv_template_id").on(table.templateId),
]);


export const documentTemplatesRelations = relations(documentTemplates, ({ one, many }) => ({
  organization: one(organizations, { fields: [documentTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [documentTemplates.createdBy], references: [users.id] }),
  candidateDocuments: many(candidateDocuments),
  versions: many(documentTemplateVersions),
}));

export const documentTemplateVersionsRelations = relations(documentTemplateVersions, ({ one }) => ({
  template: one(documentTemplates, { fields: [documentTemplateVersions.templateId], references: [documentTemplates.id] }),
  archivedByUser: one(users, { fields: [documentTemplateVersions.archivedBy], references: [users.id] }),
}));

export const candidateDocumentsRelations = relations(candidateDocuments, ({ one }) => ({
  template: one(documentTemplates, { fields: [candidateDocuments.templateId], references: [documentTemplates.id] }),
  organization: one(organizations, { fields: [candidateDocuments.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [candidateDocuments.createdBy], references: [users.id] }),
}));


export const interviewSlas = pgTable("interview_slas", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(),
  maxHours: integer("max_hours").notNull().default(48),
  warningHours: integer("warning_hours").notNull().default(36),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_interview_sla_org_stage").on(table.orgId, table.stage),
]);

export const candidateSlaTracking = pgTable("candidate_sla_tracking", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  stage: text("stage").notNull(),
  enteredAt: timestamp("entered_at").notNull().defaultNow(),
  breachedAt: timestamp("breached_at"),
  status: text("status").notNull().default("ON_TRACK"),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("uniq_sla_tracking_candidate_stage").on(table.candidateId, table.stage),
  index("idx_sla_tracking_org_status").on(table.orgId, table.status),
  index("idx_sla_tracking_candidate").on(table.candidateId),
]);

export const interviewSlasRelations = relations(interviewSlas, ({ one }) => ({
  organization: one(organizations, { fields: [interviewSlas.orgId], references: [organizations.id] }),
}));

export const candidateSlaTrackingRelations = relations(candidateSlaTracking, ({ one }) => ({
  organization: one(organizations, { fields: [candidateSlaTracking.orgId], references: [organizations.id] }),
  candidate: one(candidates, { fields: [candidateSlaTracking.candidateId], references: [candidates.id] }),
}));


export const interviewQuestions = pgTable("interview_questions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  category: text("category").notNull().default("GENERAL"),
  role: text("role"),
  difficulty: text("difficulty").notNull().default("MEDIUM"),
  tags: text("tags").array().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_interview_questions_org").on(table.orgId),
  index("idx_interview_questions_category").on(table.orgId, table.category),
]);

export const interviewQuestionsRelations = relations(interviewQuestions, ({ one }) => ({
  organization: one(organizations, { fields: [interviewQuestions.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [interviewQuestions.createdBy], references: [users.id] }),
}));


export const candidateReferenceChecks = pgTable("candidate_reference_checks", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  referenceName: text("reference_name").notNull(),
  referenceDesignation: text("reference_designation"),
  referenceCompany: text("reference_company"),
  referenceEmail: text("reference_email"),
  referencePhone: text("reference_phone"),
  relationship: text("relationship"),
  status: text("status").notNull().default("PENDING"),
  outcome: text("outcome"),
  notes: text("notes"),
  contactedAt: timestamp("contacted_at"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_reference_checks_candidate").on(table.candidateId),
  index("idx_reference_checks_org").on(table.orgId),
]);

export const candidateReferenceChecksRelations = relations(candidateReferenceChecks, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateReferenceChecks.candidateId], references: [candidates.id] }),
  organization: one(organizations, { fields: [candidateReferenceChecks.orgId], references: [organizations.id] }),
  createdByUser: one(users, { fields: [candidateReferenceChecks.createdBy], references: [users.id] }),
}));


export const candidateOffers = pgTable("candidate_offers", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  candidateId: integer("candidate_id").notNull().references(() => candidates.id, { onDelete: "cascade" }),
  jobPostingId: integer("job_posting_id").references(() => jobPostings.id),
  offeredBy: text("offered_by").references(() => users.id),
  offerStatus: text("offer_status").notNull().default("DRAFT"),
  offeredSalary: decimal("offered_salary", { precision: 15, scale: 2 }),
  offeredDesignation: text("offered_designation"),
  joiningDate: date("joining_date"),
  offerLetterUrl: text("offer_letter_url"),
  validUntil: date("valid_until"),
  notes: text("notes"),
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_candidate_offers_candidate").on(table.candidateId),
  index("idx_candidate_offers_org").on(table.orgId),
]);

export const candidateOffersRelations = relations(candidateOffers, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateOffers.candidateId], references: [candidates.id] }),
  organization: one(organizations, { fields: [candidateOffers.orgId], references: [organizations.id] }),
  jobPosting: one(jobPostings, { fields: [candidateOffers.jobPostingId], references: [jobPostings.id] }),
  offeredByUser: one(users, { fields: [candidateOffers.offeredBy], references: [users.id] }),
}));


export const leaveBlackoutDates = pgTable("leave_blackout_dates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason").notNull(),
  appliesTo: text("applies_to").notNull().default("ALL"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_leave_blackout_org").on(table.orgId, table.startDate),
]);

export const leaveBlackoutDatesRelations = relations(leaveBlackoutDates, ({ one }) => ({
  organization: one(organizations, { fields: [leaveBlackoutDates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [leaveBlackoutDates.createdBy], references: [users.id] }),
}));

