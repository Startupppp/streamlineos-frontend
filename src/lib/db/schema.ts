import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, pgEnum, foreignKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["OWNER", "ADMIN", "MEMBER", "CLIENT"]);
export const ticketTypeEnum = pgEnum("ticket_type", ["EPIC", "STORY", "TASK", "BUG"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const projectStatusEnum = pgEnum("project_status", ["ACTIVE", "COMPLETED", "ARCHIVED"]);
export const leaveStatusEnum = pgEnum("leave_status", ["PENDING", "APPROVED", "REJECTED"]);
export const payrollStatusEnum = pgEnum("payroll_status", ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PAID"]);
export const expenseStatusEnum = pgEnum("expense_status", ["PENDING", "APPROVED", "REJECTED", "PAID"]);
export const assetStatusEnum = pgEnum("asset_status", ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"]);
export const documentTypeEnum = pgEnum("document_type", ["CONTRACT", "CERTIFICATE", "ID", "PAYSLIP", "OTHER"]);
export const reviewStatusEnum = pgEnum("review_status", ["DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"]);
export const notificationTypeEnum = pgEnum("notification_type", ["INFO", "SUCCESS", "WARNING", "ERROR"]);
export const workflowStatusEnum = pgEnum("workflow_status", ["ACTIVE", "INACTIVE"]);

// --- RBAC Tables ---

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
  role: roleEnum("role").notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  orgId: text("org_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  permissionId: integer("permission_id").references(() => permissions.id).notNull(),
  orgId: text("org_id").notNull(),
  granted: boolean("granted").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Core Tables ---

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  managerId: text("manager_id"), // Relation defined below
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk User ID
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  // Note: Role is now primarily managed by Clerk Organization, but we keep this for caching/display if needed, 
  // or for global system roles.
  role: roleEnum("role").default("MEMBER").notNull(),
  
  // For MVP, we allow linking to ONE department here. 
  // In a complex multi-org setup, this should be in a separate 'members' table.
  departmentId: integer("department_id").references(() => departments.id),
  
  designation: text("designation"),
  phone: text("phone"),
  metadata: jsonb("metadata"), 
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- HR Module ---

export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const leaveTypes = pgTable("leave_types", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(), 
  daysPerYear: integer("days_per_year").notNull(),
  carryForward: boolean("carry_forward").default(false),
});

export const leaveBalances = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id),
  balance: decimal("balance").default("0").notNull(),
  year: integer("year").notNull(),
});

export const leaveRequests = pgTable("leave_requests", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  leaveTypeId: integer("leave_type_id").references(() => leaveTypes.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").default("PENDING"),
  approverId: text("approver_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrolls = pgTable("payrolls", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
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
  payslipUrl: text("payslip_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salaryStructures = pgTable("salary_structures", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
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

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  amount: decimal("amount").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  status: expenseStatusEnum("status").default("PENDING"),
  approverId: text("approver_id").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  expenseDate: date("expense_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
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
  orgId: text("org_id").notNull(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  type: documentTypeEnum("type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  version: integer("version").default(1),
  parentDocumentId: integer("parent_document_id").references(() => documents.id),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const performanceReviews = pgTable("performance_reviews", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
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
  orgId: text("org_id").notNull(),
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
  parentGoalId: integer("parent_goal_id").references(() => goals.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const helpdeskTickets = pgTable("helpdesk_tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
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

// --- CRM / Project Management ---

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  clientId: text("client_id").references(() => users.id),
  managerId: text("manager_id").references(() => users.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: projectStatusEnum("status").default("ACTIVE"),
});

export const sprints = pgTable("sprints", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  projectId: integer("project_id").references(() => projects.id),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  goal: text("goal"),
  status: text("status").default("PLANNED"),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: ticketTypeEnum("type").default("TASK"),
  status: ticketStatusEnum("status").default("TODO"),
  priority: ticketPriorityEnum("priority").default("MEDIUM"),
  projectId: integer("project_id").references(() => projects.id),
  sprintId: integer("sprint_id").references(() => sprints.id),
  epicId: integer("epic_id"),
  assigneeId: text("assignee_id").references(() => users.id),
  reporterId: text("reporter_id").references(() => users.id),
  points: integer("points"),
  originalEstimate: decimal("original_estimate"), 
  timeSpent: decimal("time_spent").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  epicReference: foreignKey({
      columns: [t.epicId],
      foreignColumns: [t.id]
  })
}));

export const ticketComments = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id").references(() => ticketComments.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ticketAttachments = pgTable("ticket_attachments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
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
  orgId: text("org_id").notNull(),
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
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: workflowStatusEnum("status").default("ACTIVE"),
  steps: jsonb("steps").$type<{ from: string; to: string; condition?: string }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
  userId: text("user_id").references(() => users.id),
  ticketId: integer("ticket_id").references(() => tickets.id),
  date: date("date").notNull(),
  hours: decimal("hours").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),
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
  orgId: text("org_id").notNull(),
  userId: text("user_id").references(() => users.id),
  type: notificationTypeEnum("type").default("INFO"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- Relations ---

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  assignedTickets: many(tickets, { relationName: "assignee" }),
  reportedTickets: many(tickets, { relationName: "reporter" }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  tickets: many(tickets),
}));

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, {
    fields: [sprints.projectId],
    references: [projects.id],
  }),
  tickets: many(tickets),
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
