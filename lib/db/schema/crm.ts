/**
 * CRM domain: leads, deals, clients, targets, campaigns, contacts, organizations,
 * branches, client accounts, incentives, DM leads, social media stats, SLA, views,
 * email templates, scoring rules, assignment rules.
 */
import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, foreignKey, index, uniqueIndex, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  leadPipelineStatusEnum, leadActivityTypeEnum, leadSourceEnum, leadPriorityEnum,
  dealStageEnum, dealActivityTypeEnum, clientAccountStatusEnum, incentiveStatusEnum,
  dmLeadStatusEnum, branchStatusEnum, socialPlatformEnum,
  leadEmailDirectionEnum, leadTaskStatusEnum, scoringOperatorEnum,
  assignmentRuleTypeEnum, slaAppliesToEnum, slaPriorityEnum, orgSizeEnum,
  crmPersonRoleEnum, crmHealthEnum, crmDealStageEnum, crmCampaignStatusEnum,
  crmLeadStatusEnum, crmSupportTicketStatusEnum, crmSupportTicketPriorityEnum,
  crmActivityTypeEnum, crmEventStatusEnum,
  invoiceStatusEnum, supportTicketStatusEnum, supportTicketPriorityEnum,
} from "./enums";
import { organizations, users } from "./auth";
import { projects } from "./projects";
import { payrolls } from "./hr";

// ─── CRM Campaigns (shared dependency for leads) ───
export const crmCampaigns = pgTable("crm_campaigns", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  status: crmCampaignStatusEnum("status").default("active"),
  leads: integer("leads").default(0),
  spend: decimal("spend").default("0"),
  roi: decimal("roi").default("0"),
  budgetAllocated: decimal("budget_allocated", { precision: 15, scale: 2 }),
  budgetSpent: decimal("budget_spent", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Leads ───
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
  subSource: text("sub_source"),
  dmLeadId: integer("dm_lead_id"),
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

// ─── Clients ───
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

// ─── Targets ───
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
  branchId: integer("branch_id"),
  parentTargetId: integer("parent_target_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_targets_user_period").on(table.userId, table.period),
  index("idx_targets_branch").on(table.branchId),
  foreignKey({ columns: [table.parentTargetId], foreignColumns: [table.id] }),
]);

export const targetHistory = pgTable("target_history", {
  id: serial("id").primaryKey(),
  targetId: integer("target_id").references(() => targets.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  changedById: text("changed_by_id").references(() => users.id).notNull(),
  field: text("field").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_target_history_target").on(table.targetId),
]);

// ─── Deals ───
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

// ─── CRM Legacy Tables ───
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

export const assignmentRuleState = pgTable("assignment_rule_state", {
  id: serial("id").primaryKey(),
  ruleId: integer("rule_id").references(() => leadAssignmentRules.id, { onDelete: "cascade" }).notNull().unique(),
  lastAssignedIndex: integer("last_assigned_index").default(0).notNull(),
});

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

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  title: text("title"),
  department: text("department"),
  company: text("company"),
  organizationId: integer("organization_id"),
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

// ─── Branches ───
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  code: text("code").notNull(),
  city: text("city"),
  state: text("state"),
  country: text("country").default("India"),
  pincode: text("pincode"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  branchManagerId: text("branch_manager_id").references(() => users.id),
  branchHrId: text("branch_hr_id").references(() => users.id),
  status: branchStatusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_branches_org").on(table.orgId),
  uniqueIndex("uniq_branch_code_org").on(table.orgId, table.code),
]);

// ─── Client Accounts ───
export const clientAccounts = pgTable("client_accounts", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  branchId: integer("branch_id").references(() => branches.id),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  salesRepId: text("sales_rep_id").notNull().references(() => users.id),
  assignedCrmId: text("assigned_crm_id").references(() => users.id),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  clientWhatsapp: text("client_whatsapp"),
  status: clientAccountStatusEnum("status").notNull().default("ACCOUNT_OPENING"),
  investmentAmount: decimal("investment_amount", { precision: 15, scale: 2 }),
  planName: text("plan_name"),
  investmentDate: timestamp("investment_date"),
  transactionRef: text("transaction_ref"),
  conversionNotes: text("conversion_notes"),
  estimatedInvestment: decimal("estimated_investment", { precision: 15, scale: 2 }),
  convertedAt: timestamp("converted_at").defaultNow().notNull(),
  investedAt: timestamp("invested_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_client_accounts_org").on(table.orgId),
  index("idx_client_accounts_sales_rep").on(table.salesRepId),
  index("idx_client_accounts_status").on(table.orgId, table.status),
]);

