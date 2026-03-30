import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, pgEnum, foreignKey, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
// Dynamic roles table — predefined: CEO, HR, SALES, ENGINEERING, DESIGN, etc.
// Admins can create additional roles at runtime
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),           // Display name e.g. "Engineering"
  slug: text("slug").notNull(),            // Lookup key e.g. "ENGINEERING"
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
  role: text("role").default("ENGINEERING").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_org_members_user_org").on(table.userId, table.orgId),
  index("idx_org_members_org_role").on(table.orgId, table.role),
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
  role: text("role").default("ENGINEERING").notNull(),
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
  role: text("role").default("ENGINEERING").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  designation: text("designation"),
  phone: text("phone"),
  whatsappNumber: text("whatsapp_number"),
  whatsappSameAsPhone: boolean("whatsapp_same_as_phone").default(true),
  monthlySalary: decimal("monthly_salary"),
  employeeId: text("employee_id"),
  metadata: jsonb("metadata"),
  isPasswordChangeRequired: boolean("is_password_change_required").default(false),
  loginAttempts: integer("login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  isActive: boolean("is_active").default(true).notNull(),
  hasDashboardAccess: boolean("has_dashboard_access").default(false).notNull(),
  reportingTo: text("reporting_to"),
  team: text("team"),
  emergencyContact: jsonb("emergency_contact").$type<{
    name: string;
    relation: string;
    phone: string;
    email?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_email").on(table.email),
  foreignKey({ columns: [table.reportingTo], foreignColumns: [table.id] }),
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
  index("idx_attendance_user_date").on(table.userId, table.date),
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
  status: leaveStatusEnum("status").default("PENDING"),
  approverId: text("approver_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  attachmentUrl: text("attachment_url"),
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
  index("idx_expenses_date").on(table.expenseDate),
  index("idx_expenses_category").on(table.categoryId),
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
  startDate: date("start_date"),
  dueDate: date("due_date"),
  stateId: integer("state_id"),
  moduleId: integer("module_id"),
  cycleId: integer("cycle_id"),
  sequenceId: text("sequence_id"),
  estimate: integer("estimate"),
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
}, (table) => [
  index("idx_timesheets_user_date").on(table.userId, table.date),
]);

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
  manager: one(users, {
    fields: [users.reportingTo],
    references: [users.id],
    relationName: "manager",
  }),
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
  state: one(customStates, {
    fields: [tickets.stateId],
    references: [customStates.id],
  }),
  module: one(modules, {
    fields: [tickets.moduleId],
    references: [modules.id],
  }),
  cycle: one(cycles, {
    fields: [tickets.cycleId],
    references: [cycles.id],
  }),
  comments: many(ticketComments),
  attachments: many(ticketAttachments),
  labels: many(ticketLabelMappings),
  assignees: many(ticketAssignees),
  relations: many(workItemRelations),
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
  verifiedById: text("verified_by_id").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  convertedAt: timestamp("converted_at"),
  lostReason: text("lost_reason"),
  company: text("company"),
  designation: text("designation"),
  city: text("city"),
  referredBy: text("referred_by"),
  tags: text("tags").array(),
  score: integer("score").default(0),
  slaDeadline: timestamp("sla_deadline"),
  website: text("website"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_leads_org_status").on(table.orgId, table.status),
  index("idx_leads_assigned_to").on(table.assignedToId),
  index("idx_leads_created_at").on(table.orgId, table.createdAt),
  index("idx_leads_source").on(table.source),
  index("idx_leads_score").on(table.score),
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

export const dealStageEnum = pgEnum("deal_stage", ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]);

export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id),
  clientId: integer("client_id").references(() => clients.id),
  name: text("name").notNull(),
  value: decimal("value").default("0"),
  stage: dealStageEnum("stage").default("LEAD").notNull(),
  probability: integer("probability").default(0),
  contactPerson: text("contact_person"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  assignedToId: text("assigned_to_id").references(() => users.id),
  lastContactDate: timestamp("last_contact_date"),
  expectedCloseDate: date("expected_close_date"),
  actualCloseDate: date("actual_close_date"),
  lostReason: text("lost_reason"),
  notes: text("notes"),
  linkedLeadId: integer("linked_lead_id").references(() => leads.id),
  linkedClientId: integer("linked_client_id").references(() => clients.id),
  slaDeadline: timestamp("sla_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_deals_org_stage").on(table.orgId, table.stage),
  index("idx_deals_assigned_to").on(table.assignedToId),
]);

