import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, pgEnum, foreignKey, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
// Dynamic roles table — predefined: CEO, ADMIN, SALES, ENGINEER, MARKETING, etc.
// Admins can create additional roles at runtime
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),           // Display name e.g. "Engineer"
  slug: text("slug").notNull(),            // Lookup key e.g. "ENGINEER"
  orgId: text("org_id").references(() => organizations.id).notNull(),
  isSystem: boolean("is_system").default(false).notNull(), // true = predefined, can't delete
  permissions: jsonb("permissions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_role_slug_org").on(table.slug, table.orgId),
]);

export const rolesRelations = relations(roles, ({ one }) => ({
  organization: one(organizations, {
    fields: [roles.orgId],
    references: [organizations.id],
  }),
}));
export const ticketTypeEnum = pgEnum("ticket_type", ["EPIC", "STORY", "TASK", "BUG"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const projectStatusEnum = pgEnum("project_status", ["ACTIVE", "COMPLETED", "ARCHIVED"]);
export const leaveStatusEnum = pgEnum("leave_status", ["PENDING", "APPROVED", "REJECTED"]);
export const payrollStatusEnum = pgEnum("payroll_status", ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PAID"]);
export const expenseStatusEnum = pgEnum("expense_status", ["PENDING", "APPROVED", "REJECTED", "PAID"]);
export const assetStatusEnum = pgEnum("asset_status", ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]);
export const documentTypeEnum = pgEnum("document_type", ["CONTRACT", "CERTIFICATE", "ID_PROOF", "PAYSLIP", "POLICY", "OFFER_LETTER", "RESUME", "OTHER"]);
export const reviewStatusEnum = pgEnum("review_status", ["DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]);
export const notificationTypeEnum = pgEnum("notification_type", ["INFO", "SUCCESS", "WARNING", "ERROR"]);
export const workflowStatusEnum = pgEnum("workflow_status", ["ACTIVE", "INACTIVE"]);
export const onboardingStatusEnum = pgEnum("onboarding_status", ["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"]);

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  orgId: text("org_id").references(() => organizations.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  granted: boolean("granted").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userPermissions: many(userPermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  permission: one(permissions, {
    fields: [userPermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const organizationMembers = pgTable("organization_members", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  role: text("role").default("MEMBER").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_org_members_user_org").on(table.userId, table.orgId),
]);
export const accounts = pgTable("accounts", {
  userId: text("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (table) => ({
  compoundKey: {
    primaryKey: [table.provider, table.providerAccountId],
  },
}));

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
}, (table) => ({
  compoundKey: {
    primaryKey: [table.identifier, table.token],
  },
}));
export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  role: text("role").default("MEMBER").notNull(),
  invitedBy: text("invited_by").references(() => users.id).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  managerId: text("manager_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "OTHER"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  password: text("password"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  gender: genderEnum("gender"),
  skills: text("skills").array(),
  experienceYears: decimal("experience_years"),
  joiningDate: date("joining_date"),
  dateOfBirth: date("date_of_birth"),
  taxId: text("tax_id"),
  bankDetails: jsonb("bank_details").$type<{
    accountNumber: string;
    bankName: string;
    branch: string;
    ifsc: string;
    accountHolder: string;
  }>(),
  image: text("image"),
  role: text("role").default("MEMBER").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  designation: text("designation"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  whatsappSameAsPhone: boolean("whatsapp_same_as_phone").default(true),
  monthlySalary: decimal("monthly_salary"),
  employeeId: text("employee_id"),
  metadata: jsonb("metadata"),
  isPasswordChangeRequired: boolean("is_password_change_required").default(false),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_email").on(table.email),
]);

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
]);

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
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").default("PENDING"),
  approverId: text("approver_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_leave_requests_user_id").on(table.userId),
  index("idx_leave_requests_org_status").on(table.orgId, table.status),
]);

export const onboardingSteps = pgTable("onboarding_steps", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  stepName: text("step_name").notNull(), 
  status: onboardingStatusEnum("status").default("PENDING"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
]);

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

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  key: text("key").notNull().unique(),
  clientId: text("client_id").references(() => users.id),
  managerId: text("manager_id").references(() => users.id),
  startDate: timestamp("start_date"),

  endDate: timestamp("end_date"),
  status: projectStatusEnum("status").default("ACTIVE"),
  settings: jsonb("settings").$type<{
    modules: {
        sprints: boolean;
        epics: boolean;
        timeTracking: boolean;
        wiki: boolean;
    }
  }>(),
});

