import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["OWNER", "ADMIN", "MEMBER", "CLIENT"]);
export const ticketTypeEnum = pgEnum("ticket_type", ["EPIC", "STORY", "TASK", "BUG"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const projectStatusEnum = pgEnum("project_status", ["ACTIVE", "COMPLETED", "ARCHIVED"]);
export const leaveStatusEnum = pgEnum("leave_status", ["PENDING", "APPROVED", "REJECTED"]);
export const payrollStatusEnum = pgEnum("payroll_status", ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PAID"]);

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
  month: text("month").notNull(), // "2024-01"
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
  epicId: integer("epic_id").references(() => tickets.id),
  assigneeId: text("assignee_id").references(() => users.id),
  reporterId: text("reporter_id").references(() => users.id),
  points: integer("points"),
  originalEstimate: decimal("original_estimate"), 
  timeSpent: decimal("time_spent").default("0"),
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

// --- Relations ---

export const usersRelations = relations(users, ({ one, many }) => ({
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  assignedTickets: many(tickets, { relationName: "assignee" }),
  reportedTickets: many(tickets, { relationName: "reporter" }),
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
}));