/* ─── Deal Activities ─── */
export const dealActivityTypeEnum = pgEnum("deal_activity_type", ["stage_change", "note", "call", "email", "meeting", "document"]);

export const dealActivities = pgTable("deal_activities", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  dealId: integer("deal_id").references(() => deals.id, { onDelete: "cascade" }).notNull(),
  type: dealActivityTypeEnum("type").notNull(),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  subject: text("subject"),
  notes: text("notes"),
  duration: integer("duration"),
  userId: text("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_deal_activities_deal").on(table.dealId),
  index("idx_deal_activities_org").on(table.orgId),
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

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deals.orgId],
    references: [organizations.id],
  }),
  lead: one(leads, {
    fields: [deals.leadId],
    references: [leads.id],
  }),
  client: one(clients, {
    fields: [deals.clientId],
    references: [clients.id],
  }),
  assignedTo: one(users, {
    fields: [deals.assignedToId],
    references: [users.id],
  }),
  activities: many(dealActivities),
}));

export const dealActivitiesRelations = relations(dealActivities, ({ one }) => ({
  deal: one(deals, {
    fields: [dealActivities.dealId],
    references: [deals.id],
  }),
  user: one(users, {
    fields: [dealActivities.userId],
    references: [users.id],
  }),
}));

/* ─── Chat / Messaging ─── */

export const chatChannels = pgTable("chat_channels", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull().default("GROUP"), // DIRECT | GROUP
  description: text("description"),
  avatarUrl: text("avatar_url"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_chat_channels_org").on(table.orgId),
  index("idx_chat_channels_last_msg").on(table.orgId, table.lastMessageAt),
]);

export const chatChannelMembers = pgTable("chat_channel_members", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => chatChannels.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  role: text("role").default("MEMBER").notNull(), // ADMIN | MEMBER
  lastReadAt: timestamp("last_read_at").defaultNow(),
  joinedAt: timestamp("joined_at").defaultNow(),
  mutedUntil: timestamp("muted_until"),
}, (table) => [
  uniqueIndex("uniq_channel_member").on(table.channelId, table.userId),
  index("idx_chat_members_user").on(table.userId),
  index("idx_chat_members_channel").on(table.channelId),
]);

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => chatChannels.id, { onDelete: "cascade" }).notNull(),
  senderId: text("sender_id").references(() => users.id).notNull(),
  content: text("content"),
  replyToId: integer("reply_to_id"),
  isEdited: boolean("is_edited").default(false).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_chat_messages_channel").on(table.channelId, table.createdAt),
  index("idx_chat_messages_sender").on(table.senderId),
  index("idx_chat_messages_unread").on(table.channelId, table.createdAt, table.senderId, table.isDeleted),
]);

export const chatAttachments = pgTable("chat_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => chatMessages.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileKey: text("file_key").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_chat_attachments_msg").on(table.messageId),
]);

export const chatUserPresence = pgTable("chat_user_presence", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  status: text("status").default("OFFLINE").notNull(), // ONLINE | AWAY | OFFLINE
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_chat_presence_user").on(table.userId),
  index("idx_chat_presence_org").on(table.orgId, table.status),
  index("idx_chat_presence_lastseen").on(table.orgId, table.lastSeenAt),
]);

export const chatChannelsRelations = relations(chatChannels, ({ many, one }) => ({
  members: many(chatChannelMembers),
  messages: many(chatMessages),
  creator: one(users, { fields: [chatChannels.createdBy], references: [users.id] }),
}));