export const clientAccountActivities = pgTable("client_account_activities", {
  id: serial("id").primaryKey(),
  clientAccountId: integer("client_account_id").notNull().references(() => clientAccounts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  activityType: text("activity_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_client_account_activities_account").on(table.clientAccountId),
  index("idx_client_account_activities_user").on(table.userId),
]);

// ─── Incentives ───
export const incentiveConfig = pgTable("incentive_config", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  branchId: integer("branch_id").references(() => branches.id),
  incentiveRate: decimal("incentive_rate", { precision: 5, scale: 2 }).notNull(),
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const incentives = pgTable("incentives", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  branchId: integer("branch_id").references(() => branches.id),
  clientAccountId: integer("client_account_id").notNull().references(() => clientAccounts.id),
  salesRepId: text("sales_rep_id").notNull().references(() => users.id),
  investmentAmount: decimal("investment_amount", { precision: 15, scale: 2 }).notNull(),
  incentiveRate: decimal("incentive_rate", { precision: 5, scale: 2 }).notNull(),
  calculatedAmount: decimal("calculated_amount", { precision: 15, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 15, scale: 2 }),
  status: incentiveStatusEnum("status").notNull().default("PENDING"),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  payrollId: integer("payroll_id").references(() => payrolls.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_incentives_org").on(table.orgId),
  index("idx_incentives_sales_rep").on(table.salesRepId),
  index("idx_incentives_status").on(table.status),
]);

// ─── DM Leads ───
export const dmLeads = pgTable("dm_leads", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  whatsappNumber: text("whatsapp_number"),
  sourcePlatform: text("source_platform").notNull(),
  campaignId: integer("campaign_id").references(() => crmCampaigns.id),
  campaignType: text("campaign_type"),
  leadQuality: text("lead_quality").default("warm"),
  notes: text("notes"),
  landingPageUrl: text("landing_page_url"),
  dateCaptured: timestamp("date_captured").defaultNow().notNull(),
  status: dmLeadStatusEnum("status").notNull().default("pending_review"),
  verifiedBy: text("verified_by").references(() => users.id),
  importedLeadId: integer("imported_lead_id").references(() => leads.id),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_dm_leads_org").on(table.orgId),
  index("idx_dm_leads_status").on(table.status),
  index("idx_dm_leads_platform").on(table.sourcePlatform),
]);

// ─── Social Media Stats ───
export const socialMediaStats = pgTable("social_media_stats", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  platform: socialPlatformEnum("platform").notNull(),
  date: date("date").notNull(),
  postsPublished: integer("posts_published").default(0),
  storiesReels: integer("stories_reels").default(0),
  followersTotal: integer("followers_total").default(0),
  engagementRate: decimal("engagement_rate", { precision: 5, scale: 2 }),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  linkClicks: integer("link_clicks").default(0),
  profileVisits: integer("profile_visits").default(0),
  enteredBy: text("entered_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  unique("uniq_social_stats_org_platform_date").on(table.orgId, table.platform, table.date),
]);

// ─── Invoices ───
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

// ─── Support Tickets ───
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

// ─── CRM Relations ───
export const leadsRelations = relations(leads, ({ one, many }) => ({
  organization: one(organizations, { fields: [leads.orgId], references: [organizations.id] }),
  assignedTo: one(users, { fields: [leads.assignedToId], references: [users.id], relationName: "leadAssignee" }),
  assignedBy: one(users, { fields: [leads.assignedById], references: [users.id], relationName: "leadAssigner" }),
  campaign: one(crmCampaigns, { fields: [leads.campaignId], references: [crmCampaigns.id] }),
  activities: many(leadActivities),
}));

export const leadActivitiesRelations = relations(leadActivities, ({ one }) => ({
  lead: one(leads, { fields: [leadActivities.leadId], references: [leads.id] }),
  user: one(users, { fields: [leadActivities.userId], references: [users.id] }),
}));

export const leadNotesRelations = relations(leadNotes, ({ one }) => ({
  lead: one(leads, { fields: [leadNotes.leadId], references: [leads.id] }),
  author: one(users, { fields: [leadNotes.authorId], references: [users.id] }),
}));

export const leadTasksRelations = relations(leadTasks, ({ one }) => ({
  lead: one(leads, { fields: [leadTasks.leadId], references: [leads.id] }),
  assignee: one(users, { fields: [leadTasks.assigneeId], references: [users.id] }),
}));

export const leadEmailsRelations = relations(leadEmails, ({ one }) => ({
  lead: one(leads, { fields: [leadEmails.leadId], references: [leads.id] }),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  lead: one(leads, { fields: [clients.leadId], references: [leads.id] }),
  accountManager: one(users, { fields: [clients.accountManagerId], references: [users.id] }),
}));

export const targetsRelations = relations(targets, ({ one, many }) => ({
  user: one(users, { fields: [targets.userId], references: [users.id] }),
  setBy: one(users, { fields: [targets.setById], references: [users.id], relationName: "targetSetter" }),
  history: many(targetHistory),
}));

export const targetHistoryRelations = relations(targetHistory, ({ one }) => ({
  target: one(targets, { fields: [targetHistory.targetId], references: [targets.id] }),
  changedBy: one(users, { fields: [targetHistory.changedById], references: [users.id] }),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, { fields: [deals.orgId], references: [organizations.id] }),
  lead: one(leads, { fields: [deals.leadId], references: [leads.id] }),
  client: one(clients, { fields: [deals.clientId], references: [clients.id] }),
  assignedTo: one(users, { fields: [deals.assignedToId], references: [users.id] }),
  activities: many(dealActivities),
}));

