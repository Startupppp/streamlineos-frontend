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

// ─── Performance ───
export const performanceReviews = pgTable("performance_reviews", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  reviewerId: text("reviewer_id").references(() => users.id),
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
});

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

export const performanceReviewsRelations = relations(performanceReviews, ({ one }) => ({
  user: one(users, { fields: [performanceReviews.userId], references: [users.id], relationName: "reviewUser" }),
  reviewer: one(users, { fields: [performanceReviews.reviewerId], references: [users.id], relationName: "reviewReviewer" }),
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
