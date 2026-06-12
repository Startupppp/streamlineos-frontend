
import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, foreignKey, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  ticketTypeEnum, ticketPriorityEnum, projectStatusEnum,
  stateGroupEnum, cycleStatusEnum, moduleStatusEnum,
  intakeStatusEnum, intakeSourceEnum, workItemRelationTypeEnum, viewLayoutEnum,
} from "./enums";
import { organizations, users } from "./auth";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  key: text("key").notNull().unique(),
  clientId: text("client_id").references(() => users.id),
  managerId: text("manager_id").references(() => users.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: projectStatusEnum("status").default("ACTIVE").notNull(),
  dealId: integer("deal_id"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  settings: jsonb("settings").$type<{
    modules: {
      sprints: boolean;
      epics: boolean;
      timeTracking: boolean;
      wiki: boolean;
    };
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_projects_org_status").on(table.orgId, table.status),
  index("idx_projects_manager").on(table.managerId),
]);

export const sprints = pgTable("sprints", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  goal: text("goal"),
  status: text("status").default("PLANNED").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_sprints_project_status").on(table.projectId, table.status),
]);

export const customStates = pgTable("custom_states", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#3B82F6"),
  group: stateGroupEnum("group").notNull(),
  sequence: integer("sequence").notNull().default(0),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_custom_states_project").on(table.projectId),
  index("idx_custom_states_org").on(table.orgId),
]);

export const cycles = pgTable("cycles", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: cycleStatusEnum("status").default("draft").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_cycles_project").on(table.projectId),
  index("idx_cycles_org_status").on(table.orgId, table.status),
]);

export const modules = pgTable("modules", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: moduleStatusEnum("status").default("backlog").notNull(),
  leadId: text("lead_id").references(() => users.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_modules_project").on(table.projectId),
  index("idx_modules_org").on(table.orgId),
]);

export const moduleLinks = pgTable("module_links", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "cascade" }).notNull(),
  linkedModuleId: integer("linked_module_id").references(() => modules.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_module_links").on(table.moduleId, table.linkedModuleId),
]);

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: ticketTypeEnum("type").default("TASK").notNull(),
  status: text("status").notNull().default("TODO"),
  priority: ticketPriorityEnum("priority").default("MEDIUM").notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  ticketNumber: integer("ticket_number").notNull(),
  sprintId: integer("sprint_id").references(() => sprints.id, { onDelete: "set null" }),
  epicId: integer("epic_id"),
  assigneeId: text("assignee_id").references(() => users.id, { onDelete: "set null" }),
  reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
  points: integer("points"),
  storyPoints: integer("story_points"),
  link: text("link"),
  order: integer("order").default(0).notNull(),
  parentTicketId: integer("parent_ticket_id"),
  originalEstimate: decimal("original_estimate", { precision: 10, scale: 2 }),
  timeSpent: decimal("time_spent", { precision: 10, scale: 2 }).default("0").notNull(),
  startDate: date("start_date"),
  dueDate: date("due_date"),
  stateId: integer("state_id").references(() => customStates.id, { onDelete: "set null" }),
  moduleId: integer("module_id").references(() => modules.id, { onDelete: "set null" }),
  cycleId: integer("cycle_id").references(() => cycles.id, { onDelete: "set null" }),
  sequenceId: text("sequence_id"),
  estimate: integer("estimate"),
  completionPercentage: integer("completion_percentage").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  foreignKey({ columns: [t.epicId], foreignColumns: [t.id] }).onDelete("set null"),
  foreignKey({ columns: [t.parentTicketId], foreignColumns: [t.id] }).onDelete("set null"),
  uniqueIndex("uniq_tickets_project_number").on(t.projectId, t.ticketNumber),
  index("idx_tickets_project_status").on(t.projectId, t.status),
  index("idx_tickets_assignee").on(t.assigneeId),
  index("idx_tickets_sprint").on(t.sprintId),
  index("idx_tickets_org_status_priority").on(t.orgId, t.status, t.priority),
]);

export const projectStatuses = pgTable("project_statuses", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_project_statuses_project").on(table.projectId),
]);

export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("CONTRIBUTOR").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).default("0").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_project_members_project_user").on(table.projectId, table.userId),
  index("idx_project_members_user").on(table.userId),
]);

export const ticketAssignees = pgTable("ticket_assignees", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  assignedBy: text("assigned_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  uniqueIndex("uniq_ticket_assignees_ticket_user").on(table.ticketId, table.userId),
  index("idx_ticket_assignees_user_id").on(table.userId),
]);

export const ticketComments = pgTable("ticket_comments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  foreignKey({ columns: [table.parentCommentId], foreignColumns: [table.id] }).onDelete("cascade"),
  index("idx_ticket_comments_ticket").on(table.ticketId),
]);

export const ticketAttachments = pgTable("ticket_attachments", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type"),
  uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_ticket_attachments_ticket").on(table.ticketId),
]);

export const ticketLabels = pgTable("ticket_labels", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  color: text("color").default("#3B82F6").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_ticket_labels_org_name").on(table.orgId, table.name),
]);