export const chatChannelMembersRelations = relations(chatChannelMembers, ({ one }) => ({
  channel: one(chatChannels, { fields: [chatChannelMembers.channelId], references: [chatChannels.id] }),
  user: one(users, { fields: [chatChannelMembers.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  channel: one(chatChannels, { fields: [chatMessages.channelId], references: [chatChannels.id] }),
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
  attachments: many(chatAttachments),
  replyTo: one(chatMessages, { fields: [chatMessages.replyToId], references: [chatMessages.id] }),
}));

export const chatAttachmentsRelations = relations(chatAttachments, ({ one }) => ({
  message: one(chatMessages, { fields: [chatAttachments.messageId], references: [chatMessages.id] }),
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

// ─── Invoices ───

export const invoiceStatusEnum = pgEnum("invoice_status", ["DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"]);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  projectId: integer("project_id").references(() => projects.id),
  invoiceNumber: text("invoice_number").notNull(),
  status: invoiceStatusEnum("status").default("DRAFT").notNull(),
  lineItems: jsonb("line_items").$type<{ description: string; quantity: number; rate: number; amount: number }[]>().default([]),
  subtotal: decimal("subtotal").default("0").notNull(),
  taxRate: decimal("tax_rate").default("0"),
  taxAmount: decimal("tax_amount").default("0"),
  discount: decimal("discount").default("0"),
  total: decimal("total").default("0").notNull(),
  currency: text("currency").default("INR").notNull(),
  dueDate: date("due_date"),
  notes: text("notes"),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_invoices_org_status").on(table.orgId, table.status),
  index("idx_invoices_client").on(table.clientId),
  index("idx_invoices_project").on(table.projectId),
  index("idx_invoices_due_date").on(table.dueDate),
]);

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, { fields: [invoices.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  creator: one(users, { fields: [invoices.createdBy], references: [users.id] }),
}));

// ─── Support Tickets ───

export const supportTicketStatusEnum = pgEnum("support_ticket_status", ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]);
export const supportTicketPriorityEnum = pgEnum("support_ticket_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  assigneeId: text("assignee_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  status: supportTicketStatusEnum("status").default("OPEN").notNull(),
  priority: supportTicketPriorityEnum("priority").default("MEDIUM").notNull(),
  slaDeadline: timestamp("sla_deadline"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_support_tickets_org_status").on(table.orgId, table.status),
  index("idx_support_tickets_assignee").on(table.assigneeId),
  index("idx_support_tickets_client").on(table.clientId),
  index("idx_support_tickets_priority").on(table.priority),
  index("idx_support_tickets_sla").on(table.slaDeadline),
]);

export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id, { onDelete: "cascade" }).notNull(),
  authorId: text("author_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  isInternal: boolean("is_internal").default(false).notNull(),
  attachments: jsonb("attachments").$type<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_support_ticket_messages_ticket").on(table.ticketId),
  index("idx_support_ticket_messages_author").on(table.authorId),
]);

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  organization: one(organizations, { fields: [supportTickets.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [supportTickets.clientId], references: [clients.id] }),
  assignee: one(users, { fields: [supportTickets.assigneeId], references: [users.id] }),
  creator: one(users, { fields: [supportTickets.createdBy], references: [users.id] }),
  messages: many(supportTicketMessages),
}));

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
  ticket: one(supportTickets, { fields: [supportTicketMessages.ticketId], references: [supportTickets.id] }),
  author: one(users, { fields: [supportTicketMessages.authorId], references: [users.id] }),
}));

export const stateGroupEnum = pgEnum("state_group", ["backlog", "unstarted", "started", "completed", "cancelled"]);
export const cycleStatusEnum = pgEnum("cycle_status", ["draft", "active", "completed"]);
export const moduleStatusEnum = pgEnum("module_status", ["backlog", "planned", "in-progress", "completed", "paused", "cancelled"]);
export const intakeStatusEnum = pgEnum("intake_status", ["pending", "accepted", "declined", "duplicate"]);
export const intakeSourceEnum = pgEnum("intake_source", ["manual", "web_form", "email"]);
export const workItemRelationTypeEnum = pgEnum("work_item_relation_type", ["blocks", "blocked_by", "duplicate_of", "relates_to"]);
export const viewLayoutEnum = pgEnum("view_layout", ["board", "list", "table", "calendar", "gantt"]);
export const leadEmailDirectionEnum = pgEnum("lead_email_direction", ["sent", "received"]);
export const leadTaskStatusEnum = pgEnum("lead_task_status", ["open", "done"]);
export const scoringOperatorEnum = pgEnum("scoring_operator", ["eq", "gt", "lt", "contains", "in"]);
export const assignmentRuleTypeEnum = pgEnum("assignment_rule_type", ["assign_user", "round_robin"]);
export const slaAppliesToEnum = pgEnum("sla_applies_to", ["lead", "deal", "both"]);
export const slaPriorityEnum = pgEnum("sla_priority", ["low", "medium", "high", "urgent"]);
export const orgSizeEnum = pgEnum("org_size", ["1-10", "11-50", "51-200", "201-1000", "1000+"]);