export const sprints = pgTable("sprints", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  goal: text("goal"),
  status: text("status").default("PLANNED"),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("TASK"),
  status: text("status").notNull().default("TODO"),
  priority: ticketPriorityEnum("priority").default("MEDIUM"),
  projectId: integer("project_id").references(() => projects.id),
  ticketNumber: integer("ticket_number").notNull(),
  sprintId: integer("sprint_id").references(() => sprints.id),
  epicId: integer("epic_id"),
  assigneeId: text("assignee_id").references(() => users.id),
  reporterId: text("reporter_id").references(() => users.id),
  points: integer("points"),
  storyPoints: integer("story_points"), 
  link: text("link"),
  order: integer("order").default(0),
  parentTicketId: integer("parent_ticket_id"),
  originalEstimate: decimal("original_estimate"), 
  timeSpent: decimal("time_spent").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  epicReference: foreignKey({
      columns: [t.epicId],
      foreignColumns: [t.id]
  }),
  parentReference: foreignKey({
      columns: [t.parentTicketId],
      foreignColumns: [t.id]
  }),
  projectIdx: index("idx_tickets_project_id").on(t.projectId),
  assigneeIdx: index("idx_tickets_assignee_id").on(t.assigneeId),
  sprintIdx: index("idx_tickets_sprint_id").on(t.sprintId),
  orgStatusIdx: index("idx_tickets_org_status").on(t.orgId, t.status),
}));

export const projectStatuses = pgTable("project_statuses", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  role: text("role").default("CONTRIBUTOR"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_project_members_project_user").on(table.projectId, table.userId),
]);
export const ticketAssignees = pgTable("ticket_assignees", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow(),
  assignedBy: text("assigned_by").references(() => users.id),
}, (table) => [
  uniqueIndex("uniq_ticket_assignees_ticket_user").on(table.ticketId, table.userId),
  index("idx_ticket_assignees_user_id").on(table.userId),
]);

export const ticketComments = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ticketAttachments = pgTable("ticket_attachments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ticketLabels = pgTable("ticket_labels", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  color: text("color").default("#3B82F6"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ticketLabelMappings = pgTable("ticket_label_mappings", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  labelId: integer("label_id").references(() => ticketLabels.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: workflowStatusEnum("status").default("ACTIVE"),
  steps: jsonb("steps").$type<{ from: string; to: string; condition?: string }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id),
  ticketId: integer("ticket_id").references(() => tickets.id),
  date: date("date").notNull(),
  hours: decimal("hours").default("0"),
  description: text("description"),
  imageUrl: text("image_url"),
  workLink: text("work_link"),
  status: text("status").default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  isBillable: boolean("is_billable").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  config: jsonb("config").$type<{ filters: Record<string, unknown>; columns: string[] }>(),
  createdBy: text("created_by").references(() => users.id),
  isScheduled: boolean("is_scheduled").default(false),
  scheduleConfig: jsonb("schedule_config").$type<{ frequency: string; recipients: string[] }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id),
  type: notificationTypeEnum("type").default("INFO"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  targetUrl: text("target_url").notNull(),
  slug: text("slug").notNull().unique(),
  imageUrl: text("image_url").notNull(),
  scanCount: integer("scan_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wfhRequestStatusEnum = pgEnum("wfh_request_status", ["PENDING", "APPROVED", "REJECTED"]);

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

export const deviceStatusEnum = pgEnum("device_status", ["ACTIVE", "INACTIVE", "LOST", "RETURNED"]);

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

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  departments: many(departments),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [organizationMembers.orgId],
    references: [organizations.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  organizations: many(organizationMembers),
  accounts: many(accounts),
  sessions: many(sessions),
  assignedTickets: many(tickets, { relationName: "assignee" }),
  reportedTickets: many(tickets, { relationName: "reporter" }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tickets: many(tickets),
  manager: one(users, {
    fields: [projects.managerId],
    references: [users.id],
    relationName: "projectManager"
  }),
  client: one(users, {
    fields: [projects.clientId],
    references: [users.id],
    relationName: "projectClient"
  }),
  members: many(projectMembers),
  statuses: many(projectStatuses, { relationName: "projectStatuses" }),
}));

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, {
    fields: [sprints.projectId],
    references: [projects.id],
  }),
  tickets: many(tickets),
}));