export const dealActivitiesRelations = relations(dealActivities, ({ one }) => ({
  deal: one(deals, { fields: [dealActivities.dealId], references: [deals.id] }),
  user: one(users, { fields: [dealActivities.userId], references: [users.id] }),
}));

export const crmPeopleRelations = relations(crmPeople, ({ one, many }) => ({
  organization: one(organizations, { fields: [crmPeople.orgId], references: [organizations.id] }),
  deals: many(crmDeals),
  managedCompanies: many(crmCompanies),
  activities: many(crmActivities),
  performance: many(crmTeamPerformance),
}));

export const crmCompaniesRelations = relations(crmCompanies, ({ one }) => ({
  organization: one(organizations, { fields: [crmCompanies.orgId], references: [organizations.id] }),
  csm: one(crmPeople, { fields: [crmCompanies.csmId], references: [crmPeople.id] }),
}));

export const crmDealsRelations = relations(crmDeals, ({ one }) => ({
  organization: one(organizations, { fields: [crmDeals.orgId], references: [organizations.id] }),
  salesRep: one(crmPeople, { fields: [crmDeals.salesRepId], references: [crmPeople.id] }),
}));

export const crmCampaignsRelations = relations(crmCampaigns, ({ one, many }) => ({
  organization: one(organizations, { fields: [crmCampaigns.orgId], references: [organizations.id] }),
  leads: many(crmLeads),
}));

export const crmLeadsRelations = relations(crmLeads, ({ one }) => ({
  organization: one(organizations, { fields: [crmLeads.orgId], references: [organizations.id] }),
  campaign: one(crmCampaigns, { fields: [crmLeads.campaignId], references: [crmCampaigns.id] }),
}));

export const crmActivitiesRelations = relations(crmActivities, ({ one }) => ({
  organization: one(organizations, { fields: [crmActivities.orgId], references: [organizations.id] }),
  crmPerson: one(crmPeople, { fields: [crmActivities.personId], references: [crmPeople.id] }),
}));

export const crmSupportTicketsRelations = relations(crmSupportTickets, ({ one }) => ({
  organization: one(organizations, { fields: [crmSupportTickets.orgId], references: [organizations.id] }),
  assignee: one(crmPeople, { fields: [crmSupportTickets.assigneeId], references: [crmPeople.id] }),
}));

export const crmTeamPerformanceRelations = relations(crmTeamPerformance, ({ one }) => ({
  organization: one(organizations, { fields: [crmTeamPerformance.orgId], references: [organizations.id] }),
  person: one(crmPeople, { fields: [crmTeamPerformance.personId], references: [crmPeople.id] }),
}));