export const customStates = pgTable("custom_states", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3B82F6"),
  group: stateGroupEnum("group").notNull(),
  sequence: integer("sequence").notNull().default(0),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_custom_states_project").on(table.projectId),
  index("idx_custom_states_org").on(table.orgId),
]);

export const customStatesRelations = relations(customStates, ({ one, many }) => ({
  project: one(projects, { fields: [customStates.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [customStates.orgId], references: [organizations.id] }),
  tickets: many(tickets),
}));

export const cycles = pgTable("cycles", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: cycleStatusEnum("status").default("draft").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_cycles_project").on(table.projectId),
  index("idx_cycles_org_status").on(table.orgId, table.status),
]);

export const cyclesRelations = relations(cycles, ({ one, many }) => ({
  project: one(projects, { fields: [cycles.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [cycles.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [cycles.createdBy], references: [users.id] }),
  tickets: many(tickets),
}));

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: moduleStatusEnum("status").default("backlog").notNull(),
  leadId: text("lead_id").references(() => users.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_modules_project").on(table.projectId),
  index("idx_modules_org").on(table.orgId),
]);

export const modulesRelations = relations(modules, ({ one, many }) => ({
  project: one(projects, { fields: [modules.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [modules.orgId], references: [organizations.id] }),
  lead: one(users, { fields: [modules.leadId], references: [users.id], relationName: "moduleLead" }),
  creator: one(users, { fields: [modules.createdBy], references: [users.id], relationName: "moduleCreator" }),
  tickets: many(tickets),
  links: many(moduleLinks),
}));

export const moduleLinks = pgTable("module_links", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "cascade" }).notNull(),
  linkedModuleId: integer("linked_module_id").references(() => modules.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_module_links").on(table.moduleId, table.linkedModuleId),
]);

export const moduleLinksRelations = relations(moduleLinks, ({ one }) => ({
  module: one(modules, { fields: [moduleLinks.moduleId], references: [modules.id] }),
  linkedModule: one(modules, { fields: [moduleLinks.linkedModuleId], references: [modules.id] }),
}));

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  content: jsonb("content"),
  icon: text("icon"),
  coverImage: text("cover_image"),
  isPublic: boolean("is_public").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  parentPageId: integer("parent_page_id"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pages_project").on(table.projectId),
  index("idx_pages_org").on(table.orgId),
  foreignKey({ columns: [table.parentPageId], foreignColumns: [table.id] }),
]);