export const projectStatusesRelations = relations(projectStatuses, ({ one }) => ({
  project: one(projects, {
    fields: [projectStatuses.projectId],
    references: [projects.id],
    relationName: "projectStatuses"
  }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  project: one(projects, {
    fields: [tickets.projectId],
    references: [projects.id],
  }),
  sprint: one(sprints, {
    fields: [tickets.sprintId],
    references: [sprints.id],
  }),
  assignee: one(users, {
    fields: [tickets.assigneeId],
    references: [users.id],
    relationName: "assignee",
  }),
  reporter: one(users, {
    fields: [tickets.reporterId],
    references: [users.id],
    relationName: "reporter",
  }),
  comments: many(ticketComments),
  attachments: many(ticketAttachments),
  labels: many(ticketLabelMappings),
  assignees: many(ticketAssignees),
}));

export const ticketAssigneesRelations = relations(ticketAssignees, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketAssignees.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketAssignees.userId],
    references: [users.id],
  }),
  assigner: one(users, {
    fields: [ticketAssignees.assignedBy],
    references: [users.id],
    relationName: "assigner",
  }),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketComments.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [ticketComments.userId],
    references: [users.id],
  }),
  parent: one(ticketComments, {
    fields: [ticketComments.parentCommentId],
    references: [ticketComments.id],
    relationName: "parentComment",
  }),
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketAttachments.ticketId],
    references: [tickets.id],
  }),
  uploader: one(users, {
    fields: [ticketAttachments.uploadedBy],
    references: [users.id],
  }),
}));

export const salaryStructuresRelations = relations(salaryStructures, ({ one }) => ({
  user: one(users, {
    fields: [salaryStructures.userId],
    references: [users.id],
  }),
}));

export const payrollsRelations = relations(payrolls, ({ one }) => ({
  user: one(users, {
    fields: [payrolls.userId],
    references: [users.id],
  }),
  generatedByUser: one(users, {
    fields: [payrolls.generatedBy],
    references: [users.id],
    relationName: "payrollGeneratedBy",
  }),
  approvedByUser: one(users, {
    fields: [payrolls.approvedBy],
    references: [users.id],
    relationName: "payrollApprovedBy",
  }),
}));