export const ticketLabelMappings = pgTable("ticket_label_mappings", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  labelId: integer("label_id").references(() => ticketLabels.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_ticket_label_mappings_ticket_label").on(table.ticketId, table.labelId),
]);

export const ticketWatchers = pgTable("ticket_watchers", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_ticket_watcher").on(table.ticketId, table.userId),
  index("idx_ticket_watchers_user").on(table.userId),
]);

export const workItemRelations = pgTable("work_item_relations", {
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  relatedWorkItemId: integer("related_work_item_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  relationType: workItemRelationTypeEnum("relation_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_work_item_relation").on(table.workItemId, table.relatedWorkItemId),
  index("idx_work_item_relations_item").on(table.workItemId),
  index("idx_work_item_relations_related").on(table.relatedWorkItemId),
]);

export const projectViews = pgTable("project_views", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  createdBy: text("created_by").references(() => users.id).notNull(),
  name: text("name").notNull(),
  filters: jsonb("filters").$type<Record<string, unknown>>().default({}).notNull(),
  groupBy: text("group_by"),
  orderBy: text("order_by"),
  layoutType: viewLayoutEnum("layout_type").default("board").notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_project_views_project").on(table.projectId),
  index("idx_project_views_org").on(table.orgId),
]);

export const intakeItems = pgTable("intake_items", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: jsonb("description"),
  source: intakeSourceEnum("source").default("manual").notNull(),
  status: intakeStatusEnum("status").default("pending").notNull(),
  submitterEmail: text("submitter_email"),
  linkedWorkItemId: integer("linked_work_item_id").references(() => tickets.id, { onDelete: "set null" }),
  declineReason: text("decline_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_intake_items_project").on(table.projectId),
  index("idx_intake_items_org_status").on(table.orgId, table.status),
]);

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  content: jsonb("content"),
  icon: text("icon"),
  coverImage: text("cover_image"),
  isPublic: boolean("is_public").default(false).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  parentPageId: integer("parent_page_id"),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  foreignKey({ columns: [table.parentPageId], foreignColumns: [table.id] }).onDelete("cascade"),
  index("idx_pages_project").on(table.projectId),
  index("idx_pages_org").on(table.orgId),
]);

export const timesheets = pgTable("timesheets", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
  date: date("date").notNull(),
  hours: decimal("hours", { precision: 6, scale: 2 }).default("0").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  workLink: text("work_link"),
  status: text("status").default("PENDING").notNull(),
  approvedBy: text("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  isBillable: boolean("is_billable").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_timesheets_user_date").on(table.userId, table.date),
  index("idx_timesheets_org_status").on(table.orgId, table.status),
]);

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  config: jsonb("config").$type<{ filters: Record<string, unknown>; columns: string[] }>(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  isScheduled: boolean("is_scheduled").default(false).notNull(),
  scheduleConfig: jsonb("schedule_config").$type<{ frequency: string; recipients: string[] }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_reports_org_type").on(table.orgId, table.type),
]);

export const projectMilestones = pgTable("project_milestones", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targetDate: date("target_date").notNull(),
  status: text("status").notNull().default("PENDING"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_project_milestones_project").on(table.projectId),
  index("idx_project_milestones_org").on(table.orgId),
]);

export const projectMilestonesRelations = relations(projectMilestones, ({ one }) => ({
  project: one(projects, { fields: [projectMilestones.projectId], references: [projects.id] }),
  creator: one(users, { fields: [projectMilestones.createdBy], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tickets: many(tickets),
  manager: one(users, { fields: [projects.managerId], references: [users.id], relationName: "projectManager" }),
  client: one(users, { fields: [projects.clientId], references: [users.id], relationName: "projectClient" }),
  members: many(projectMembers),
  statuses: many(projectStatuses, { relationName: "projectStatuses" }),
  milestones: many(projectMilestones),
}));

export const sprintsRelations = relations(sprints, ({ one, many }) => ({
  project: one(projects, { fields: [sprints.projectId], references: [projects.id] }),
  tickets: many(tickets),
}));

export const projectStatusesRelations = relations(projectStatuses, ({ one }) => ({
  project: one(projects, { fields: [projectStatuses.projectId], references: [projects.id], relationName: "projectStatuses" }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  project: one(projects, { fields: [tickets.projectId], references: [projects.id] }),
  sprint: one(sprints, { fields: [tickets.sprintId], references: [sprints.id] }),
  assignee: one(users, { fields: [tickets.assigneeId], references: [users.id], relationName: "assignee" }),
  reporter: one(users, { fields: [tickets.reporterId], references: [users.id], relationName: "reporter" }),
  state: one(customStates, { fields: [tickets.stateId], references: [customStates.id] }),
  module: one(modules, { fields: [tickets.moduleId], references: [modules.id] }),
  cycle: one(cycles, { fields: [tickets.cycleId], references: [cycles.id] }),
  comments: many(ticketComments),
  attachments: many(ticketAttachments),
  labels: many(ticketLabelMappings),
  assignees: many(ticketAssignees),
  watchers: many(ticketWatchers),
  relations: many(workItemRelations),
}));

export const ticketAssigneesRelations = relations(ticketAssignees, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketAssignees.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketAssignees.userId], references: [users.id] }),
  assigner: one(users, { fields: [ticketAssignees.assignedBy], references: [users.id], relationName: "assigner" }),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketComments.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketComments.userId], references: [users.id] }),
  parent: one(ticketComments, { fields: [ticketComments.parentCommentId], references: [ticketComments.id], relationName: "parentComment" }),
}));