export const pagesRelations = relations(pages, ({ one, many }) => ({
  project: one(projects, { fields: [pages.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [pages.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [pages.createdBy], references: [users.id] }),
  parent: one(pages, { fields: [pages.parentPageId], references: [pages.id], relationName: "parentPage" }),
  children: many(pages, { relationName: "parentPage" }),
}));

export const intakeItems = pgTable("intake_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: jsonb("description"),
  source: intakeSourceEnum("source").default("manual").notNull(),
  status: intakeStatusEnum("status").default("pending").notNull(),
  submitterEmail: text("submitter_email"),
  linkedWorkItemId: integer("linked_work_item_id").references(() => tickets.id),
  declineReason: text("decline_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_intake_items_project").on(table.projectId),
  index("idx_intake_items_org_status").on(table.orgId, table.status),
]);

export const intakeItemsRelations = relations(intakeItems, ({ one }) => ({
  project: one(projects, { fields: [intakeItems.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [intakeItems.orgId], references: [organizations.id] }),
  linkedWorkItem: one(tickets, { fields: [intakeItems.linkedWorkItemId], references: [tickets.id] }),
}));

export const workItemRelations = pgTable("work_item_relations", {
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  relatedWorkItemId: integer("related_work_item_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  relationType: workItemRelationTypeEnum("relation_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_work_item_relation").on(table.workItemId, table.relatedWorkItemId),
  index("idx_work_item_relations_item").on(table.workItemId),
  index("idx_work_item_relations_related").on(table.relatedWorkItemId),
]);

export const workItemRelationsRelations = relations(workItemRelations, ({ one }) => ({
  workItem: one(tickets, { fields: [workItemRelations.workItemId], references: [tickets.id] }),
  relatedWorkItem: one(tickets, { fields: [workItemRelations.relatedWorkItemId], references: [tickets.id] }),
}));

export const projectViews = pgTable("project_views", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  name: text("name").notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>().default({}),
  groupBy: text("group_by"),
  orderBy: text("order_by"),
  layoutType: viewLayoutEnum("layout_type").default("board").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_project_views_project").on(table.projectId),
  index("idx_project_views_org").on(table.orgId),
]);

export const projectViewsRelations = relations(projectViews, ({ one }) => ({
  project: one(projects, { fields: [projectViews.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [projectViews.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [projectViews.createdBy], references: [users.id] }),
}));

export const leadNotes = pgTable("lead_notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  authorId: text("author_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_notes_lead").on(table.leadId),
]);

export const leadNotesRelations = relations(leadNotes, ({ one }) => ({
  lead: one(leads, { fields: [leadNotes.leadId], references: [leads.id] }),
  author: one(users, { fields: [leadNotes.authorId], references: [users.id] }),
}));

export const leadTasks = pgTable("lead_tasks", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  dueDate: date("due_date"),
  assigneeId: text("assignee_id").references(() => users.id),
  status: leadTaskStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_tasks_lead").on(table.leadId),
]);

export const leadTasksRelations = relations(leadTasks, ({ one }) => ({
  lead: one(leads, { fields: [leadTasks.leadId], references: [leads.id] }),
  assignee: one(users, { fields: [leadTasks.assigneeId], references: [users.id] }),
}));

export const leadEmails = pgTable("lead_emails", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  direction: leadEmailDirectionEnum("direction").notNull(),
  subject: text("subject"),
  body: text("body"),
  fromEmail: text("from_email").notNull(),
  toEmail: text("to_email").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  messageId: text("message_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_emails_lead").on(table.leadId),
]);

export const leadEmailsRelations = relations(leadEmails, ({ one }) => ({
  lead: one(leads, { fields: [leadEmails.leadId], references: [leads.id] }),
}));

export const crmEmailTemplates = pgTable("crm_email_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_crm_email_templates_org").on(table.orgId),
]);

export const crmEmailTemplatesRelations = relations(crmEmailTemplates, ({ one }) => ({
  organization: one(organizations, { fields: [crmEmailTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [crmEmailTemplates.createdBy], references: [users.id] }),
}));

export const leadScoringRules = pgTable("lead_scoring_rules", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  field: text("field").notNull(),
  operator: scoringOperatorEnum("operator").notNull(),
  value: text("value").notNull(),
  points: integer("points").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_scoring_rules_org").on(table.orgId),
]);

export const leadScoringRulesRelations = relations(leadScoringRules, ({ one }) => ({
  organization: one(organizations, { fields: [leadScoringRules.orgId], references: [organizations.id] }),
}));

export const leadAssignmentRules = pgTable("lead_assignment_rules", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  conditions: jsonb("conditions").$type<{ field: string; operator: string; value: string }[]>().default([]),
  assignmentType: assignmentRuleTypeEnum("assignment_type").notNull(),
  assignToUserId: text("assign_to_user_id").references(() => users.id),
  roundRobinUserIds: jsonb("round_robin_user_ids").$type<string[]>().default([]),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_lead_assignment_rules_org").on(table.orgId),
]);