export const crmEmailTemplatesRelations = relations(crmEmailTemplates, ({ one }) => ({
  organization: one(organizations, { fields: [crmEmailTemplates.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [crmEmailTemplates.createdBy], references: [users.id] }),
}));

export const leadScoringRulesRelations = relations(leadScoringRules, ({ one }) => ({
  organization: one(organizations, { fields: [leadScoringRules.orgId], references: [organizations.id] }),
}));

export const leadAssignmentRulesRelations = relations(leadAssignmentRules, ({ one }) => ({
  organization: one(organizations, { fields: [leadAssignmentRules.orgId], references: [organizations.id] }),
  assignToUser: one(users, { fields: [leadAssignmentRules.assignToUserId], references: [users.id] }),
}));

export const assignmentRuleStateRelations = relations(assignmentRuleState, ({ one }) => ({
  rule: one(leadAssignmentRules, { fields: [assignmentRuleState.ruleId], references: [leadAssignmentRules.id] }),
}));

export const crmSlaRelations = relations(crmSla, ({ one }) => ({
  organization: one(organizations, { fields: [crmSla.orgId], references: [organizations.id] }),
}));

export const crmViewsRelations = relations(crmViews, ({ one }) => ({
  organization: one(organizations, { fields: [crmViews.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [crmViews.createdBy], references: [users.id] }),
}));

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

export const branchesRelations = relations(branches, ({ one }) => ({
  organization: one(organizations, { fields: [branches.orgId], references: [organizations.id] }),
  branchManager: one(users, { fields: [branches.branchManagerId], references: [users.id], relationName: "branchManager" }),
  branchHr: one(users, { fields: [branches.branchHrId], references: [users.id], relationName: "branchHr" }),
}));

export const clientAccountsRelations = relations(clientAccounts, ({ one, many }) => ({
  organization: one(organizations, { fields: [clientAccounts.orgId], references: [organizations.id] }),
  branch: one(branches, { fields: [clientAccounts.branchId], references: [branches.id] }),
  lead: one(leads, { fields: [clientAccounts.leadId], references: [leads.id] }),
  salesRep: one(users, { fields: [clientAccounts.salesRepId], references: [users.id], relationName: "clientAccountSalesRep" }),
  assignedCrm: one(users, { fields: [clientAccounts.assignedCrmId], references: [users.id], relationName: "clientAccountCrm" }),
  activities: many(clientAccountActivities),
  incentives: many(incentives),
}));

export const clientAccountActivitiesRelations = relations(clientAccountActivities, ({ one }) => ({
  clientAccount: one(clientAccounts, { fields: [clientAccountActivities.clientAccountId], references: [clientAccounts.id] }),
  user: one(users, { fields: [clientAccountActivities.userId], references: [users.id] }),
}));

export const incentivesRelations = relations(incentives, ({ one }) => ({
  organization: one(organizations, { fields: [incentives.orgId], references: [organizations.id] }),
  clientAccount: one(clientAccounts, { fields: [incentives.clientAccountId], references: [clientAccounts.id] }),
  salesRep: one(users, { fields: [incentives.salesRepId], references: [users.id] }),
  approver: one(users, { fields: [incentives.approvedBy], references: [users.id] }),
}));

export const dmLeadsRelations = relations(dmLeads, ({ one }) => ({
  organization: one(organizations, { fields: [dmLeads.orgId], references: [organizations.id] }),
  campaign: one(crmCampaigns, { fields: [dmLeads.campaignId], references: [crmCampaigns.id] }),
  verifier: one(users, { fields: [dmLeads.verifiedBy], references: [users.id], relationName: "dmLeadVerifier" }),
  importedLead: one(leads, { fields: [dmLeads.importedLeadId], references: [leads.id] }),
  creator: one(users, { fields: [dmLeads.createdBy], references: [users.id], relationName: "dmLeadCreator" }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  organization: one(organizations, { fields: [invoices.orgId], references: [organizations.id] }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  creator: one(users, { fields: [invoices.createdBy], references: [users.id] }),
}));

export const invoiceAiExtractionsRelations = relations(invoiceAiExtractions, ({ one }) => ({
  organization: one(organizations, { fields: [invoiceAiExtractions.orgId], references: [organizations.id] }),
  invoice: one(invoices, { fields: [invoiceAiExtractions.invoiceId], references: [invoices.id] }),
  creator: one(users, { fields: [invoiceAiExtractions.createdBy], references: [users.id] }),
}));

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