export const ticketAttachmentsRelations = relations(ticketAttachments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketAttachments.ticketId], references: [tickets.id] }),
  uploader: one(users, { fields: [ticketAttachments.uploadedBy], references: [users.id] }),
}));

export const ticketLabelMappingsRelations = relations(ticketLabelMappings, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketLabelMappings.ticketId], references: [tickets.id] }),
  label: one(ticketLabels, { fields: [ticketLabelMappings.labelId], references: [ticketLabels.id] }),
}));

export const ticketLabelsRelations = relations(ticketLabels, ({ many }) => ({
  tickets: many(ticketLabelMappings),
}));

export const customStatesRelations = relations(customStates, ({ one, many }) => ({
  project: one(projects, { fields: [customStates.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [customStates.orgId], references: [organizations.id] }),
  tickets: many(tickets),
}));

export const cyclesRelations = relations(cycles, ({ one, many }) => ({
  project: one(projects, { fields: [cycles.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [cycles.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [cycles.createdBy], references: [users.id] }),
  tickets: many(tickets),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  project: one(projects, { fields: [modules.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [modules.orgId], references: [organizations.id] }),
  lead: one(users, { fields: [modules.leadId], references: [users.id], relationName: "moduleLead" }),
  creator: one(users, { fields: [modules.createdBy], references: [users.id], relationName: "moduleCreator" }),
  tickets: many(tickets),
  links: many(moduleLinks),
}));

export const moduleLinksRelations = relations(moduleLinks, ({ one }) => ({
  module: one(modules, { fields: [moduleLinks.moduleId], references: [modules.id] }),
  linkedModule: one(modules, { fields: [moduleLinks.linkedModuleId], references: [modules.id] }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  project: one(projects, { fields: [pages.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [pages.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [pages.createdBy], references: [users.id] }),
  parent: one(pages, { fields: [pages.parentPageId], references: [pages.id], relationName: "parentPage" }),
  children: many(pages, { relationName: "parentPage" }),
}));

export const intakeItemsRelations = relations(intakeItems, ({ one }) => ({
  project: one(projects, { fields: [intakeItems.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [intakeItems.orgId], references: [organizations.id] }),
  linkedWorkItem: one(tickets, { fields: [intakeItems.linkedWorkItemId], references: [tickets.id] }),
}));

export const workItemRelationsRelations = relations(workItemRelations, ({ one }) => ({
  workItem: one(tickets, { fields: [workItemRelations.workItemId], references: [tickets.id] }),
  relatedWorkItem: one(tickets, { fields: [workItemRelations.relatedWorkItemId], references: [tickets.id] }),
}));

export const projectViewsRelations = relations(projectViews, ({ one }) => ({
  project: one(projects, { fields: [projectViews.projectId], references: [projects.id] }),
  organization: one(organizations, { fields: [projectViews.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [projectViews.createdBy], references: [users.id] }),
}));

export const ticketWatchersRelations = relations(ticketWatchers, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketWatchers.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [ticketWatchers.userId], references: [users.id] }),
}));

export const timesheetsRelations = relations(timesheets, ({ one }) => ({
  ticket: one(tickets, { fields: [timesheets.ticketId], references: [tickets.id] }),
  user: one(users, { fields: [timesheets.userId], references: [users.id] }),
}));


export const projectTemplates = pgTable("project_templates", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("GENERAL").notNull(),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_project_templates_org").on(table.orgId),
]);

export const projectTemplateTickets = pgTable("project_template_tickets", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => projectTemplates.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("TASK").notNull(),
  priority: text("priority").default("MEDIUM").notNull(),
  estimatedHours: decimal("estimated_hours", { precision: 8, scale: 2 }),
  order: integer("order").notNull().default(0),
  phase: text("phase"),
}, (table) => [
  index("idx_project_template_tickets_template").on(table.templateId),
]);

export const projectTemplatesRelations = relations(projectTemplates, ({ one, many }) => ({
  org: one(organizations, { fields: [projectTemplates.orgId], references: [organizations.id] }),
  createdBy: one(users, { fields: [projectTemplates.createdBy], references: [users.id] }),
  tickets: many(projectTemplateTickets),
}));

export const projectTemplateTicketsRelations = relations(projectTemplateTickets, ({ one }) => ({
  template: one(projectTemplates, { fields: [projectTemplateTickets.templateId], references: [projectTemplates.id] }),
}));