export const leadAssignmentRulesRelations = relations(leadAssignmentRules, ({ one }) => ({
  organization: one(organizations, { fields: [leadAssignmentRules.orgId], references: [organizations.id] }),
  assignToUser: one(users, { fields: [leadAssignmentRules.assignToUserId], references: [users.id] }),
}));

export const assignmentRuleState = pgTable("assignment_rule_state", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").references(() => leadAssignmentRules.id, { onDelete: "cascade" }).notNull().unique(),
  lastAssignedIndex: integer("last_assigned_index").default(0).notNull(),
});

export const assignmentRuleStateRelations = relations(assignmentRuleState, ({ one }) => ({
  rule: one(leadAssignmentRules, { fields: [assignmentRuleState.ruleId], references: [leadAssignmentRules.id] }),
}));

export const crmSla = pgTable("crm_sla_policies", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  appliesTo: slaAppliesToEnum("applies_to").notNull(),
  priority: slaPriorityEnum("priority").notNull(),
  firstResponseHours: integer("first_response_hours").notNull(),
  resolutionHours: integer("resolution_hours").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_sla_org").on(table.orgId),
]);

export const crmSlaRelations = relations(crmSla, ({ one }) => ({
  organization: one(organizations, { fields: [crmSla.orgId], references: [organizations.id] }),
}));

export const crmViews = pgTable("crm_views", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  name: text("name").notNull(),
  entityType: text("entity_type").notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>().default({}),
  sortBy: text("sort_by"),
  sortDir: text("sort_dir").default("asc"),
  isPublic: boolean("is_public").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_crm_views_org").on(table.orgId),
]);

export const crmViewsRelations = relations(crmViews, ({ one }) => ({
  organization: one(organizations, { fields: [crmViews.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [crmViews.createdBy], references: [users.id] }),
}));

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  department: text("department"),
  company: text("company"),
  organizationId: integer("organization_id").references(() => crmOrganizations.id),
  linkedinUrl: text("linkedin_url"),
  twitterUrl: text("twitter_url"),
  avatarUrl: text("avatar_url"),
  leadId: integer("lead_id").references(() => leads.id),
  dealId: integer("deal_id").references(() => deals.id),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_contacts_org").on(table.orgId),
  index("idx_contacts_organization").on(table.organizationId),
]);

export const crmOrganizations = pgTable("crm_organizations", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  domain: text("domain"),
  industry: text("industry"),
  size: orgSizeEnum("size"),
  website: text("website"),
  linkedinUrl: text("linkedin_url"),
  description: text("description"),
  healthScore: integer("health_score"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_crm_organizations_org").on(table.orgId),
]);

export const contactsRelations = relations(contacts, ({ one }) => ({
  organization: one(organizations, { fields: [contacts.orgId], references: [organizations.id] }),
  crmOrganization: one(crmOrganizations, { fields: [contacts.organizationId], references: [crmOrganizations.id] }),
  lead: one(leads, { fields: [contacts.leadId], references: [leads.id] }),
  deal: one(deals, { fields: [contacts.dealId], references: [deals.id] }),
}));

export const crmOrganizationsRelations = relations(crmOrganizations, ({ one, many }) => ({
  org: one(organizations, { fields: [crmOrganizations.orgId], references: [organizations.id] }),
  contacts: many(contacts),
}));

export const invoiceAiExtractions = pgTable("invoice_ai_extractions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id),
  fileUrl: text("file_url").notNull(),
  extractedData: jsonb("extracted_data").$type<{
    vendor: string;
    invoiceNumber: string;
    date: string;
    dueDate: string;
    lineItems: { description: string; qty: number; rate: number; amount: number }[];
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
  }>(),
  status: text("status").default("pending").notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_invoice_ai_extractions_org").on(table.orgId),
]);

export const invoiceAiExtractionsRelations = relations(invoiceAiExtractions, ({ one }) => ({
  organization: one(organizations, { fields: [invoiceAiExtractions.orgId], references: [organizations.id] }),
  invoice: one(invoices, { fields: [invoiceAiExtractions.invoiceId], references: [invoices.id] }),
  creator: one(users, { fields: [invoiceAiExtractions.createdBy], references: [users.id] }),
}));