export const expenseCategoriesRelations = relations(expenseCategories, ({ many }) => ({
  expenses: many(expenses),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
    relationName: "expenseUser",
  }),
  approver: one(users, {
    fields: [expenses.approverId],
    references: [users.id],
    relationName: "expenseApprover",
  }),
  expenseCategory: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  project: one(projects, {
    fields: [expenses.projectId],
    references: [projects.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one }) => ({
  assignedUser: one(users, {
    fields: [assets.assignedTo],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
    relationName: "documentUploader",
  }),
  parent: one(documents, {
    fields: [documents.parentDocumentId],
    references: [documents.id],
  }),
}));

export const performanceReviewsRelations = relations(performanceReviews, ({ one }) => ({
  user: one(users, {
    fields: [performanceReviews.userId],
    references: [users.id],
    relationName: "reviewUser",
  }),
  reviewer: one(users, {
    fields: [performanceReviews.reviewerId],
    references: [users.id],
    relationName: "reviewReviewer",
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  parent: one(goals, {
    fields: [goals.parentGoalId],
    references: [goals.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const onboardingStepsRelations = relations(onboardingSteps, ({ one }) => ({
  user: one(users, {
    fields: [onboardingSteps.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [onboardingSteps.orgId],
    references: [organizations.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
   user: one(users, {
       fields: [leaveRequests.userId],
       references: [users.id],
   }),
   leaveType: one(leaveTypes, {
       fields: [leaveRequests.leaveTypeId],
       references: [leaveTypes.id],
   }),
   approver: one(users, {
       fields: [leaveRequests.approverId],
       references: [users.id],
       relationName: "leaveApprover"
   })
}));

export const leaveBalancesRelations = relations(leaveBalances, ({ one }) => ({
    leaveType: one(leaveTypes, {
        fields: [leaveBalances.leaveTypeId],
        references: [leaveTypes.id],
    })
}));

export const ticketLabelMappingsRelations = relations(ticketLabelMappings, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketLabelMappings.ticketId],
    references: [tickets.id],
  }),
  label: one(ticketLabels, {
    fields: [ticketLabelMappings.labelId],
    references: [ticketLabels.id],
  }),
}));

export const ticketLabelsRelations = relations(ticketLabels, ({ many }) => ({
  tickets: many(ticketLabelMappings),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  ticket: one(tickets, {
    fields: [timesheets.ticketId],
    references: [tickets.id],
  }),
  user: one(users, {
    fields: [timesheets.userId],
    references: [users.id],
  }),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  organization: one(organizations, {
    fields: [holidays.orgId],
    references: [organizations.id],
  }),
}));

export const wfhRequestsRelations = relations(wfhRequests, ({ one }) => ({
  user: one(users, {
    fields: [wfhRequests.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [wfhRequests.approverId],
    references: [users.id],
    relationName: "wfhApprover",
  }),
}));

export const employeeDevicesRelations = relations(employeeDevices, ({ one }) => ({
  user: one(users, {
    fields: [employeeDevices.userId],
    references: [users.id],
  }),
}));

export const leadPipelineStatusEnum = pgEnum("lead_pipeline_status", ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"]);
export const leadActivityTypeEnum = pgEnum("lead_activity_type", ["call", "email", "whatsapp", "meeting", "site_visit"]);
export const leadSourceEnum = pgEnum("lead_source", ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"]);
export const leadPriorityEnum = pgEnum("lead_priority", ["HOT", "WARM", "COLD"]);

export const departmentMembers = pgTable("department_members", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_dept_members_dept_user").on(table.departmentId, table.userId),
]);

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  source: leadSourceEnum("source").default("other"),
  campaignId: integer("campaign_id").references(() => crmCampaigns.id),
  status: leadPipelineStatusEnum("status").default("NEW").notNull(),
  priority: leadPriorityEnum("priority").default("WARM"),
  investmentInterest: decimal("investment_interest"),
  potentialValue: decimal("potential_value"),
  notes: text("notes"),
  assignedToId: text("assigned_to_id").references(() => users.id),
  assignedById: text("assigned_by_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  convertedAt: timestamp("converted_at"),
  lostReason: text("lost_reason"),
  company: text("company"),
  designation: text("designation"),
  city: text("city"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_leads_org_status").on(table.orgId, table.status),
  index("idx_leads_assigned_to").on(table.assignedToId),
]);

export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  type: leadActivityTypeEnum("type").notNull(),
  date: timestamp("date").notNull(),
  duration: integer("duration"),
  subject: text("subject"),
  location: text("location"),
  locationLink: text("location_link"),
  messageSummary: text("message_summary"),
  notes: text("notes"),
  outcome: text("outcome"),
  userId: text("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_activities_lead").on(table.leadId),
  index("idx_lead_activities_user").on(table.userId),
]);

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  designation: text("designation"),
  city: text("city"),
  investmentValue: decimal("investment_value"),
  status: text("status").default("active").notNull(),
  accountManagerId: text("account_manager_id").references(() => users.id),
  notes: text("notes"),
  convertedAt: timestamp("converted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_clients_org").on(table.orgId),
]);

export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  metricType: text("metric_type").notNull(),
  targetValue: decimal("target_value").notNull(),
  currentValue: decimal("current_value").default("0"),
  period: text("period").default("daily"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  setById: text("set_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_targets_user_period").on(table.userId, table.period),
]);

export const crmPersonRoleEnum = pgEnum("crm_person_role", ["sales_rep", "csm", "marketing"]);
export const crmHealthEnum = pgEnum("crm_health", ["healthy", "at_risk", "critical"]);
export const crmDealStageEnum = pgEnum("crm_deal_stage", ["Discovery", "Qualified", "Proposal", "Negotiation", "Closed Won"]);
export const crmCampaignStatusEnum = pgEnum("crm_campaign_status", ["active", "paused", "completed"]);
export const crmLeadStatusEnum = pgEnum("crm_lead_status", ["visitor", "lead", "mql", "sql", "opportunity"]);
export const crmSupportTicketStatusEnum = pgEnum("crm_support_ticket_status", ["new", "in_progress", "resolved", "closed"]);
export const crmSupportTicketPriorityEnum = pgEnum("crm_support_ticket_priority", ["critical", "high", "medium", "low"]);
export const crmActivityTypeEnum = pgEnum("crm_activity_type", ["deal_won", "meeting", "proposal", "call", "email", "ticket", "escalation"]);
export const crmEventStatusEnum = pgEnum("crm_event_status", ["planning", "confirmed", "completed"]);
export const crmPeople = pgTable("crm_people", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: crmPersonRoleEnum("role").notNull(),
  title: text("title").notNull(),
  department: text("department").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  joinDate: text("join_date"),
  bio: text("bio"),
  skills: text("skills").array(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const crmCompanies = pgTable("crm_companies", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  health: crmHealthEnum("health").default("healthy"),
  revenue: decimal("revenue").default("0"),
  renewalDate: date("renewal_date"),
  renewalValue: decimal("renewal_value").default("0"),
  customerSince: text("customer_since"),
  csmId: integer("csm_id").references(() => crmPeople.id),
  createdAt: timestamp("created_at").defaultNow(),
});
export const crmDeals = pgTable("crm_deals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  companyName: text("company_name").notNull(),
  value: decimal("value").notNull(),
  stage: crmDealStageEnum("stage").notNull(),
  probability: integer("probability").default(0),
  closeDate: date("close_date"),
  salesRepId: integer("sales_rep_id").references(() => crmPeople.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const crmCampaigns = pgTable("crm_campaigns", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  status: crmCampaignStatusEnum("status").default("active"),
  leads: integer("leads").default(0),
  spend: decimal("spend").default("0"),
  roi: decimal("roi").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const crmLeads = pgTable("crm_leads", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  campaignId: integer("campaign_id").references(() => crmCampaigns.id),
  email: text("email"),
  name: text("name"),
  status: crmLeadStatusEnum("status").default("lead"),
  channel: text("channel"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const crmContent = pgTable("crm_content", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  views: integer("views").default(0),
  leads: integer("leads").default(0),
  convRate: decimal("conv_rate").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const crmEvents = pgTable("crm_events", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  type: text("type").notNull(),
  status: crmEventStatusEnum("status").default("planning"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const crmActivities = pgTable("crm_activities", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  type: crmActivityTypeEnum("type").notNull(),
  message: text("message").notNull(),
  time: text("time").notNull(),
  person: text("person"),
  personId: integer("person_id").references(() => crmPeople.id),
  category: text("category").notNull().default("sales"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const crmSupportTickets = pgTable("crm_support_tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title"),
  priority: crmSupportTicketPriorityEnum("priority").default("medium"),
  status: crmSupportTicketStatusEnum("status").default("new"),
  assigneeId: integer("assignee_id").references(() => crmPeople.id),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});
export const crmMonthlyMetrics = pgTable("crm_monthly_metrics", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  month: text("month").notNull(),
  revenue: decimal("revenue").default("0"),
  mqls: integer("mqls").default(0),
  retention: decimal("retention").default("0"),
  csat: decimal("csat").default("0"),
  ticketVolume: integer("ticket_volume").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
export const crmTeamPerformance = pgTable("crm_team_performance", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  personId: integer("person_id").references(() => crmPeople.id).notNull(),
  month: text("month").notNull(),
  value: decimal("value").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export const crmSupportTeamMembers = pgTable("crm_support_team_members", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  access: text("access").notNull(),
  avatar: text("avatar").notNull(),
  status: text("status").default("online"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crmPeopleRelations = relations(crmPeople, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [crmPeople.orgId],
    references: [organizations.id],
  }),
  deals: many(crmDeals),
  managedCompanies: many(crmCompanies),
  activities: many(crmActivities),
  performance: many(crmTeamPerformance),
}));

export const crmCompaniesRelations = relations(crmCompanies, ({ one }) => ({
  organization: one(organizations, {
    fields: [crmCompanies.orgId],
    references: [organizations.id],
  }),
  csm: one(crmPeople, {
    fields: [crmCompanies.csmId],
    references: [crmPeople.id],
  }),
}));

export const crmDealsRelations = relations(crmDeals, ({ one }) => ({
  organization: one(organizations, {
    fields: [crmDeals.orgId],
    references: [organizations.id],
  }),
  salesRep: one(crmPeople, {
    fields: [crmDeals.salesRepId],
    references: [crmPeople.id],
  }),
}));

export const crmCampaignsRelations = relations(crmCampaigns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [crmCampaigns.orgId],
    references: [organizations.id],
  }),
  leads: many(crmLeads),
}));

export const crmLeadsRelations = relations(crmLeads, ({ one }) => ({
  organization: one(organizations, {
    fields: [crmLeads.orgId],
    references: [organizations.id],
  }),
  campaign: one(crmCampaigns, {
    fields: [crmLeads.campaignId],
    references: [crmCampaigns.id],
  }),
}));

export const crmActivitiesRelations = relations(crmActivities, ({ one }) => ({
  organization: one(organizations, {
    fields: [crmActivities.orgId],
    references: [organizations.id],
  }),
  crmPerson: one(crmPeople, {
    fields: [crmActivities.personId],
    references: [crmPeople.id],
  }),
}));

export const crmSupportTicketsRelations = relations(crmSupportTickets, ({ one }) => ({
  organization: one(organizations, {
    fields: [crmSupportTickets.orgId],
    references: [organizations.id],
  }),
  assignee: one(crmPeople, {
    fields: [crmSupportTickets.assigneeId],
    references: [crmPeople.id],
  }),
}));

export const crmTeamPerformanceRelations = relations(crmTeamPerformance, ({ one }) => ({
  organization: one(organizations, {
    fields: [crmTeamPerformance.orgId],
    references: [organizations.id],
  }),
  person: one(crmPeople, {
    fields: [crmTeamPerformance.personId],
    references: [crmPeople.id],
  }),
}));

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

export const leadsRelations = relations(leads, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [leads.orgId],
    references: [organizations.id],
  }),
  assignedTo: one(users, {
    fields: [leads.assignedToId],
    references: [users.id],
    relationName: "leadAssignee",
  }),
  assignedBy: one(users, {
    fields: [leads.assignedById],
    references: [users.id],
    relationName: "leadAssigner",
  }),
  campaign: one(crmCampaigns, {
    fields: [leads.campaignId],
    references: [crmCampaigns.id],
  }),
  activities: many(leadActivities),
}));

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, {
    fields: [leadActivities.leadId],
    references: [leads.id],
  }),
  user: one(users, {
    fields: [leadActivities.userId],
    references: [users.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  lead: one(leads, {
    fields: [clients.leadId],
    references: [leads.id],
  }),
  accountManager: one(users, {
    fields: [clients.accountManagerId],
    references: [users.id],
  }),
}));

export const targetsRelations = relations(targets, ({ one }) => ({
  user: one(users, {
    fields: [targets.userId],
    references: [users.id],
  }),
  setBy: one(users, {
    fields: [targets.setById],
    references: [users.id],
    relationName: "targetSetter",
  }),
}));

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  orgId: text("org_id").references(() => organizations.id),
  targetId: text("target_id"),
  targetType: text("target_type"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_audit_logs_user_id").on(table.userId),
  index("idx_audit_logs_org_id").on(table.orgId),
  index("idx_audit_logs_action").on(table.action),
  index("idx_audit_logs_created_at").on(table.createdAt),
]);
