import { pgTable, foreignKey, serial, text, date, numeric, timestamp, unique, integer, index, jsonb, boolean, uniqueIndex, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const ackStatus = pgEnum("ack_status", ['PENDING', 'ACKNOWLEDGED', 'DECLINED'])
export const applicationStatus = pgEnum("application_status", ['APPLIED', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'])
export const assetStatus = pgEnum("asset_status", ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED'])
export const assignmentRuleType = pgEnum("assignment_rule_type", ['assign_user', 'round_robin'])
export const bonusType = pgEnum("bonus_type", ['PERFORMANCE', 'FESTIVAL', 'REFERRAL', 'SPOT', 'ANNUAL'])
export const branchStatus = pgEnum("branch_status", ['ACTIVE', 'INACTIVE'])
export const candidateStatus = pgEnum("candidate_status", ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED'])
export const chatMessageType = pgEnum("chat_message_type", ['text', 'lead_submission', 'system'])
export const clientAccountStatus = pgEnum("client_account_status", ['ACCOUNT_OPENING', 'QUERIES', 'PLAN_SELECTED', 'INVESTED'])
export const crmActivityType = pgEnum("crm_activity_type", ['deal_won', 'meeting', 'proposal', 'call', 'email', 'ticket', 'escalation'])
export const crmCampaignStatus = pgEnum("crm_campaign_status", ['active', 'paused', 'completed'])
export const crmDealStage = pgEnum("crm_deal_stage", ['Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won'])
export const crmEventStatus = pgEnum("crm_event_status", ['planning', 'confirmed', 'completed'])
export const crmHealth = pgEnum("crm_health", ['healthy', 'at_risk', 'critical'])
export const crmLeadStatus = pgEnum("crm_lead_status", ['visitor', 'lead', 'mql', 'sql', 'opportunity'])
export const crmPersonRole = pgEnum("crm_person_role", ['sales_rep', 'csm', 'marketing'])
export const crmSupportTicketPriority = pgEnum("crm_support_ticket_priority", ['critical', 'high', 'medium', 'low'])
export const crmSupportTicketStatus = pgEnum("crm_support_ticket_status", ['new', 'in_progress', 'resolved', 'closed'])
export const cycleStatus = pgEnum("cycle_status", ['draft', 'active', 'completed'])
export const dealActivityType = pgEnum("deal_activity_type", ['stage_change', 'note', 'call', 'email', 'meeting', 'document'])
export const dealStage = pgEnum("deal_stage", ['LEAD', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'])
export const deviceStatus = pgEnum("device_status", ['ACTIVE', 'INACTIVE', 'LOST', 'RETURNED'])
export const dmLeadStatus = pgEnum("dm_lead_status", ['pending_review', 'verified', 'sent_to_hr', 'imported_to_pipeline'])
export const docAuditAction = pgEnum("doc_audit_action", ['UPLOADED', 'APPROVED', 'REJECTED', 'RE_UPLOAD_REQUESTED', 'RE_UPLOADED'])
export const documentType = pgEnum("document_type", ['CONTRACT', 'CERTIFICATE', 'ID_PROOF', 'PAYSLIP', 'POLICY', 'OFFER_LETTER', 'RESUME', 'OTHER'])
export const enrollmentStatus = pgEnum("enrollment_status", ['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED'])
export const exitChecklistStatus = pgEnum("exit_checklist_status", ['PENDING', 'DONE'])
export const expenseStatus = pgEnum("expense_status", ['PENDING', 'APPROVED', 'REJECTED', 'PAID'])
export const feedbackType = pgEnum("feedback_type", ['SELF', 'PEER', 'MANAGER', 'SKIP_LEVEL'])
export const fnfStatus = pgEnum("fnf_status", ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID'])
export const gender = pgEnum("gender", ['MALE', 'FEMALE', 'OTHER'])
export const incentiveStatus = pgEnum("incentive_status", ['PENDING', 'APPROVED', 'REJECTED', 'ADDED_TO_PAYROLL'])
export const intakeSource = pgEnum("intake_source", ['manual', 'web_form', 'email'])
export const intakeStatus = pgEnum("intake_status", ['pending', 'accepted', 'declined', 'duplicate'])
export const interviewResult = pgEnum("interview_result", ['PENDING', 'PASSED', 'FAILED', 'NO_SHOW'])
export const interviewType = pgEnum("interview_type", ['PHONE', 'VIDEO', 'ONSITE', 'TECHNICAL', 'HR', 'FINAL'])
export const invoiceStatus = pgEnum("invoice_status", ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'])
export const jobPostingStatus = pgEnum("job_posting_status", ['DRAFT', 'OPEN', 'PAUSED', 'CLOSED', 'FILLED'])
export const leadActivityType = pgEnum("lead_activity_type", ['call', 'email', 'whatsapp', 'meeting', 'site_visit'])
export const leadEmailDirection = pgEnum("lead_email_direction", ['sent', 'received'])
export const leadPipelineStatus = pgEnum("lead_pipeline_status", ['NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'CONVERTED', 'LOST'])
export const leadPriority = pgEnum("lead_priority", ['HOT', 'WARM', 'COLD'])
export const leadSource = pgEnum("lead_source", ['referral', 'campaign', 'cold_call', 'website', 'social_media', 'walk_in', 'other'])
export const leadTaskStatus = pgEnum("lead_task_status", ['open', 'done'])
export const leaveStatus = pgEnum("leave_status", ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
export const loanStatus = pgEnum("loan_status", ['PENDING', 'APPROVED', 'ACTIVE', 'REPAID', 'REJECTED'])
export const meetingStatus = pgEnum("meeting_status", ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
export const moduleStatus = pgEnum("module_status", ['backlog', 'planned', 'in-progress', 'completed', 'paused', 'cancelled'])
export const notificationType = pgEnum("notification_type", ['INFO', 'SUCCESS', 'WARNING', 'ERROR'])
export const onboardingDocStatus = pgEnum("onboarding_doc_status", ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED'])
export const onboardingDocumentStatus = pgEnum("onboarding_document_status", ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RE_UPLOAD_REQUESTED'])
export const onboardingStatus = pgEnum("onboarding_status", ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'])
export const orgSize = pgEnum("org_size", ['1-10', '11-50', '51-200', '201-1000', '1000+'])
export const payrollStatus = pgEnum("payroll_status", ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID'])
export const pipStatus = pgEnum("pip_status", ['ACTIVE', 'EXTENDED', 'COMPLETED', 'TERMINATED'])
export const projectStatus = pgEnum("project_status", ['ACTIVE', 'COMPLETED', 'ARCHIVED'])
export const reimbursementStatus = pgEnum("reimbursement_status", ['PENDING', 'APPROVED', 'REJECTED', 'PAID'])
export const resignationStatus = pgEnum("resignation_status", ['SUBMITTED', 'PENDING_HR', 'HR_APPROVED', 'CEO_APPROVED', 'IN_PROGRESS', 'APPROVED', 'WITHDRAWN', 'COMPLETED', 'REJECTED'])
export const reviewCycleStatus = pgEnum("review_cycle_status", ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'])
export const reviewStatus = pgEnum("review_status", ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'])
export const scoringOperator = pgEnum("scoring_operator", ['eq', 'gt', 'lt', 'contains', 'in'])
export const slaAppliesTo = pgEnum("sla_applies_to", ['lead', 'deal', 'both'])
export const slaPriority = pgEnum("sla_priority", ['low', 'medium', 'high', 'urgent'])
export const socialPlatform = pgEnum("social_platform", ['instagram', 'twitter', 'linkedin', 'facebook', 'youtube'])
export const stateGroup = pgEnum("state_group", ['backlog', 'unstarted', 'started', 'completed', 'cancelled'])
export const supportTicketPriority = pgEnum("support_ticket_priority", ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const supportTicketStatus = pgEnum("support_ticket_status", ['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'])
export const surveyStatus = pgEnum("survey_status", ['DRAFT', 'ACTIVE', 'CLOSED'])
export const taskEntityType = pgEnum("task_entity_type", ['LEAD', 'DEAL', 'CONTACT', 'PROJECT'])
export const taskStatus = pgEnum("task_status", ['pending', 'completed', 'cancelled'])
export const taskType = pgEnum("task_type", ['CALL', 'EMAIL', 'MEETING', 'CUSTOM'])
export const terminationStatus = pgEnum("termination_status", ['DRAFT', 'PENDING_CEO', 'APPROVED', 'REJECTED', 'SENT', 'COMPLETED'])
export const ticketPriority = pgEnum("ticket_priority", ['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
export const ticketStatus = pgEnum("ticket_status", ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'])
export const ticketType = pgEnum("ticket_type", ['EPIC', 'STORY', 'TASK', 'BUG'])
export const trainingStatus = pgEnum("training_status", ['DRAFT', 'PUBLISHED', 'ARCHIVED'])
export const viewLayout = pgEnum("view_layout", ['board', 'list', 'table', 'calendar', 'gantt'])
export const wfhRequestStatus = pgEnum("wfh_request_status", ['PENDING', 'APPROVED', 'REJECTED'])
export const workItemRelationType = pgEnum("work_item_relation_type", ['blocks', 'blocked_by', 'duplicate_of', 'relates_to'])


export const assets = pgTable("assets", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	type: text().notNull(),
	serialNumber: text("serial_number"),
	assignedTo: text("assigned_to"),
	status: assetStatus().default('AVAILABLE'),
	purchaseDate: date("purchase_date"),
	purchaseCost: numeric("purchase_cost"),
	location: text(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "assets_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "assets_org_id_organizations_id_fk"
		}),
]);

export const assignmentRuleState = pgTable("assignment_rule_state", {
	id: serial().primaryKey().notNull(),
	ruleId: integer("rule_id").notNull(),
	lastAssignedIndex: integer("last_assigned_index").default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.ruleId],
			foreignColumns: [leadAssignmentRules.id],
			name: "assignment_rule_state_rule_id_lead_assignment_rules_id_fk"
		}).onDelete("cascade"),
	unique("assignment_rule_state_rule_id_unique").on(table.ruleId),
]);

export const crmOrganizations = pgTable("crm_organizations", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	domain: text(),
	industry: text(),
	size: orgSize(),
	website: text(),
	linkedinUrl: text("linkedin_url"),
	description: text(),
	healthScore: integer("health_score"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	parentId: integer("parent_id"),
	notes: text(),
}, (table) => [
	index("idx_crm_organizations_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_crm_organizations_parent").using("btree", table.orgId.asc().nullsLast().op("int4_ops"), table.parentId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_organizations_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "crm_organizations_parent_id_crm_organizations_id_fk"
		}).onDelete("set null"),
]);

export const crmSlaPolicies = pgTable("crm_sla_policies", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	appliesTo: slaAppliesTo("applies_to").notNull(),
	priority: slaPriority().notNull(),
	firstResponseHours: integer("first_response_hours").notNull(),
	resolutionHours: integer("resolution_hours").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_crm_sla_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_sla_policies_org_id_organizations_id_fk"
		}),
]);

export const crmSupportTeamMembers = pgTable("crm_support_team_members", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	role: text().notNull(),
	access: text().notNull(),
	avatar: text().notNull(),
	status: text().default('online'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_support_team_members_org_id_organizations_id_fk"
		}),
]);

export const crmTeamPerformance = pgTable("crm_team_performance", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	personId: integer("person_id").notNull(),
	month: text().notNull(),
	value: numeric().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_team_performance_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.personId],
			foreignColumns: [crmPeople.id],
			name: "crm_team_performance_person_id_crm_people_id_fk"
		}),
]);

export const accounts = pgTable("accounts", {
	userId: text("user_id").notNull(),
	type: text().notNull(),
	provider: text().notNull(),
	providerAccountId: text("provider_account_id").notNull(),
	refreshToken: text("refresh_token"),
	accessToken: text("access_token"),
	expiresAt: integer("expires_at"),
	tokenType: text("token_type"),
	scope: text(),
	idToken: text("id_token"),
	sessionState: text("session_state"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "accounts_user_id_users_id_fk"
		}),
]);

export const attendance = pgTable("attendance", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	date: date().notNull(),
	checkIn: timestamp("check_in", { mode: 'string' }),
	checkOut: timestamp("check_out", { mode: 'string' }),
	status: text().default('PRESENT'),
	workHours: numeric("work_hours"),
	breakHours: numeric("break_hours").default('0'),
	breaks: jsonb().default([]),
	locationData: jsonb("location_data"),
	isOvertime: boolean("is_overtime").default(false),
	autoCheckedOut: boolean("auto_checked_out").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_attendance_date").using("btree", table.date.asc().nullsLast().op("date_ops")),
	index("idx_attendance_org_date").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("idx_attendance_user_date").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("idx_attendance_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "attendance_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "attendance_user_id_users_id_fk"
		}),
]);

export const chatAttachments = pgTable("chat_attachments", {
	id: serial().primaryKey().notNull(),
	messageId: integer("message_id").notNull(),
	fileName: text("file_name").notNull(),
	fileUrl: text("file_url").notNull(),
	fileKey: text("file_key").notNull(),
	fileSize: integer("file_size").notNull(),
	mimeType: text("mime_type").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_chat_attachments_msg").using("btree", table.messageId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [chatMessages.id],
			name: "chat_attachments_message_id_chat_messages_id_fk"
		}).onDelete("cascade"),
]);

export const chatChannelMembers = pgTable("chat_channel_members", {
	id: serial().primaryKey().notNull(),
	channelId: integer("channel_id").notNull(),
	userId: text("user_id").notNull(),
	role: text().default('MEMBER').notNull(),
	lastReadAt: timestamp("last_read_at", { mode: 'string' }).defaultNow(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
	mutedUntil: timestamp("muted_until", { mode: 'string' }),
}, (table) => [
	index("idx_chat_members_channel").using("btree", table.channelId.asc().nullsLast().op("int4_ops")),
	index("idx_chat_members_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	uniqueIndex("uniq_channel_member").using("btree", table.channelId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [chatChannels.id],
			name: "chat_channel_members_channel_id_chat_channels_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_channel_members_user_id_users_id_fk"
		}),
]);

export const auditLogs = pgTable("audit_logs", {
	id: serial().primaryKey().notNull(),
	action: text().notNull(),
	userId: text("user_id").notNull(),
	orgId: text("org_id"),
	targetId: text("target_id"),
	targetType: text("target_type"),
	metadata: jsonb(),
	ipAddress: text("ip_address"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_audit_logs_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_audit_logs_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_audit_logs_org_id").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_audit_logs_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "audit_logs_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_logs_user_id_users_id_fk"
		}),
]);

export const chatChannels = pgTable("chat_channels", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	type: text().default('GROUP').notNull(),
	description: text(),
	avatarUrl: text("avatar_url"),
	createdBy: text("created_by").notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	lastMessageAt: timestamp("last_message_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	isPinned: boolean("is_pinned").default(false).notNull(),
	linkedDealId: integer("linked_deal_id"),
}, (table) => [
	index("idx_chat_channels_last_msg").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.lastMessageAt.asc().nullsLast().op("text_ops")),
	index("idx_chat_channels_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "chat_channels_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.linkedDealId],
			foreignColumns: [deals.id],
			name: "chat_channels_linked_deal_id_deals_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "chat_channels_org_id_organizations_id_fk"
		}),
]);

export const crmCampaigns = pgTable("crm_campaigns", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	status: crmCampaignStatus().default('active'),
	leads: integer().default(0),
	spend: numeric().default('0'),
	roi: numeric().default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	budgetAllocated: numeric("budget_allocated", { precision: 15, scale:  2 }),
	budgetSpent: numeric("budget_spent", { precision: 15, scale:  2 }),
	channel: text(),
	description: text(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	targetAudience: text("target_audience"),
	ownerId: text("owner_id"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_campaigns_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [users.id],
			name: "crm_campaigns_owner_id_users_id_fk"
		}),
]);

export const crmActivities = pgTable("crm_activities", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	type: crmActivityType().notNull(),
	message: text().notNull(),
	time: text().notNull(),
	person: text(),
	personId: integer("person_id"),
	category: text().default('sales').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_activities_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.personId],
			foreignColumns: [crmPeople.id],
			name: "crm_activities_person_id_crm_people_id_fk"
		}),
]);

export const clients = pgTable("clients", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	leadId: integer("lead_id"),
	name: text().notNull(),
	email: text(),
	phone: text(),
	company: text(),
	designation: text(),
	city: text(),
	investmentValue: numeric("investment_value"),
	status: text().default('active').notNull(),
	accountManagerId: text("account_manager_id"),
	notes: text(),
	convertedAt: timestamp("converted_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	healthScore: integer("health_score").default(50),
	healthStatus: text("health_status").default('healthy'),
	lastHealthCheck: timestamp("last_health_check", { mode: 'string' }),
	churnRiskScore: integer("churn_risk_score"),
	churnRiskReasoning: text("churn_risk_reasoning"),
}, (table) => [
	index("idx_clients_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.accountManagerId],
			foreignColumns: [users.id],
			name: "clients_account_manager_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "clients_lead_id_leads_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "clients_org_id_organizations_id_fk"
		}),
]);

export const contacts = pgTable("contacts", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	title: text(),
	department: text(),
	company: text(),
	organizationId: integer("organization_id"),
	linkedinUrl: text("linkedin_url"),
	twitterUrl: text("twitter_url"),
	avatarUrl: text("avatar_url"),
	leadId: integer("lead_id"),
	dealId: integer("deal_id"),
	tags: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	websiteUrl: text("website_url"),
}, (table) => [
	index("idx_contacts_name_email").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops"), table.email.asc().nullsLast().op("text_ops")),
	index("idx_contacts_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_contacts_organization").using("btree", table.organizationId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deals.id],
			name: "contacts_deal_id_deals_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "contacts_lead_id_leads_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "contacts_org_id_organizations_id_fk"
		}),
]);

export const chatUserPresence = pgTable("chat_user_presence", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	orgId: text("org_id").notNull(),
	status: text().default('OFFLINE').notNull(),
	lastSeenAt: timestamp("last_seen_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_chat_presence_lastseen").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.lastSeenAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_chat_presence_org").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	uniqueIndex("uniq_chat_presence_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "chat_user_presence_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_user_presence_user_id_users_id_fk"
		}),
]);

export const crmDeals = pgTable("crm_deals", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	companyName: text("company_name").notNull(),
	value: numeric().notNull(),
	stage: crmDealStage().notNull(),
	probability: integer().default(0),
	closeDate: date("close_date"),
	salesRepId: integer("sales_rep_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_deals_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.salesRepId],
			foreignColumns: [crmPeople.id],
			name: "crm_deals_sales_rep_id_crm_people_id_fk"
		}),
]);

export const crmEmailTemplates = pgTable("crm_email_templates", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	subject: text().notNull(),
	body: text().notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_crm_email_templates_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "crm_email_templates_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_email_templates_org_id_organizations_id_fk"
		}),
]);

export const crmEvents = pgTable("crm_events", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	date: text().notNull(),
	type: text().notNull(),
	status: crmEventStatus().default('planning'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_events_org_id_organizations_id_fk"
		}),
]);

export const crmLeads = pgTable("crm_leads", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	campaignId: integer("campaign_id"),
	email: text(),
	name: text(),
	status: crmLeadStatus().default('lead'),
	channel: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [crmCampaigns.id],
			name: "crm_leads_campaign_id_crm_campaigns_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_leads_org_id_organizations_id_fk"
		}),
]);

export const crmCompanies = pgTable("crm_companies", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	health: crmHealth().default('healthy'),
	revenue: numeric().default('0'),
	renewalDate: date("renewal_date"),
	renewalValue: numeric("renewal_value").default('0'),
	customerSince: text("customer_since"),
	csmId: integer("csm_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.csmId],
			foreignColumns: [crmPeople.id],
			name: "crm_companies_csm_id_crm_people_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_companies_org_id_organizations_id_fk"
		}),
]);

export const crmContent = pgTable("crm_content", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	type: text().notNull(),
	views: integer().default(0),
	leads: integer().default(0),
	convRate: numeric("conv_rate").default('0'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_content_org_id_organizations_id_fk"
		}),
]);

export const crmViews = pgTable("crm_views", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	createdBy: text("created_by").notNull(),
	name: text().notNull(),
	entityType: text("entity_type").notNull(),
	filters: jsonb().default({}),
	sortBy: text("sort_by"),
	sortDir: text("sort_dir").default('asc'),
	isPublic: boolean("is_public").default(false).notNull(),
	isPinned: boolean("is_pinned").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_crm_views_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "crm_views_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_views_org_id_organizations_id_fk"
		}),
]);

export const crmPeople = pgTable("crm_people", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	slug: text().notNull(),
	name: text().notNull(),
	initials: text().notNull(),
	role: crmPersonRole().notNull(),
	title: text().notNull(),
	department: text().notNull(),
	email: text().notNull(),
	phone: text(),
	location: text(),
	joinDate: text("join_date"),
	bio: text(),
	skills: text().array(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_people_org_id_organizations_id_fk"
		}),
]);

export const crmSupportTickets = pgTable("crm_support_tickets", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text(),
	priority: crmSupportTicketPriority().default('medium'),
	status: crmSupportTicketStatus().default('new'),
	assigneeId: integer("assignee_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [crmPeople.id],
			name: "crm_support_tickets_assignee_id_crm_people_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_support_tickets_org_id_organizations_id_fk"
		}),
]);

export const dealActivities = pgTable("deal_activities", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	dealId: integer("deal_id").notNull(),
	type: dealActivityType().notNull(),
	previousValue: text("previous_value"),
	newValue: text("new_value"),
	subject: text(),
	notes: text(),
	duration: integer(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_deal_activities_deal").using("btree", table.dealId.asc().nullsLast().op("int4_ops")),
	index("idx_deal_activities_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deals.id],
			name: "deal_activities_deal_id_deals_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "deal_activities_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "deal_activities_user_id_users_id_fk"
		}),
]);

export const departments = pgTable("departments", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	managerId: text("manager_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "departments_org_id_organizations_id_fk"
		}),
]);

export const customStates = pgTable("custom_states", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	color: text().default('#3B82F6').notNull(),
	group: stateGroup().notNull(),
	sequence: integer().default(0).notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_custom_states_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_custom_states_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "custom_states_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "custom_states_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const documents = pgTable("documents", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id"),
	departmentId: integer("department_id"),
	name: text().notNull(),
	description: text(),
	type: documentType().notNull(),
	category: text(),
	fileUrl: text("file_url").notNull(),
	fileName: text("file_name"),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	version: integer().default(1),
	parentDocumentId: integer("parent_document_id"),
	isPublic: boolean("is_public").default(false),
	isActive: boolean("is_active").default(true),
	expiryDate: date("expiry_date"),
	expiryReminderSent: boolean("expiry_reminder_sent").default(false),
	tags: text().array(),
	metadata: jsonb(),
	uploadedBy: text("uploaded_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "documents_department_id_departments_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "documents_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "documents_uploaded_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "documents_user_id_users_id_fk"
		}),
]);

export const goals = pgTable("goals", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	description: text(),
	type: text().default('OKR'),
	targetValue: numeric("target_value"),
	currentValue: numeric("current_value").default('0'),
	unit: text(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	status: text().default('IN_PROGRESS'),
	progress: integer().default(0),
	parentGoalId: integer("parent_goal_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "goals_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "goals_user_id_users_id_fk"
		}),
]);

export const cycles = pgTable("cycles", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	description: text(),
	status: cycleStatus().default('draft').notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_cycles_org_status").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_cycles_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "cycles_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "cycles_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "cycles_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const employeeDevices = pgTable("employee_devices", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	deviceType: text("device_type").notNull(),
	deviceName: text("device_name").notNull(),
	serialNumber: text("serial_number"),
	brand: text(),
	model: text(),
	assignedDate: date("assigned_date"),
	returnDate: date("return_date"),
	status: deviceStatus().default('ACTIVE'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "employee_devices_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "employee_devices_user_id_users_id_fk"
		}),
]);

export const expenseCategories = pgTable("expense_categories", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	description: text(),
	budgetLimit: numeric("budget_limit"),
	budgetPeriod: text("budget_period").default('MONTHLY'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "expense_categories_org_id_organizations_id_fk"
		}),
]);

export const leaveBalances = pgTable("leave_balances", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	leaveTypeId: integer("leave_type_id"),
	balance: numeric().default('0').notNull(),
	year: integer().notNull(),
}, (table) => [
	index("idx_leave_balances_org_year").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.year.asc().nullsLast().op("text_ops")),
	index("idx_leave_balances_type_org").using("btree", table.leaveTypeId.asc().nullsLast().op("text_ops"), table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_leave_balances_user_year").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.year.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.leaveTypeId],
			foreignColumns: [leaveTypes.id],
			name: "leave_balances_leave_type_id_leave_types_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "leave_balances_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "leave_balances_user_id_users_id_fk"
		}),
]);

export const leaveTypes = pgTable("leave_types", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	daysPerYear: integer("days_per_year").notNull(),
	carryForward: boolean("carry_forward").default(false),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "leave_types_org_id_organizations_id_fk"
		}),
]);

export const leads = pgTable("leads", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	whatsappNumber: text("whatsapp_number"),
	source: leadSource().default('other'),
	campaignId: integer("campaign_id"),
	status: leadPipelineStatus().default('NEW').notNull(),
	priority: leadPriority().default('WARM'),
	investmentInterest: numeric("investment_interest"),
	potentialValue: numeric("potential_value"),
	notes: text(),
	assignedToId: text("assigned_to_id"),
	assignedById: text("assigned_by_id"),
	verifiedById: text("verified_by_id"),
	assignedAt: timestamp("assigned_at", { mode: 'string' }),
	convertedAt: timestamp("converted_at", { mode: 'string' }),
	lostReason: text("lost_reason"),
	company: text(),
	designation: text(),
	city: text(),
	referredBy: text("referred_by"),
	tags: text().array(),
	score: integer().default(0),
	slaDeadline: timestamp("sla_deadline", { mode: 'string' }),
	website: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	subSource: text("sub_source"),
	dmLeadId: integer("dm_lead_id"),
	followUpDate: timestamp("follow_up_date", { mode: 'string' }),
	followUpNotes: text("follow_up_notes"),
	customData: jsonb("custom_data"),
	utmSource: text("utm_source"),
	utmMedium: text("utm_medium"),
	utmCampaign: text("utm_campaign"),
	utmContent: text("utm_content"),
	utmTerm: text("utm_term"),
	ipAddress: text("ip_address"),
	referrerUrl: text("referrer_url"),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	mergedIntoId: integer("merged_into_id"),
}, (table) => [
	index("idx_leads_assigned_to").using("btree", table.assignedToId.asc().nullsLast().op("text_ops")),
	index("idx_leads_created_at").using("btree", table.orgId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_leads_org_status").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_leads_score").using("btree", table.score.asc().nullsLast().op("int4_ops")),
	index("idx_leads_source").using("btree", table.source.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.assignedById],
			foreignColumns: [users.id],
			name: "leads_assigned_by_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.assignedToId],
			foreignColumns: [users.id],
			name: "leads_assigned_to_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [crmCampaigns.id],
			name: "leads_campaign_id_crm_campaigns_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "leads_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.verifiedById],
			foreignColumns: [users.id],
			name: "leads_verified_by_id_users_id_fk"
		}),
]);

export const intakeItems = pgTable("intake_items", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	description: jsonb(),
	source: intakeSource().default('manual').notNull(),
	status: intakeStatus().default('pending').notNull(),
	submitterEmail: text("submitter_email"),
	linkedWorkItemId: integer("linked_work_item_id"),
	declineReason: text("decline_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_intake_items_org_status").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_intake_items_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.linkedWorkItemId],
			foreignColumns: [tickets.id],
			name: "intake_items_linked_work_item_id_tickets_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "intake_items_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "intake_items_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const invitations = pgTable("invitations", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	token: text().notNull(),
	orgId: text("org_id").notNull(),
	role: text().default('ENGINEERING').notNull(),
	invitedBy: text("invited_by").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [users.id],
			name: "invitations_invited_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "invitations_org_id_organizations_id_fk"
		}),
	unique("invitations_token_unique").on(table.token),
]);

export const invoiceAiExtractions = pgTable("invoice_ai_extractions", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	invoiceId: integer("invoice_id"),
	fileUrl: text("file_url").notNull(),
	extractedData: jsonb("extracted_data"),
	status: text().default('pending').notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_invoice_ai_extractions_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "invoice_ai_extractions_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "invoice_ai_extractions_invoice_id_invoices_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "invoice_ai_extractions_org_id_organizations_id_fk"
		}),
]);

export const holidays = pgTable("holidays", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	date: date().notNull(),
	message: text(),
	notificationSent: boolean("notification_sent").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	isPublic: boolean("is_public").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "holidays_org_id_organizations_id_fk"
		}),
]);

export const leadActivities = pgTable("lead_activities", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	leadId: integer("lead_id").notNull(),
	type: leadActivityType().notNull(),
	date: timestamp({ mode: 'string' }).notNull(),
	duration: integer(),
	subject: text(),
	location: text(),
	locationLink: text("location_link"),
	messageSummary: text("message_summary"),
	notes: text(),
	outcome: text(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_lead_activities_lead").using("btree", table.leadId.asc().nullsLast().op("int4_ops")),
	index("idx_lead_activities_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "lead_activities_lead_id_leads_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "lead_activities_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "lead_activities_user_id_users_id_fk"
		}),
]);

export const leadEmails = pgTable("lead_emails", {
	id: serial().primaryKey().notNull(),
	leadId: integer("lead_id").notNull(),
	orgId: text("org_id").notNull(),
	direction: leadEmailDirection().notNull(),
	subject: text(),
	body: text(),
	fromEmail: text("from_email").notNull(),
	toEmail: text("to_email").notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }).defaultNow(),
	messageId: text("message_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_lead_emails_lead").using("btree", table.leadId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "lead_emails_lead_id_leads_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "lead_emails_org_id_organizations_id_fk"
		}),
]);

export const helpdeskTickets = pgTable("helpdesk_tickets", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	title: text().notNull(),
	description: text(),
	category: text(),
	priority: ticketPriority().default('MEDIUM'),
	status: ticketStatus().default('TODO'),
	assigneeId: text("assignee_id"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	resolution: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [users.id],
			name: "helpdesk_tickets_assignee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "helpdesk_tickets_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "helpdesk_tickets_user_id_users_id_fk"
		}),
]);

export const leadAssignmentRules = pgTable("lead_assignment_rules", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	conditions: jsonb().default([]),
	assignmentType: assignmentRuleType("assignment_type").notNull(),
	assignToUserId: text("assign_to_user_id"),
	roundRobinUserIds: jsonb("round_robin_user_ids").default([]),
	priority: integer().default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_lead_assignment_rules_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assignToUserId],
			foreignColumns: [users.id],
			name: "lead_assignment_rules_assign_to_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "lead_assignment_rules_org_id_organizations_id_fk"
		}),
]);

export const leadTasks = pgTable("lead_tasks", {
	id: serial().primaryKey().notNull(),
	leadId: integer("lead_id").notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	dueDate: date("due_date"),
	assigneeId: text("assignee_id"),
	status: leadTaskStatus().default('open').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_lead_tasks_lead").using("btree", table.leadId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [users.id],
			name: "lead_tasks_assignee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "lead_tasks_lead_id_leads_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "lead_tasks_org_id_organizations_id_fk"
		}),
]);

export const leaveRequests = pgTable("leave_requests", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	leaveTypeId: integer("leave_type_id"),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	reason: text(),
	status: leaveStatus().default('PENDING'),
	approverId: text("approver_id"),
	rejectionReason: text("rejection_reason"),
	attachmentUrl: text("attachment_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	priority: text().default('MEDIUM'),
	managerComment: text("manager_comment"),
	isHalfDay: boolean("is_half_day").default(false).notNull(),
	halfDayPeriod: text("half_day_period"),
	coveringEmployeeId: text("covering_employee_id"),
	lopDays: numeric("lop_days", { precision: 5, scale:  1 }).default('0').notNull(),
}, (table) => [
	index("idx_leave_requests_org_status").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_leave_requests_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approverId],
			foreignColumns: [users.id],
			name: "leave_requests_approver_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.coveringEmployeeId],
			foreignColumns: [users.id],
			name: "leave_requests_covering_employee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.leaveTypeId],
			foreignColumns: [leaveTypes.id],
			name: "leave_requests_leave_type_id_leave_types_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "leave_requests_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "leave_requests_user_id_users_id_fk"
		}),
]);

export const modules = pgTable("modules", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	description: text(),
	status: moduleStatus().default('backlog').notNull(),
	leadId: text("lead_id"),
	startDate: date("start_date"),
	endDate: date("end_date"),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_modules_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_modules_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "modules_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [users.id],
			name: "modules_lead_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "modules_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "modules_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id"),
	type: notificationType().default('INFO'),
	title: text().notNull(),
	message: text().notNull(),
	link: text(),
	isRead: boolean("is_read").default(false),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	channel: text().default('in_app'),
	sound: boolean().default(false),
}, (table) => [
	index("idx_notifications_unread").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.isRead.asc().nullsLast().op("text_ops")),
	index("idx_notifications_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "notifications_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}),
]);

export const onboardingSteps = pgTable("onboarding_steps", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	stepName: text("step_name").notNull(),
	status: onboardingStatus().default('PENDING'),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "onboarding_steps_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "onboarding_steps_user_id_users_id_fk"
		}),
]);

export const organizationMembers = pgTable("organization_members", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	orgId: text("org_id").notNull(),
	role: text().default('ENGINEERING').notNull(),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_org_members_org_role").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.role.asc().nullsLast().op("text_ops")),
	uniqueIndex("uniq_org_members_user_org").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "organization_members_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "organization_members_user_id_users_id_fk"
		}),
]);

export const leadNotes = pgTable("lead_notes", {
	id: serial().primaryKey().notNull(),
	leadId: integer("lead_id").notNull(),
	orgId: text("org_id").notNull(),
	authorId: text("author_id").notNull(),
	body: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_lead_notes_lead").using("btree", table.leadId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "lead_notes_author_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "lead_notes_lead_id_leads_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "lead_notes_org_id_organizations_id_fk"
		}),
]);

export const leadScoringRules = pgTable("lead_scoring_rules", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	field: text().notNull(),
	operator: scoringOperator().notNull(),
	value: text().notNull(),
	points: integer().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_lead_scoring_rules_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "lead_scoring_rules_org_id_organizations_id_fk"
		}),
]);

export const performanceReviews = pgTable("performance_reviews", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	reviewerId: text("reviewer_id"),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	status: reviewStatus().default('DRAFT'),
	ratings: jsonb(),
	strengths: text(),
	improvements: text(),
	goals: jsonb(),
	overallRating: numeric("overall_rating"),
	comments: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	cycleId: integer("cycle_id"),
}, (table) => [
	index("idx_perf_reviews_org_cycle").using("btree", table.orgId.asc().nullsLast().op("int4_ops"), table.cycleId.asc().nullsLast().op("int4_ops")),
	index("idx_perf_reviews_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.cycleId],
			foreignColumns: [reviewCycles.id],
			name: "performance_reviews_cycle_id_review_cycles_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "performance_reviews_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.reviewerId],
			foreignColumns: [users.id],
			name: "performance_reviews_reviewer_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "performance_reviews_user_id_users_id_fk"
		}),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	token: text().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("password_reset_tokens_token_unique").on(table.token),
]);

export const projectMembers = pgTable("project_members", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	userId: text("user_id").notNull(),
	role: text().default('CONTRIBUTOR'),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
	hourlyRate: numeric("hourly_rate").default('0'),
}, (table) => [
	uniqueIndex("uniq_project_members_project_user").using("btree", table.projectId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_members_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "project_members_user_id_users_id_fk"
		}),
]);

export const projectStatuses = pgTable("project_statuses", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	projectId: integer("project_id").notNull(),
	name: text().notNull(),
	order: integer().default(0).notNull(),
	color: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "project_statuses_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_statuses_project_id_projects_id_fk"
		}),
]);

export const projectViews = pgTable("project_views", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	orgId: text("org_id").notNull(),
	createdBy: text("created_by").notNull(),
	name: text().notNull(),
	filters: jsonb().default({}),
	groupBy: text("group_by"),
	orderBy: text("order_by"),
	layoutType: viewLayout("layout_type").default('board').notNull(),
	isPinned: boolean("is_pinned").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_project_views_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_project_views_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "project_views_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "project_views_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_views_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const permissions = pgTable("permissions", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	resource: text().notNull(),
	action: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("permissions_name_unique").on(table.name),
]);

export const pages = pgTable("pages", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	content: jsonb(),
	icon: text(),
	coverImage: text("cover_image"),
	isPublic: boolean("is_public").default(false).notNull(),
	isPinned: boolean("is_pinned").default(false).notNull(),
	parentPageId: integer("parent_page_id"),
	createdBy: text("created_by").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_pages_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_pages_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "pages_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "pages_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.parentPageId],
			foreignColumns: [table.id],
			name: "pages_parent_page_id_pages_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "pages_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const qrCodes = pgTable("qr_codes", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	targetUrl: text("target_url").notNull(),
	slug: text().notNull(),
	imageUrl: text("image_url").notNull(),
	scanCount: integer("scan_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "qr_codes_org_id_organizations_id_fk"
		}),
	unique("qr_codes_slug_unique").on(table.slug),
]);

export const reports = pgTable("reports", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	type: text().notNull(),
	config: jsonb(),
	createdBy: text("created_by"),
	isScheduled: boolean("is_scheduled").default(false),
	scheduleConfig: jsonb("schedule_config"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "reports_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "reports_org_id_organizations_id_fk"
		}),
]);

export const rolePermissions = pgTable("role_permissions", {
	id: serial().primaryKey().notNull(),
	role: text().notNull(),
	permissionId: integer("permission_id").notNull(),
	orgId: text("org_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "role_permissions_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "role_permissions_permission_id_permissions_id_fk"
		}),
]);

export const roles = pgTable("roles", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	orgId: text("org_id").notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	permissions: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("uniq_role_slug_org").using("btree", table.slug.asc().nullsLast().op("text_ops"), table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "roles_org_id_organizations_id_fk"
		}),
]);

export const salaryStructures = pgTable("salary_structures", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	basicSalary: numeric("basic_salary").notNull(),
	hraPercentage: numeric("hra_percentage").default('40'),
	allowances: numeric().default('0'),
	deductions: numeric().default('0'),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "salary_structures_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "salary_structures_user_id_users_id_fk"
		}),
]);

export const sessions = pgTable("sessions", {
	sessionToken: text("session_token").primaryKey().notNull(),
	userId: text("user_id").notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}),
]);

export const sprints = pgTable("sprints", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	projectId: integer("project_id"),
	name: text().notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	goal: text(),
	status: text().default('PLANNED'),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "sprints_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "sprints_project_id_projects_id_fk"
		}),
]);

export const projects = pgTable("projects", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	description: text(),
	key: text().notNull(),
	clientId: text("client_id"),
	managerId: text("manager_id"),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	status: projectStatus().default('ACTIVE'),
	settings: jsonb(),
	dealId: integer("deal_id"),
	budget: numeric(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [users.id],
			name: "projects_client_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [users.id],
			name: "projects_manager_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "projects_org_id_organizations_id_fk"
		}),
	unique("projects_key_unique").on(table.key),
]);

export const ticketAttachments = pgTable("ticket_attachments", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	ticketId: integer("ticket_id").notNull(),
	fileUrl: text("file_url").notNull(),
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	uploadedBy: text("uploaded_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "ticket_attachments_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "ticket_attachments_ticket_id_tickets_id_fk"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "ticket_attachments_uploaded_by_users_id_fk"
		}),
]);

export const timesheets = pgTable("timesheets", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id"),
	ticketId: integer("ticket_id"),
	date: date().notNull(),
	hours: numeric().default('0'),
	description: text(),
	imageUrl: text("image_url"),
	workLink: text("work_link"),
	status: text().default('PENDING'),
	approvedBy: text("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	isBillable: boolean("is_billable").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_timesheets_user_date").using("btree", table.userId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "timesheets_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "timesheets_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "timesheets_ticket_id_tickets_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "timesheets_user_id_users_id_fk"
		}),
]);

export const tickets = pgTable("tickets", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	description: text(),
	type: text().default('TASK').notNull(),
	status: text().default('TODO').notNull(),
	priority: ticketPriority().default('MEDIUM'),
	projectId: integer("project_id"),
	ticketNumber: integer("ticket_number").notNull(),
	sprintId: integer("sprint_id"),
	epicId: integer("epic_id"),
	assigneeId: text("assignee_id"),
	reporterId: text("reporter_id"),
	points: integer(),
	storyPoints: integer("story_points"),
	link: text(),
	order: integer().default(0),
	parentTicketId: integer("parent_ticket_id"),
	originalEstimate: numeric("original_estimate"),
	timeSpent: numeric("time_spent").default('0'),
	startDate: date("start_date"),
	dueDate: date("due_date"),
	stateId: integer("state_id"),
	moduleId: integer("module_id"),
	cycleId: integer("cycle_id"),
	sequenceId: text("sequence_id"),
	estimate: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	completionPercentage: integer("completion_percentage").default(0),
}, (table) => [
	index("idx_tickets_assignee_id").using("btree", table.assigneeId.asc().nullsLast().op("text_ops")),
	index("idx_tickets_org_status").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_tickets_project_id").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	index("idx_tickets_sprint_id").using("btree", table.sprintId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [users.id],
			name: "tickets_assignee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.epicId],
			foreignColumns: [table.id],
			name: "tickets_epic_id_tickets_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "tickets_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.parentTicketId],
			foreignColumns: [table.id],
			name: "tickets_parent_ticket_id_tickets_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "tickets_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.reporterId],
			foreignColumns: [users.id],
			name: "tickets_reporter_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.sprintId],
			foreignColumns: [sprints.id],
			name: "tickets_sprint_id_sprints_id_fk"
		}),
]);

export const verificationTokens = pgTable("verification_tokens", {
	identifier: text().notNull(),
	token: text().notNull(),
	expires: timestamp({ mode: 'string' }).notNull(),
});

export const supportTickets = pgTable("support_tickets", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	clientId: integer("client_id"),
	assigneeId: text("assignee_id"),
	title: text().notNull(),
	description: text(),
	status: supportTicketStatus().default('OPEN').notNull(),
	priority: supportTicketPriority().default('MEDIUM').notNull(),
	slaDeadline: timestamp("sla_deadline", { mode: 'string' }),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	closedAt: timestamp("closed_at", { mode: 'string' }),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_support_tickets_assignee").using("btree", table.assigneeId.asc().nullsLast().op("text_ops")),
	index("idx_support_tickets_client").using("btree", table.clientId.asc().nullsLast().op("int4_ops")),
	index("idx_support_tickets_org_status").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_support_tickets_priority").using("btree", table.priority.asc().nullsLast().op("enum_ops")),
	index("idx_support_tickets_sla").using("btree", table.slaDeadline.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [users.id],
			name: "support_tickets_assignee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "support_tickets_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "support_tickets_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "support_tickets_org_id_organizations_id_fk"
		}),
]);

export const supportTicketMessages = pgTable("support_ticket_messages", {
	id: serial().primaryKey().notNull(),
	ticketId: integer("ticket_id").notNull(),
	authorId: text("author_id").notNull(),
	body: text().notNull(),
	isInternal: boolean("is_internal").default(false).notNull(),
	attachments: jsonb().default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_support_ticket_messages_author").using("btree", table.authorId.asc().nullsLast().op("text_ops")),
	index("idx_support_ticket_messages_ticket").using("btree", table.ticketId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "support_ticket_messages_author_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [supportTickets.id],
			name: "support_ticket_messages_ticket_id_support_tickets_id_fk"
		}).onDelete("cascade"),
]);

export const ticketAssignees = pgTable("ticket_assignees", {
	id: serial().primaryKey().notNull(),
	ticketId: integer("ticket_id").notNull(),
	userId: text("user_id").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	assignedBy: text("assigned_by"),
}, (table) => [
	index("idx_ticket_assignees_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	uniqueIndex("uniq_ticket_assignees_ticket_user").using("btree", table.ticketId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "ticket_assignees_assigned_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "ticket_assignees_ticket_id_tickets_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ticket_assignees_user_id_users_id_fk"
		}),
]);

export const targets = pgTable("targets", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	metricType: text("metric_type").notNull(),
	targetValue: numeric("target_value").notNull(),
	currentValue: numeric("current_value").default('0'),
	period: text().default('daily'),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	setById: text("set_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	notes: text(),
	branchId: integer("branch_id"),
	parentTargetId: integer("parent_target_id"),
}, (table) => [
	index("idx_targets_branch").using("btree", table.branchId.asc().nullsLast().op("int4_ops")),
	index("idx_targets_user_period").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.period.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "targets_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.parentTargetId],
			foreignColumns: [table.id],
			name: "targets_parent_target_id_targets_id_fk"
		}),
	foreignKey({
			columns: [table.setById],
			foreignColumns: [users.id],
			name: "targets_set_by_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "targets_user_id_users_id_fk"
		}),
]);

export const ticketLabels = pgTable("ticket_labels", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	color: text().default('#3B82F6'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "ticket_labels_org_id_organizations_id_fk"
		}),
]);

export const wfhRequests = pgTable("wfh_requests", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	date: date().notNull(),
	reason: text(),
	status: wfhRequestStatus().default('PENDING'),
	approverId: text("approver_id"),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.approverId],
			foreignColumns: [users.id],
			name: "wfh_requests_approver_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "wfh_requests_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "wfh_requests_user_id_users_id_fk"
		}),
]);

export const workItemRelations = pgTable("work_item_relations", {
	id: serial().primaryKey().notNull(),
	workItemId: integer("work_item_id").notNull(),
	relatedWorkItemId: integer("related_work_item_id").notNull(),
	relationType: workItemRelationType("relation_type").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_work_item_relations_item").using("btree", table.workItemId.asc().nullsLast().op("int4_ops")),
	index("idx_work_item_relations_related").using("btree", table.relatedWorkItemId.asc().nullsLast().op("int4_ops")),
	uniqueIndex("uniq_work_item_relation").using("btree", table.workItemId.asc().nullsLast().op("int4_ops"), table.relatedWorkItemId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.relatedWorkItemId],
			foreignColumns: [tickets.id],
			name: "work_item_relations_related_work_item_id_tickets_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.workItemId],
			foreignColumns: [tickets.id],
			name: "work_item_relations_work_item_id_tickets_id_fk"
		}).onDelete("cascade"),
]);

export const ticketComments = pgTable("ticket_comments", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	ticketId: integer("ticket_id").notNull(),
	userId: text("user_id").notNull(),
	content: text().notNull(),
	parentCommentId: integer("parent_comment_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "ticket_comments_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "ticket_comments_ticket_id_tickets_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ticket_comments_user_id_users_id_fk"
		}),
]);

export const crmMonthlyMetrics = pgTable("crm_monthly_metrics", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	month: text().notNull(),
	revenue: numeric().default('0'),
	mqls: integer().default(0),
	retention: numeric().default('0'),
	csat: numeric().default('0'),
	ticketVolume: integer("ticket_volume").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "crm_monthly_metrics_org_id_organizations_id_fk"
		}),
]);

export const departmentMembers = pgTable("department_members", {
	id: serial().primaryKey().notNull(),
	departmentId: integer("department_id").notNull(),
	userId: text("user_id").notNull(),
	role: text().default('member'),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("uniq_dept_members_dept_user").using("btree", table.departmentId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "department_members_department_id_departments_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "department_members_user_id_users_id_fk"
		}),
]);

export const moduleLinks = pgTable("module_links", {
	id: serial().primaryKey().notNull(),
	moduleId: integer("module_id").notNull(),
	linkedModuleId: integer("linked_module_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("uniq_module_links").using("btree", table.moduleId.asc().nullsLast().op("int4_ops"), table.linkedModuleId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.linkedModuleId],
			foreignColumns: [modules.id],
			name: "module_links_linked_module_id_modules_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.id],
			name: "module_links_module_id_modules_id_fk"
		}).onDelete("cascade"),
]);

export const ticketLabelMappings = pgTable("ticket_label_mappings", {
	id: serial().primaryKey().notNull(),
	ticketId: integer("ticket_id").notNull(),
	labelId: integer("label_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.labelId],
			foreignColumns: [ticketLabels.id],
			name: "ticket_label_mappings_label_id_ticket_labels_id_fk"
		}),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "ticket_label_mappings_ticket_id_tickets_id_fk"
		}),
]);

export const userPermissions = pgTable("user_permissions", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	permissionId: integer("permission_id").notNull(),
	orgId: text("org_id").notNull(),
	granted: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "user_permissions_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "user_permissions_permission_id_permissions_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_permissions_user_id_users_id_fk"
		}),
]);

export const targetHistory = pgTable("target_history", {
	id: serial().primaryKey().notNull(),
	targetId: integer("target_id").notNull(),
	orgId: text("org_id").notNull(),
	changedById: text("changed_by_id").notNull(),
	field: text().notNull(),
	oldValue: text("old_value"),
	newValue: text("new_value"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_target_history_target").using("btree", table.targetId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.changedById],
			foreignColumns: [users.id],
			name: "target_history_changed_by_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "target_history_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.targetId],
			foreignColumns: [targets.id],
			name: "target_history_target_id_targets_id_fk"
		}).onDelete("cascade"),
]);

export const dmLeads = pgTable("dm_leads", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	phone: text(),
	email: text(),
	whatsappNumber: text("whatsapp_number"),
	sourcePlatform: text("source_platform").notNull(),
	campaignId: integer("campaign_id"),
	campaignType: text("campaign_type"),
	leadQuality: text("lead_quality").default('warm'),
	notes: text(),
	landingPageUrl: text("landing_page_url"),
	dateCaptured: timestamp("date_captured", { mode: 'string' }).defaultNow().notNull(),
	status: dmLeadStatus().default('pending_review').notNull(),
	verifiedBy: text("verified_by"),
	importedLeadId: integer("imported_lead_id"),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_dm_leads_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_dm_leads_platform").using("btree", table.sourcePlatform.asc().nullsLast().op("text_ops")),
	index("idx_dm_leads_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [crmCampaigns.id],
			name: "dm_leads_campaign_id_crm_campaigns_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "dm_leads_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.importedLeadId],
			foreignColumns: [leads.id],
			name: "dm_leads_imported_lead_id_leads_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "dm_leads_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [users.id],
			name: "dm_leads_verified_by_users_id_fk"
		}),
]);

export const incentiveConfig = pgTable("incentive_config", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	branchId: integer("branch_id"),
	incentiveRate: numeric("incentive_rate", { precision: 5, scale:  2 }).notNull(),
	effectiveFrom: timestamp("effective_from", { mode: 'string' }).defaultNow().notNull(),
	effectiveTo: timestamp("effective_to", { mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "incentive_config_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "incentive_config_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "incentive_config_org_id_organizations_id_fk"
		}),
]);

export const incentives = pgTable("incentives", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	branchId: integer("branch_id"),
	clientAccountId: integer("client_account_id").notNull(),
	salesRepId: text("sales_rep_id").notNull(),
	investmentAmount: numeric("investment_amount", { precision: 15, scale:  2 }).notNull(),
	incentiveRate: numeric("incentive_rate", { precision: 5, scale:  2 }).notNull(),
	calculatedAmount: numeric("calculated_amount", { precision: 15, scale:  2 }).notNull(),
	approvedAmount: numeric("approved_amount", { precision: 15, scale:  2 }),
	status: incentiveStatus().default('PENDING').notNull(),
	approvedBy: text("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	payrollId: integer("payroll_id"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_incentives_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_incentives_sales_rep").using("btree", table.salesRepId.asc().nullsLast().op("text_ops")),
	index("idx_incentives_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "incentives_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "incentives_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.clientAccountId],
			foreignColumns: [clientAccounts.id],
			name: "incentives_client_account_id_client_accounts_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "incentives_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.payrollId],
			foreignColumns: [payrolls.id],
			name: "incentives_payroll_id_payrolls_id_fk"
		}),
	foreignKey({
			columns: [table.salesRepId],
			foreignColumns: [users.id],
			name: "incentives_sales_rep_id_users_id_fk"
		}),
]);

export const branches = pgTable("branches", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	code: text().notNull(),
	city: text(),
	address: text(),
	branchManagerId: text("branch_manager_id"),
	branchHrId: text("branch_hr_id"),
	status: branchStatus().default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	state: text(),
	country: text().default('India'),
	pincode: text(),
	phone: text(),
	email: text(),
}, (table) => [
	index("idx_branches_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	uniqueIndex("uniq_branch_code_org").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.code.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.branchHrId],
			foreignColumns: [users.id],
			name: "branches_branch_hr_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.branchManagerId],
			foreignColumns: [users.id],
			name: "branches_branch_manager_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "branches_org_id_organizations_id_fk"
		}),
]);

export const clientAccounts = pgTable("client_accounts", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	branchId: integer("branch_id"),
	leadId: integer("lead_id").notNull(),
	salesRepId: text("sales_rep_id").notNull(),
	assignedCrmId: text("assigned_crm_id"),
	clientName: text("client_name").notNull(),
	clientEmail: text("client_email"),
	clientPhone: text("client_phone"),
	clientWhatsapp: text("client_whatsapp"),
	status: clientAccountStatus().default('ACCOUNT_OPENING').notNull(),
	investmentAmount: numeric("investment_amount", { precision: 15, scale:  2 }),
	planName: text("plan_name"),
	investmentDate: timestamp("investment_date", { mode: 'string' }),
	transactionRef: text("transaction_ref"),
	conversionNotes: text("conversion_notes"),
	estimatedInvestment: numeric("estimated_investment", { precision: 15, scale:  2 }),
	convertedAt: timestamp("converted_at", { mode: 'string' }).defaultNow().notNull(),
	investedAt: timestamp("invested_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	renewalStage: text("renewal_stage").default('upcoming').notNull(),
	renewalDate: date("renewal_date"),
	renewalNotes: text("renewal_notes"),
}, (table) => [
	index("idx_client_accounts_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_client_accounts_sales_rep").using("btree", table.salesRepId.asc().nullsLast().op("text_ops")),
	index("idx_client_accounts_status").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assignedCrmId],
			foreignColumns: [users.id],
			name: "client_accounts_assigned_crm_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.branchId],
			foreignColumns: [branches.id],
			name: "client_accounts_branch_id_branches_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "client_accounts_lead_id_leads_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "client_accounts_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.salesRepId],
			foreignColumns: [users.id],
			name: "client_accounts_sales_rep_id_users_id_fk"
		}),
]);

export const clientAccountActivities = pgTable("client_account_activities", {
	id: serial().primaryKey().notNull(),
	clientAccountId: integer("client_account_id").notNull(),
	userId: text("user_id").notNull(),
	activityType: text("activity_type").notNull(),
	title: text().notNull(),
	description: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_client_account_activities_account").using("btree", table.clientAccountId.asc().nullsLast().op("int4_ops")),
	index("idx_client_account_activities_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientAccountId],
			foreignColumns: [clientAccounts.id],
			name: "client_account_activities_client_account_id_client_accounts_id_"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "client_account_activities_user_id_users_id_fk"
		}),
]);

export const socialMediaStats = pgTable("social_media_stats", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	platform: socialPlatform().notNull(),
	date: date().notNull(),
	postsPublished: integer("posts_published").default(0),
	storiesReels: integer("stories_reels").default(0),
	followersTotal: integer("followers_total").default(0),
	engagementRate: numeric("engagement_rate", { precision: 5, scale:  2 }),
	impressions: integer().default(0),
	reach: integer().default(0),
	linkClicks: integer("link_clicks").default(0),
	profileVisits: integer("profile_visits").default(0),
	enteredBy: text("entered_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.enteredBy],
			foreignColumns: [users.id],
			name: "social_media_stats_entered_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "social_media_stats_org_id_organizations_id_fk"
		}),
	unique("uniq_social_stats_org_platform_date").on(table.orgId, table.platform, table.date),
]);

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	emailVerified: timestamp("email_verified", { mode: 'string' }),
	password: text(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	gender: gender(),
	skills: text().array(),
	experienceYears: numeric("experience_years"),
	joiningDate: date("joining_date"),
	dateOfBirth: date("date_of_birth"),
	taxId: text("tax_id"),
	bankDetails: jsonb("bank_details"),
	image: text(),
	role: text().default('ENGINEERING').notNull(),
	departmentId: integer("department_id"),
	designation: text(),
	phone: text(),
	whatsappNumber: text("whatsapp_number"),
	whatsappSameAsPhone: boolean("whatsapp_same_as_phone").default(true),
	monthlySalary: numeric("monthly_salary"),
	employeeId: text("employee_id"),
	metadata: jsonb(),
	isPasswordChangeRequired: boolean("is_password_change_required").default(false),
	loginAttempts: integer("login_attempts").default(0).notNull(),
	lockedUntil: timestamp("locked_until", { mode: 'string' }),
	isActive: boolean("is_active").default(true).notNull(),
	hasDashboardAccess: boolean("has_dashboard_access").default(false).notNull(),
	reportingTo: text("reporting_to"),
	team: text(),
	emergencyContact: jsonb("emergency_contact"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	branchId: integer("branch_id"),
	totpSecret: text("totp_secret"),
	totpEnabled: boolean("totp_enabled").default(false).notNull(),
	googleRefreshToken: text("google_refresh_token"),
	googleEmail: text("google_email"),
	passwordChangedAt: timestamp("password_changed_at", { mode: 'string' }),
	isProfilePictureRequired: boolean("is_profile_picture_required").default(false),
	bio: text(),
	linkedinUrl: text("linkedin_url"),
	twitterUrl: text("twitter_url"),
	githubUrl: text("github_url"),
	websiteUrl: text("website_url"),
	onboardingDocStatus: onboardingDocStatus("onboarding_doc_status").default('PENDING'),
}, (table) => [
	index("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.reportingTo],
			foreignColumns: [table.id],
			name: "users_reporting_to_users_id_fk"
		}),
	unique("users_email_unique").on(table.email),
]);

export const chatMessages = pgTable("chat_messages", {
	id: serial().primaryKey().notNull(),
	channelId: integer("channel_id").notNull(),
	senderId: text("sender_id").notNull(),
	content: text(),
	replyToId: integer("reply_to_id"),
	isEdited: boolean("is_edited").default(false).notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	messageType: chatMessageType("message_type").default('text').notNull(),
	metadata: jsonb(),
	actionStatus: text("action_status"),
	reactions: jsonb().default({}).notNull(),
}, (table) => [
	index("idx_chat_messages_channel").using("btree", table.channelId.asc().nullsLast().op("int4_ops"), table.createdAt.asc().nullsLast().op("int4_ops")),
	index("idx_chat_messages_sender").using("btree", table.senderId.asc().nullsLast().op("text_ops")),
	index("idx_chat_messages_unread").using("btree", table.channelId.asc().nullsLast().op("int4_ops"), table.createdAt.asc().nullsLast().op("int4_ops"), table.senderId.asc().nullsLast().op("int4_ops"), table.isDeleted.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.channelId],
			foreignColumns: [chatChannels.id],
			name: "chat_messages_channel_id_chat_channels_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [users.id],
			name: "chat_messages_sender_id_users_id_fk"
		}),
]);

export const webhookEndpoints = pgTable("webhook_endpoints", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	url: text().notNull(),
	secret: text().notNull(),
	description: text(),
	events: jsonb().default([]),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_webhook_endpoints_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "webhook_endpoints_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "webhook_endpoints_org_id_organizations_id_fk"
		}),
]);

export const webhookLogs = pgTable("webhook_logs", {
	id: serial().primaryKey().notNull(),
	endpointId: integer("endpoint_id").notNull(),
	orgId: text("org_id").notNull(),
	event: text().notNull(),
	payload: jsonb(),
	statusCode: integer("status_code"),
	responseBody: text("response_body"),
	attempt: integer().default(1).notNull(),
	success: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_webhook_logs_endpoint").using("btree", table.endpointId.asc().nullsLast().op("int4_ops")),
	index("idx_webhook_logs_org_event").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.event.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.endpointId],
			foreignColumns: [webhookEndpoints.id],
			name: "webhook_logs_endpoint_id_webhook_endpoints_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "webhook_logs_org_id_organizations_id_fk"
		}),
]);

export const payments = pgTable("payments", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	invoiceId: integer("invoice_id").notNull(),
	amount: numeric({ precision: 12, scale:  2 }).notNull(),
	paymentDate: date("payment_date").notNull(),
	paymentMethod: text("payment_method").notNull(),
	referenceNumber: text("reference_number"),
	notes: text(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_payments_invoice").using("btree", table.invoiceId.asc().nullsLast().op("int4_ops")),
	index("idx_payments_org_date").using("btree", table.orgId.asc().nullsLast().op("date_ops"), table.paymentDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "payments_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.invoiceId],
			foreignColumns: [invoices.id],
			name: "payments_invoice_id_invoices_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "payments_org_id_organizations_id_fk"
		}),
]);

export const expenses = pgTable("expenses", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	categoryId: integer("category_id"),
	category: text().notNull(),
	amount: numeric().notNull(),
	currency: text().default('INR'),
	description: text(),
	receiptUrl: text("receipt_url"),
	receiptFileName: text("receipt_file_name"),
	merchant: text(),
	paymentMethod: text("payment_method"),
	projectId: integer("project_id"),
	status: expenseStatus().default('PENDING'),
	approverId: text("approver_id"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	transactionRef: text("transaction_ref"),
	expenseDate: date("expense_date").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_expenses_category").using("btree", table.categoryId.asc().nullsLast().op("int4_ops")),
	index("idx_expenses_date").using("btree", table.expenseDate.asc().nullsLast().op("date_ops")),
	index("idx_expenses_org_status").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_expenses_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approverId],
			foreignColumns: [users.id],
			name: "expenses_approver_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [expenseCategories.id],
			name: "expenses_category_id_expense_categories_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "expenses_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "expenses_project_id_projects_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "expenses_user_id_users_id_fk"
		}),
]);

export const payrolls = pgTable("payrolls", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	month: text().notNull(),
	basicSalary: numeric("basic_salary").notNull(),
	hra: numeric().default('0'),
	allowances: numeric().default('0'),
	deductions: numeric().default('0'),
	grossSalary: numeric("gross_salary").notNull(),
	netSalary: numeric("net_salary").notNull(),
	status: payrollStatus().default('DRAFT'),
	generatedBy: text("generated_by"),
	approvedBy: text("approved_by"),
	overtimeType: text("overtime_type"),
	overtimeDays: numeric("overtime_days").default('0'),
	overtimeHours: numeric("overtime_hours").default('0'),
	overtimeAmount: numeric("overtime_amount").default('0'),
	payslipUrl: text("payslip_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_payrolls_org_month").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.month.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "payrolls_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.generatedBy],
			foreignColumns: [users.id],
			name: "payrolls_generated_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "payrolls_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payrolls_user_id_users_id_fk"
		}),
]);

export const calendarEvents = pgTable("calendar_events", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	description: text(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	allDay: boolean("all_day").default(false),
	color: text(),
	category: text().notNull(),
	entityType: text("entity_type"),
	entityId: text("entity_id"),
	createdBy: text("created_by").notNull(),
	attendeeIds: jsonb("attendee_ids").default([]),
	isRecurring: boolean("is_recurring").default(false),
	recurringRule: text("recurring_rule"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	location: text(),
	agenda: text(),
	postMeetingNotes: text("post_meeting_notes"),
	linkedDealId: integer("linked_deal_id"),
	linkedLeadId: integer("linked_lead_id"),
	reminder15MinSent: boolean("reminder_15min_sent").default(false),
}, (table) => [
	index("idx_calendar_events_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_calendar_events_created_by").using("btree", table.createdBy.asc().nullsLast().op("text_ops")),
	index("idx_calendar_events_org_date").using("btree", table.orgId.asc().nullsLast().op("timestamp_ops"), table.startDate.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "calendar_events_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "calendar_events_org_id_organizations_id_fk"
		}),
]);

export const invoices = pgTable("invoices", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	clientId: integer("client_id"),
	projectId: integer("project_id"),
	invoiceNumber: text("invoice_number").notNull(),
	status: invoiceStatus().default('DRAFT').notNull(),
	lineItems: jsonb("line_items").default([]),
	subtotal: numeric().default('0').notNull(),
	taxRate: numeric("tax_rate").default('0'),
	taxAmount: numeric("tax_amount").default('0'),
	discount: numeric().default('0'),
	total: numeric().default('0').notNull(),
	currency: text().default('INR').notNull(),
	dueDate: date("due_date"),
	notes: text(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	terms: text(),
	isRecurring: boolean("is_recurring").default(false).notNull(),
	recurringInterval: text("recurring_interval"),
	nextRecurringDate: date("next_recurring_date"),
	viewedAt: timestamp("viewed_at", { mode: 'string' }),
}, (table) => [
	index("idx_invoices_client").using("btree", table.clientId.asc().nullsLast().op("int4_ops")),
	index("idx_invoices_due_date").using("btree", table.dueDate.asc().nullsLast().op("date_ops")),
	index("idx_invoices_org_status").using("btree", table.orgId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("idx_invoices_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "invoices_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "invoices_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "invoices_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "invoices_project_id_projects_id_fk"
		}),
]);

export const deals = pgTable("deals", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	leadId: integer("lead_id"),
	clientId: integer("client_id"),
	name: text().notNull(),
	value: numeric().default('0'),
	stage: dealStage().default('LEAD').notNull(),
	probability: integer().default(0),
	contactPerson: text("contact_person"),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	assignedToId: text("assigned_to_id"),
	lastContactDate: timestamp("last_contact_date", { mode: 'string' }),
	expectedCloseDate: date("expected_close_date"),
	actualCloseDate: date("actual_close_date"),
	lostReason: text("lost_reason"),
	notes: text(),
	linkedLeadId: integer("linked_lead_id"),
	linkedClientId: integer("linked_client_id"),
	slaDeadline: timestamp("sla_deadline", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	followUpDate: timestamp("follow_up_date", { mode: 'string' }),
	followUpNotes: text("follow_up_notes"),
	customData: jsonb("custom_data"),
}, (table) => [
	index("idx_deals_assigned_to").using("btree", table.assignedToId.asc().nullsLast().op("text_ops")),
	index("idx_deals_org_stage").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.stage.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assignedToId],
			foreignColumns: [users.id],
			name: "deals_assigned_to_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "deals_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "deals_lead_id_leads_id_fk"
		}),
	foreignKey({
			columns: [table.linkedClientId],
			foreignColumns: [clients.id],
			name: "deals_linked_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.linkedLeadId],
			foreignColumns: [leads.id],
			name: "deals_linked_lead_id_leads_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "deals_org_id_organizations_id_fk"
		}),
]);

export const passwordHistory = pgTable("password_history", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	passwordHash: text("password_hash").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_password_history_user").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_history_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const organizations = pgTable("organizations", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	logo: text(),
	website: text(),
	industry: text(),
	timezone: text().default('Asia/Kolkata'),
	currency: text().default('INR'),
	fiscalYearStart: integer("fiscal_year_start").default(4),
	settings: jsonb(),
	billingEmail: text("billing_email"),
	address: jsonb(),
	mfaEnforced: boolean("mfa_enforced").default(false).notNull(),
	allowedEmailDomains: text("allowed_email_domains").array().default([""]),
	passwordExpiryDays: integer("password_expiry_days"),
}, (table) => [
	unique("organizations_slug_unique").on(table.slug),
]);

export const candidates = pgTable("candidates", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	email: text().notNull(),
	phone: text(),
	resumeUrl: text("resume_url"),
	linkedinUrl: text("linkedin_url"),
	portfolioUrl: text("portfolio_url"),
	currentCompany: text("current_company"),
	currentRole: text("current_role"),
	experienceYears: numeric("experience_years"),
	skills: text().array(),
	source: text().default('DIRECT'),
	status: candidateStatus().default('NEW'),
	notes: text(),
	rating: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	referredBy: text("referred_by"),
	externalId: text("external_id"),
	duplicateOfId: integer("duplicate_of_id"),
	resumeText: text("resume_text"),
	aiScore: integer("ai_score"),
	aiScoreBreakdown: jsonb("ai_score_breakdown"),
	aiScoreGeneratedAt: timestamp("ai_score_generated_at", { mode: 'string' }),
	bgvStatus: text("bgv_status").default('NOT_INITIATED'),
	bgvAgency: text("bgv_agency"),
	bgvNotes: text("bgv_notes"),
	bgvInitiatedAt: timestamp("bgv_initiated_at", { mode: 'string' }),
	bgvCompletedAt: timestamp("bgv_completed_at", { mode: 'string' }),
	sourceUrl: text("source_url"),
	location: text(),
	gender: text(),
}, (table) => [
	index("idx_candidates_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("idx_candidates_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_candidates_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "candidates_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.referredBy],
			foreignColumns: [users.id],
			name: "candidates_referred_by_users_id_fk"
		}),
]);

export const notificationPreferences = pgTable("notification_preferences", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	orgId: text("org_id").notNull(),
	emailEnabled: boolean("email_enabled").default(true),
	pushEnabled: boolean("push_enabled").default(true),
	smsEnabled: boolean("sms_enabled").default(false),
	inAppEnabled: boolean("in_app_enabled").default(true),
	quietHoursStart: text("quiet_hours_start"),
	quietHoursEnd: text("quiet_hours_end"),
	categories: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "notification_preferences_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notification_preferences_user_id_users_id_fk"
		}),
	unique("notification_preferences_user_id_unique").on(table.userId),
]);

export const pushSubscriptions = pgTable("push_subscriptions", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	orgId: text("org_id").notNull(),
	endpoint: text().notNull(),
	p256Dh: text().notNull(),
	auth: text().notNull(),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_push_subs_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "push_subscriptions_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "push_subscriptions_user_id_users_id_fk"
		}),
	unique("push_subscriptions_endpoint_unique").on(table.endpoint),
]);

export const ticketWatchers = pgTable("ticket_watchers", {
	id: serial().primaryKey().notNull(),
	ticketId: integer("ticket_id").notNull(),
	userId: text("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_ticket_watchers_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	uniqueIndex("uniq_ticket_watcher").using("btree", table.ticketId.asc().nullsLast().op("int4_ops"), table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.ticketId],
			foreignColumns: [tickets.id],
			name: "ticket_watchers_ticket_id_tickets_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ticket_watchers_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const userSessions = pgTable("user_sessions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	userAgent: text("user_agent"),
	ipAddress: text("ip_address"),
	isRevoked: boolean("is_revoked").default(false).notNull(),
	lastActive: timestamp("last_active", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	deviceId: text("device_id"),
}, (table) => [
	index("idx_user_sessions_user_active").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.isRevoked.asc().nullsLast().op("bool_ops"), table.createdAt.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const candidateApplications = pgTable("candidate_applications", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	candidateId: integer("candidate_id").notNull(),
	jobPostingId: integer("job_posting_id").notNull(),
	status: applicationStatus().default('APPLIED'),
	appliedAt: timestamp("applied_at", { mode: 'string' }).defaultNow(),
	coverLetter: text("cover_letter"),
	notes: text(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_applications_candidate").using("btree", table.candidateId.asc().nullsLast().op("int4_ops")),
	index("idx_applications_job").using("btree", table.jobPostingId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.candidateId],
			foreignColumns: [candidates.id],
			name: "candidate_applications_candidate_id_candidates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.jobPostingId],
			foreignColumns: [jobPostings.id],
			name: "candidate_applications_job_posting_id_job_postings_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "candidate_applications_org_id_organizations_id_fk"
		}),
]);

export const jobPostings = pgTable("job_postings", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	departmentId: integer("department_id"),
	location: text(),
	type: text().default('FULL_TIME'),
	experience: text(),
	salaryMin: numeric("salary_min"),
	salaryMax: numeric("salary_max"),
	description: text(),
	requirements: text(),
	benefits: text(),
	status: jobPostingStatus().default('DRAFT'),
	openings: integer().default(1),
	applicationDeadline: date("application_deadline"),
	postedBy: text("posted_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	closingDate: timestamp("closing_date", { mode: 'string' }),
	externalPostingIds: jsonb("external_posting_ids"),
}, (table) => [
	index("idx_job_postings_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_job_postings_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "job_postings_department_id_departments_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "job_postings_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.postedBy],
			foreignColumns: [users.id],
			name: "job_postings_posted_by_users_id_fk"
		}),
]);

export const alumniProfiles = pgTable("alumni_profiles", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	currentCompany: text("current_company"),
	currentRole: text("current_role"),
	linkedinUrl: text("linkedin_url"),
	email: text(),
	leftDate: date("left_date"),
	isOptedIn: boolean("is_opted_in").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_alumni_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "alumni_profiles_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "alumni_profiles_user_id_users_id_fk"
		}),
]);

export const richDocuments = pgTable("rich_documents", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	contentJson: jsonb("content_json"),
	templateType: text("template_type"),
	isPublished: boolean("is_published").default(false),
	version: integer().default(1),
	createdBy: text("created_by").notNull(),
	updatedBy: text("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_rich_documents_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "rich_documents_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "rich_documents_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "rich_documents_updated_by_users_id_fk"
		}),
]);

export const assessmentAttempts = pgTable("assessment_attempts", {
	id: serial().primaryKey().notNull(),
	assessmentId: integer("assessment_id").notNull(),
	userId: text("user_id").notNull(),
	answers: jsonb(),
	score: integer(),
	passed: boolean().default(false),
	completedAt: timestamp("completed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_assessment_attempts_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assessmentId],
			foreignColumns: [skillAssessments.id],
			name: "assessment_attempts_assessment_id_skill_assessments_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "assessment_attempts_user_id_users_id_fk"
		}),
]);

export const assetReturns = pgTable("asset_returns", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	assetId: integer("asset_id"),
	assetName: text("asset_name").notNull(),
	status: text().default('PENDING'),
	returnedAt: timestamp("returned_at", { mode: 'string' }),
	condition: text(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_asset_returns_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [assets.id],
			name: "asset_returns_asset_id_assets_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "asset_returns_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "asset_returns_user_id_users_id_fk"
		}),
]);

export const backgroundVerifications = pgTable("background_verifications", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	type: text().notNull(),
	status: text().default('PENDING'),
	provider: text(),
	referenceNumber: text("reference_number"),
	result: text(),
	notes: text(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_bgv_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "background_verifications_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "background_verifications_user_id_users_id_fk"
		}),
]);

export const careerLadders = pgTable("career_ladders", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	department: text(),
	levels: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_career_ladders_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "career_ladders_org_id_organizations_id_fk"
		}),
]);

export const certifications = pgTable("certifications", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	issuingOrganization: text("issuing_organization"),
	issueDate: date("issue_date"),
	expiryDate: date("expiry_date"),
	credentialId: text("credential_id"),
	credentialUrl: text("credential_url"),
	documentUrl: text("document_url"),
	reminderSent: boolean("reminder_sent").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_certifications_expiry").using("btree", table.expiryDate.asc().nullsLast().op("date_ops")),
	index("idx_certifications_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "certifications_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "certifications_user_id_users_id_fk"
		}),
]);

export const hrEmailTemplates = pgTable("hr_email_templates", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	subject: text().notNull(),
	body: text().notNull(),
	category: text().default('GENERAL'),
	variables: text().array(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_email_templates_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "hr_email_templates_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "hr_email_templates_org_id_organizations_id_fk"
		}),
]);

export const employeeSkills = pgTable("employee_skills", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	skillName: text("skill_name").notNull(),
	level: integer().default(1),
	verifiedBy: text("verified_by"),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_employee_skills_name").using("btree", table.skillName.asc().nullsLast().op("text_ops")),
	index("idx_employee_skills_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "employee_skills_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "employee_skills_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [users.id],
			name: "employee_skills_verified_by_users_id_fk"
		}),
]);

export const enpsScores = pgTable("enps_scores", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id"),
	score: integer().notNull(),
	comment: text(),
	isAnonymous: boolean("is_anonymous").default(true),
	period: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_enps_org_period").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.period.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "enps_scores_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "enps_scores_user_id_users_id_fk"
		}),
]);

export const exitChecklists = pgTable("exit_checklists", {
	id: serial().primaryKey().notNull(),
	resignationId: integer("resignation_id").notNull(),
	item: text().notNull(),
	assignedTo: text("assigned_to"),
	status: exitChecklistStatus().default('PENDING'),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "exit_checklists_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.resignationId],
			foreignColumns: [resignations.id],
			name: "exit_checklists_resignation_id_resignations_id_fk"
		}).onDelete("cascade"),
]);

export const feedbackRequests = pgTable("feedback_requests", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	subjectUserId: text("subject_user_id").notNull(),
	reviewerUserId: text("reviewer_user_id").notNull(),
	type: feedbackType().notNull(),
	cycleId: integer("cycle_id"),
	ratings: jsonb(),
	strengths: text(),
	improvements: text(),
	overallRating: integer("overall_rating"),
	isCompleted: boolean("is_completed").default(false),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_feedback_reviewer").using("btree", table.reviewerUserId.asc().nullsLast().op("text_ops")),
	index("idx_feedback_subject").using("btree", table.subjectUserId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.cycleId],
			foreignColumns: [reviewCycles.id],
			name: "feedback_requests_cycle_id_review_cycles_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "feedback_requests_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.reviewerUserId],
			foreignColumns: [users.id],
			name: "feedback_requests_reviewer_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.subjectUserId],
			foreignColumns: [users.id],
			name: "feedback_requests_subject_user_id_users_id_fk"
		}),
]);

export const bonuses = pgTable("bonuses", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	type: bonusType().notNull(),
	amount: numeric().notNull(),
	reason: text(),
	month: text(),
	status: text().default('PENDING'),
	approvedBy: text("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_bonuses_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "bonuses_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "bonuses_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "bonuses_user_id_users_id_fk"
		}),
]);

export const keyResults = pgTable("key_results", {
	id: serial().primaryKey().notNull(),
	goalId: integer("goal_id").notNull(),
	title: text().notNull(),
	targetValue: numeric("target_value"),
	currentValue: numeric("current_value").default('0'),
	unit: text(),
	progress: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_key_results_goal").using("btree", table.goalId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.goalId],
			foreignColumns: [goals.id],
			name: "key_results_goal_id_goals_id_fk"
		}).onDelete("cascade"),
]);

export const learningPaths = pgTable("learning_paths", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	description: text(),
	targetRole: text("target_role"),
	steps: jsonb(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_learning_paths_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "learning_paths_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "learning_paths_org_id_organizations_id_fk"
		}),
]);

export const oneOnOneMeetings = pgTable("one_on_one_meetings", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	managerId: text("manager_id").notNull(),
	employeeId: text("employee_id").notNull(),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }).notNull(),
	duration: integer().default(30),
	status: meetingStatus().default('SCHEDULED'),
	notes: text(),
	actionItems: jsonb("action_items"),
	agenda: text(),
	meetingLink: text("meeting_link"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_one_on_ones_manager").using("btree", table.managerId.asc().nullsLast().op("text_ops")),
	index("idx_one_on_ones_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_one_on_ones_scheduled").using("btree", table.scheduledAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "one_on_one_meetings_employee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [users.id],
			name: "one_on_one_meetings_manager_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "one_on_one_meetings_org_id_organizations_id_fk"
		}),
]);

export const performanceImprovementPlans = pgTable("performance_improvement_plans", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	managerId: text("manager_id").notNull(),
	reason: text().notNull(),
	objectives: jsonb(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	status: pipStatus().default('ACTIVE'),
	outcome: text(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_pip_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.managerId],
			foreignColumns: [users.id],
			name: "performance_improvement_plans_manager_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "performance_improvement_plans_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "performance_improvement_plans_user_id_users_id_fk"
		}),
]);

export const policyAcknowledgments = pgTable("policy_acknowledgments", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	documentId: integer("document_id").notNull(),
	userId: text("user_id").notNull(),
	status: ackStatus().default('PENDING'),
	acknowledgedAt: timestamp("acknowledged_at", { mode: 'string' }),
	ipAddress: text("ip_address"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_policy_ack_doc").using("btree", table.documentId.asc().nullsLast().op("int4_ops")),
	index("idx_policy_ack_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [documents.id],
			name: "policy_acknowledgments_document_id_documents_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "policy_acknowledgments_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "policy_acknowledgments_user_id_users_id_fk"
		}),
]);

export const pulseSurveys = pgTable("pulse_surveys", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	questions: jsonb(),
	status: surveyStatus().default('DRAFT'),
	isAnonymous: boolean("is_anonymous").default(true),
	createdBy: text("created_by"),
	closesAt: timestamp("closes_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_surveys_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "pulse_surveys_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "pulse_surveys_org_id_organizations_id_fk"
		}),
]);

export const recognitions = pgTable("recognitions", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	fromUserId: text("from_user_id").notNull(),
	toUserId: text("to_user_id").notNull(),
	message: text().notNull(),
	category: text().default('KUDOS'),
	isPublic: boolean("is_public").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_recognitions_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_recognitions_to_user").using("btree", table.toUserId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fromUserId],
			foreignColumns: [users.id],
			name: "recognitions_from_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "recognitions_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.toUserId],
			foreignColumns: [users.id],
			name: "recognitions_to_user_id_users_id_fk"
		}),
]);

export const fnfSettlements = pgTable("fnf_settlements", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	resignationId: integer("resignation_id"),
	basicDues: numeric("basic_dues").default('0'),
	leaveEncashment: numeric("leave_encashment").default('0'),
	bonusDue: numeric("bonus_due").default('0'),
	deductions: numeric().default('0'),
	loanRecovery: numeric("loan_recovery").default('0'),
	netPayable: numeric("net_payable").default('0'),
	status: fnfStatus().default('DRAFT'),
	approvedBy: text("approved_by"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_fnf_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "fnf_settlements_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "fnf_settlements_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.resignationId],
			foreignColumns: [resignations.id],
			name: "fnf_settlements_resignation_id_resignations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "fnf_settlements_user_id_users_id_fk"
		}),
]);

export const handbookVersions = pgTable("handbook_versions", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	version: text().notNull(),
	documentId: integer("document_id"),
	changelog: text(),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	publishedBy: text("published_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_handbook_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [richDocuments.id],
			name: "handbook_versions_document_id_rich_documents_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "handbook_versions_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.publishedBy],
			foreignColumns: [users.id],
			name: "handbook_versions_published_by_users_id_fk"
		}),
]);

export const reviewCycles = pgTable("review_cycles", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	type: text().default('QUARTERLY'),
	periodStart: date("period_start").notNull(),
	periodEnd: date("period_end").notNull(),
	deadline: date(),
	status: reviewCycleStatus().default('DRAFT'),
	description: text(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_review_cycles_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "review_cycles_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "review_cycles_org_id_organizations_id_fk"
		}),
]);

export const reimbursements = pgTable("reimbursements", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	category: text().notNull(),
	amount: numeric().notNull(),
	description: text(),
	receiptUrl: text("receipt_url"),
	status: reimbursementStatus().default('PENDING'),
	approvedBy: text("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_reimbursements_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_reimbursements_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "reimbursements_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "reimbursements_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "reimbursements_user_id_users_id_fk"
		}),
]);

export const surveyResponses = pgTable("survey_responses", {
	id: serial().primaryKey().notNull(),
	surveyId: integer("survey_id").notNull(),
	userId: text("user_id"),
	answers: jsonb(),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_survey_responses_survey").using("btree", table.surveyId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.surveyId],
			foreignColumns: [pulseSurveys.id],
			name: "survey_responses_survey_id_pulse_surveys_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "survey_responses_user_id_users_id_fk"
		}),
]);

export const resignations = pgTable("resignations", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	reason: text(),
	lastWorkingDate: date("last_working_date"),
	noticePeriodDays: integer("notice_period_days").default(30),
	status: resignationStatus().default('SUBMITTED'),
	approvedBy: text("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	exitInterviewNotes: text("exit_interview_notes"),
	exitInterviewDate: timestamp("exit_interview_date", { mode: 'string' }),
	exitInterviewConductedBy: text("exit_interview_conducted_by"),
	feedback: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	reasonCategory: text("reason_category"),
	resignationLetterUrl: text("resignation_letter_url"),
	hrReviewedBy: text("hr_reviewed_by"),
	hrReviewedAt: timestamp("hr_reviewed_at", { mode: 'string' }),
	hrRemarks: text("hr_remarks"),
	ceoReviewedBy: text("ceo_reviewed_by"),
	ceoReviewedAt: timestamp("ceo_reviewed_at", { mode: 'string' }),
	ceoRemarks: text("ceo_remarks"),
	willingForExitInterview: boolean("willing_for_exit_interview").default(true),
	companyFeedback: text("company_feedback"),
}, (table) => [
	index("idx_resignations_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_resignations_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "resignations_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.ceoReviewedBy],
			foreignColumns: [users.id],
			name: "resignations_ceo_reviewed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.exitInterviewConductedBy],
			foreignColumns: [users.id],
			name: "resignations_exit_interview_conducted_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.hrReviewedBy],
			foreignColumns: [users.id],
			name: "resignations_hr_reviewed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "resignations_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "resignations_user_id_users_id_fk"
		}),
]);

export const teamEvents = pgTable("team_events", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	description: text(),
	type: text().default('TEAM_BUILDING'),
	date: date().notNull(),
	time: text(),
	location: text(),
	maxParticipants: integer("max_participants"),
	organizedBy: text("organized_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_team_events_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "team_events_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.organizedBy],
			foreignColumns: [users.id],
			name: "team_events_organized_by_users_id_fk"
		}),
]);

export const trainingEnrollments = pgTable("training_enrollments", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	programId: integer("program_id").notNull(),
	userId: text("user_id").notNull(),
	status: enrollmentStatus().default('ENROLLED'),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	score: integer(),
	feedback: text(),
	certificateUrl: text("certificate_url"),
	enrolledAt: timestamp("enrolled_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_enrollments_program").using("btree", table.programId.asc().nullsLast().op("int4_ops")),
	index("idx_enrollments_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "training_enrollments_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [trainingPrograms.id],
			name: "training_enrollments_program_id_training_programs_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "training_enrollments_user_id_users_id_fk"
		}),
]);

export const skillAssessments = pgTable("skill_assessments", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	skillName: text("skill_name").notNull(),
	questions: jsonb(),
	passingScore: integer("passing_score").default(70),
	timeLimit: integer("time_limit"),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_skill_assessments_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "skill_assessments_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "skill_assessments_org_id_organizations_id_fk"
		}),
]);

export const salaryLoans = pgTable("salary_loans", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	amount: numeric().notNull(),
	reason: text(),
	emiAmount: numeric("emi_amount"),
	totalEmis: integer("total_emis"),
	paidEmis: integer("paid_emis").default(0),
	status: loanStatus().default('PENDING'),
	approvedBy: text("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	disbursedAt: timestamp("disbursed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_loans_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_loans_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "salary_loans_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "salary_loans_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "salary_loans_user_id_users_id_fk"
		}),
]);

export const teamEventParticipants = pgTable("team_event_participants", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	userId: text("user_id").notNull(),
	status: text().default('GOING'),
	joinedAt: timestamp("joined_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [teamEvents.id],
			name: "team_event_participants_event_id_team_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "team_event_participants_user_id_users_id_fk"
		}),
]);

export const trainingPrograms = pgTable("training_programs", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	description: text(),
	category: text(),
	duration: text(),
	instructor: text(),
	maxParticipants: integer("max_participants"),
	status: trainingStatus().default('DRAFT'),
	startDate: date("start_date"),
	endDate: date("end_date"),
	location: text(),
	meetingLink: text("meeting_link"),
	materials: text(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_training_programs_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "training_programs_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "training_programs_org_id_organizations_id_fk"
		}),
]);

export const emailCampaigns = pgTable("email_campaigns", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	subject: text().notNull(),
	body: text().notNull(),
	templateId: integer("template_id"),
	status: text().default('draft').notNull(),
	recipientFilter: jsonb("recipient_filter"),
	recipientCount: integer("recipient_count").default(0),
	sentCount: integer("sent_count").default(0),
	failedCount: integer("failed_count").default(0),
	openCount: integer("open_count").default(0),
	clickCount: integer("click_count").default(0),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_email_campaigns_org").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "email_campaigns_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "email_campaigns_org_id_organizations_id_fk"
		}),
]);

export const salesQuotas = pgTable("sales_quotas", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	period: text().default('monthly').notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	targetRevenue: numeric("target_revenue").default('0').notNull(),
	actualRevenue: numeric("actual_revenue").default('0').notNull(),
	notes: text(),
	setById: text("set_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_sales_quotas_org_user").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "sales_quotas_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.setById],
			foreignColumns: [users.id],
			name: "sales_quotas_set_by_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sales_quotas_user_id_users_id_fk"
		}),
]);

export const commissionRules = pgTable("commission_rules", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	type: text().default('flat_percent').notNull(),
	flatRate: numeric("flat_rate"),
	tiers: jsonb(),
	appliesTo: text("applies_to").default('all').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "commission_rules_org_id_organizations_id_fk"
		}),
]);

export const commissions = pgTable("commissions", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	dealId: integer("deal_id").notNull(),
	ruleId: integer("rule_id"),
	dealValue: numeric("deal_value").default('0').notNull(),
	commissionRate: numeric("commission_rate").default('0').notNull(),
	commissionAmount: numeric("commission_amount").default('0').notNull(),
	status: text().default('pending').notNull(),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_commissions_deal").using("btree", table.dealId.asc().nullsLast().op("int4_ops")),
	index("idx_commissions_org_user").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deals.id],
			name: "commissions_deal_id_deals_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "commissions_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.ruleId],
			foreignColumns: [commissionRules.id],
			name: "commissions_rule_id_commission_rules_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "commissions_user_id_users_id_fk"
		}),
]);

export const dealApprovalRules = pgTable("deal_approval_rules", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	minValue: numeric("min_value").default('0').notNull(),
	approverRole: text("approver_role").default('CEO').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "deal_approval_rules_org_id_organizations_id_fk"
		}),
]);

export const dealApprovals = pgTable("deal_approvals", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	dealId: integer("deal_id").notNull(),
	requestedBy: text("requested_by").notNull(),
	requestedStage: text("requested_stage").notNull(),
	status: text().default('pending').notNull(),
	approvedBy: text("approved_by"),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
}, (table) => [
	index("idx_deal_approvals_deal").using("btree", table.dealId.asc().nullsLast().op("int4_ops")),
	index("idx_deal_approvals_org").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "deal_approvals_approved_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deals.id],
			name: "deal_approvals_deal_id_deals_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "deal_approvals_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.requestedBy],
			foreignColumns: [users.id],
			name: "deal_approvals_requested_by_users_id_fk"
		}),
]);

export const emailCampaignRecipients = pgTable("email_campaign_recipients", {
	id: serial().primaryKey().notNull(),
	campaignId: integer("campaign_id").notNull(),
	leadId: integer("lead_id"),
	email: text().notNull(),
	name: text(),
	status: text().default('pending').notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	openedAt: timestamp("opened_at", { mode: 'string' }),
	clickedAt: timestamp("clicked_at", { mode: 'string' }),
	errorMessage: text("error_message"),
}, (table) => [
	index("idx_ecr_campaign").using("btree", table.campaignId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.campaignId],
			foreignColumns: [emailCampaigns.id],
			name: "email_campaign_recipients_campaign_id_email_campaigns_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.leadId],
			foreignColumns: [leads.id],
			name: "email_campaign_recipients_lead_id_leads_id_fk"
		}),
]);

export const projectMilestones = pgTable("project_milestones", {
	id: serial().primaryKey().notNull(),
	projectId: integer("project_id").notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	description: text(),
	targetDate: date("target_date").notNull(),
	status: text().default('PENDING').notNull(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_project_milestones_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_project_milestones_project").using("btree", table.projectId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "project_milestones_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "project_milestones_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "project_milestones_project_id_projects_id_fk"
		}).onDelete("cascade"),
]);

export const projectTemplates = pgTable("project_templates", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	description: text(),
	category: text().default('GENERAL'),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "project_templates_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "project_templates_org_id_organizations_id_fk"
		}),
]);

export const calibrationSessions = pgTable("calibration_sessions", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	candidateId: integer("candidate_id").notNull(),
	jobPostingId: integer("job_posting_id"),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }),
	status: text().default('pending').notNull(),
	notes: text(),
	decision: text(),
	participantIds: jsonb("participant_ids").default([]).notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_calibration_sessions_candidate").using("btree", table.candidateId.asc().nullsLast().op("int4_ops")),
	index("idx_calibration_sessions_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.candidateId],
			foreignColumns: [candidates.id],
			name: "calibration_sessions_candidate_id_candidates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "calibration_sessions_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.jobPostingId],
			foreignColumns: [jobPostings.id],
			name: "calibration_sessions_job_posting_id_job_postings_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "calibration_sessions_org_id_organizations_id_fk"
		}),
]);

export const candidateDocuments = pgTable("candidate_documents", {
	id: serial().primaryKey().notNull(),
	candidateId: integer("candidate_id").notNull(),
	orgId: text("org_id").notNull(),
	templateId: integer("template_id"),
	title: text().notNull(),
	htmlContent: text("html_content").default(').notNull(),
	status: text().default('GENERATED').notNull(),
	externalDocId: text("external_doc_id"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	viewedAt: timestamp("viewed_at", { mode: 'string' }),
	signedAt: timestamp("signed_at", { mode: 'string' }),
	declinedAt: timestamp("declined_at", { mode: 'string' }),
	acceptanceDeadline: timestamp("acceptance_deadline", { mode: 'string' }),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_candidate_docs_candidate").using("btree", table.candidateId.asc().nullsLast().op("int4_ops")),
	index("idx_candidate_docs_external").using("btree", table.externalDocId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "candidate_documents_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "candidate_documents_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [documentTemplates.id],
			name: "candidate_documents_template_id_document_templates_id_fk"
		}),
]);

export const candidateDocumentsVault = pgTable("candidate_documents_vault", {
	id: serial().primaryKey().notNull(),
	candidateId: integer("candidate_id").notNull(),
	orgId: text("org_id").notNull(),
	filename: text().notNull(),
	s3Key: text("s3_key").notNull(),
	fileUrl: text("file_url").notNull(),
	fileType: text("file_type").notNull(),
	fileSize: integer("file_size").default(0).notNull(),
	documentType: text("document_type"),
	avResult: text("av_result").default('PENDING').notNull(),
	expiresAt: date("expires_at"),
	uploadedBy: text("uploaded_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_vault_candidate").using("btree", table.candidateId.asc().nullsLast().op("int4_ops")),
	index("idx_vault_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "candidate_documents_vault_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "candidate_documents_vault_uploaded_by_users_id_fk"
		}),
]);

export const candidateOffers = pgTable("candidate_offers", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	candidateId: integer("candidate_id").notNull(),
	jobPostingId: integer("job_posting_id"),
	offeredBy: text("offered_by"),
	offerStatus: text("offer_status").default('DRAFT').notNull(),
	offeredSalary: numeric("offered_salary"),
	offeredDesignation: text("offered_designation"),
	joiningDate: date("joining_date"),
	offerLetterUrl: text("offer_letter_url"),
	validUntil: date("valid_until"),
	notes: text(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	viewedAt: timestamp("viewed_at", { mode: 'string' }),
	respondedAt: timestamp("responded_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_candidate_offers_candidate").using("btree", table.candidateId.asc().nullsLast().op("int4_ops")),
	index("idx_candidate_offers_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.candidateId],
			foreignColumns: [candidates.id],
			name: "candidate_offers_candidate_id_candidates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.jobPostingId],
			foreignColumns: [jobPostings.id],
			name: "candidate_offers_job_posting_id_job_postings_id_fk"
		}),
	foreignKey({
			columns: [table.offeredBy],
			foreignColumns: [users.id],
			name: "candidate_offers_offered_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "candidate_offers_org_id_organizations_id_fk"
		}),
]);

export const candidateReferenceChecks = pgTable("candidate_reference_checks", {
	id: serial().primaryKey().notNull(),
	candidateId: integer("candidate_id").notNull(),
	orgId: text("org_id").notNull(),
	referenceName: text("reference_name").notNull(),
	referenceDesignation: text("reference_designation"),
	referenceCompany: text("reference_company"),
	referenceEmail: text("reference_email"),
	referencePhone: text("reference_phone"),
	relationship: text(),
	status: text().default('PENDING').notNull(),
	outcome: text(),
	notes: text(),
	contactedAt: timestamp("contacted_at", { mode: 'string' }),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_reference_checks_candidate").using("btree", table.candidateId.asc().nullsLast().op("int4_ops")),
	index("idx_reference_checks_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.candidateId],
			foreignColumns: [candidates.id],
			name: "candidate_reference_checks_candidate_id_candidates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "candidate_reference_checks_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "candidate_reference_checks_org_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const mfaBackupCodes = pgTable("mfa_backup_codes", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	codeHash: text("code_hash").notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_mfa_backup_codes_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "mfa_backup_codes_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const candidateSlaTracking = pgTable("candidate_sla_tracking", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	candidateId: integer("candidate_id").notNull(),
	stage: text().notNull(),
	enteredAt: timestamp("entered_at", { mode: 'string' }).defaultNow().notNull(),
	breachedAt: timestamp("breached_at", { mode: 'string' }),
	status: text().default('ON_TRACK').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_sla_tracking_candidate").using("btree", table.candidateId.asc().nullsLast().op("int4_ops")),
	index("idx_sla_tracking_org_status").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	uniqueIndex("uniq_sla_tracking_candidate_stage").using("btree", table.candidateId.asc().nullsLast().op("text_ops"), table.stage.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.candidateId],
			foreignColumns: [candidates.id],
			name: "candidate_sla_tracking_candidate_id_candidates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "candidate_sla_tracking_org_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const candidateSources = pgTable("candidate_sources", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	platform: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	oauthToken: text("oauth_token"),
	meta: jsonb(),
	lastSyncedAt: timestamp("last_synced_at", { mode: 'string' }),
	lastSyncCount: integer("last_sync_count").default(0),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_candidate_sources_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	uniqueIndex("uq_candidate_sources_org_platform").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.platform.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "candidate_sources_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "candidate_sources_org_id_organizations_id_fk"
		}),
]);

export const documentAuditLogs = pgTable("document_audit_logs", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	onboardingDocumentId: integer("onboarding_document_id").notNull(),
	action: docAuditAction().notNull(),
	performedBy: text("performed_by").notNull(),
	remarks: text(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.onboardingDocumentId],
			foreignColumns: [onboardingDocuments.id],
			name: "document_audit_logs_onboarding_document_id_onboarding_documents"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "document_audit_logs_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.performedBy],
			foreignColumns: [users.id],
			name: "document_audit_logs_performed_by_users_id_fk"
		}),
]);

export const documentTemplateVersions = pgTable("document_template_versions", {
	id: serial().primaryKey().notNull(),
	templateId: integer("template_id").notNull(),
	orgId: text("org_id").notNull(),
	version: integer().notNull(),
	title: text().notNull(),
	type: text().notNull(),
	htmlContent: text("html_content").notNull(),
	variables: jsonb().default([]).notNull(),
	archivedAt: timestamp("archived_at", { mode: 'string' }).defaultNow(),
	archivedBy: text("archived_by").notNull(),
}, (table) => [
	index("idx_dtv_template_id").using("btree", table.templateId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.archivedBy],
			foreignColumns: [users.id],
			name: "document_template_versions_archived_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [documentTemplates.id],
			name: "document_template_versions_template_id_document_templates_id_fk"
		}).onDelete("cascade"),
]);

export const documentTypes = pgTable("document_types", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	slug: text().notNull(),
	description: text(),
	isMandatory: boolean("is_mandatory").default(true),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order").default(0),
	applicableRoles: text("applicable_roles").array().default([""]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_doc_types_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "document_types_org_id_organizations_id_fk"
		}),
]);

export const candidateReferrals = pgTable("candidate_referrals", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	candidateId: integer("candidate_id").notNull(),
	referredBy: text("referred_by").notNull(),
	relationship: text(),
	notes: text(),
	bonusEligible: boolean("bonus_eligible").default(true).notNull(),
	bonusAmount: numeric("bonus_amount", { precision: 12, scale:  2 }),
	bonusPaidAt: timestamp("bonus_paid_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_referrals_candidate").using("btree", table.candidateId.asc().nullsLast().op("int4_ops")),
	index("idx_referrals_referred_by").using("btree", table.referredBy.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.candidateId],
			foreignColumns: [candidates.id],
			name: "candidate_referrals_candidate_id_candidates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "candidate_referrals_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.referredBy],
			foreignColumns: [users.id],
			name: "candidate_referrals_referred_by_users_id_fk"
		}),
]);

export const interviewBookingLinks = pgTable("interview_booking_links", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	candidateId: integer("candidate_id").notNull(),
	jobPostingId: integer("job_posting_id"),
	token: text().notNull(),
	interviewerIds: jsonb("interviewer_ids").default([]).notNull(),
	durationMinutes: integer("duration_minutes").default(60).notNull(),
	interviewType: text("interview_type").default('VIDEO').notNull(),
	availableSlots: jsonb("available_slots").default([]).notNull(),
	selectedSlot: timestamp("selected_slot", { mode: 'string' }),
	status: text().default('pending').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdBy: text("created_by").notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_booking_links_candidate").using("btree", table.candidateId.asc().nullsLast().op("int4_ops")),
	index("idx_booking_links_token").using("btree", table.token.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.candidateId],
			foreignColumns: [candidates.id],
			name: "interview_booking_links_candidate_id_candidates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "interview_booking_links_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.jobPostingId],
			foreignColumns: [jobPostings.id],
			name: "interview_booking_links_job_posting_id_job_postings_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "interview_booking_links_org_id_organizations_id_fk"
		}),
	unique("interview_booking_links_token_unique").on(table.token),
]);

export const documentTemplates = pgTable("document_templates", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	type: text().default('OFFER').notNull(),
	htmlContent: text("html_content").default(').notNull(),
	variables: jsonb().default([]).notNull(),
	version: integer().default(1).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_doc_templates_org").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "document_templates_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "document_templates_org_id_organizations_id_fk"
		}),
]);

export const scorecardTemplates = pgTable("scorecard_templates", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	criteria: jsonb().default([]).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_scorecard_templates_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "scorecard_templates_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "scorecard_templates_org_id_organizations_id_fk"
		}),
]);

export const leaveBlackoutDates = pgTable("leave_blackout_dates", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	reason: text().notNull(),
	appliesTo: text("applies_to").default('ALL').notNull(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_leave_blackout_org").using("btree", table.orgId.asc().nullsLast().op("date_ops"), table.startDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "leave_blackout_dates_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "leave_blackout_dates_org_id_organizations_id_fk"
		}),
]);

export const onboardingTasks = pgTable("onboarding_tasks", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	orgId: text("org_id").notNull(),
	templateStepId: integer("template_step_id"),
	title: text().notNull(),
	description: text(),
	ownerRole: text("owner_role").default('NEW_HIRE').notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	status: text().default('PENDING').notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	completedBy: text("completed_by"),
	dependsOnTaskIds: jsonb("depends_on_task_ids").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_onboarding_tasks_status").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_onboarding_tasks_user").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.completedBy],
			foreignColumns: [users.id],
			name: "onboarding_tasks_completed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "onboarding_tasks_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.templateStepId],
			foreignColumns: [onboardingTemplateSteps.id],
			name: "onboarding_tasks_template_step_id_onboarding_template_steps_id_"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "onboarding_tasks_user_id_users_id_fk"
		}),
]);

export const interviewQuestions = pgTable("interview_questions", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	question: text().notNull(),
	category: text().default('GENERAL').notNull(),
	role: text(),
	difficulty: text().default('MEDIUM').notNull(),
	tags: text().array().default([""]),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_interview_questions_category").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.category.asc().nullsLast().op("text_ops")),
	index("idx_interview_questions_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "interview_questions_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "interview_questions_org_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const onboardingTemplateSteps = pgTable("onboarding_template_steps", {
	id: serial().primaryKey().notNull(),
	templateId: integer("template_id").notNull(),
	title: text().notNull(),
	description: text(),
	ownerRole: text("owner_role").default('NEW_HIRE').notNull(),
	dueOffsetDays: integer("due_offset_days").default(0).notNull(),
	isRequired: boolean("is_required").default(true).notNull(),
	isComplianceItem: boolean("is_compliance_item").default(false).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [onboardingTemplates.id],
			name: "onboarding_template_steps_template_id_onboarding_templates_id_f"
		}).onDelete("cascade"),
]);

export const onboardingTemplates = pgTable("onboarding_templates", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	departmentId: integer("department_id"),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_onboarding_templates_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "onboarding_templates_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "onboarding_templates_org_id_organizations_id_fk"
		}),
]);

export const interviewSlas = pgTable("interview_slas", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	stage: text().notNull(),
	maxHours: integer("max_hours").default(48).notNull(),
	warningHours: integer("warning_hours").default(36).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("uniq_interview_sla_org_stage").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.stage.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "interview_slas_org_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const onboardingDocuments = pgTable("onboarding_documents", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	documentTypeId: integer("document_type_id").notNull(),
	fileUrl: text("file_url").notNull(),
	fileName: text("file_name").notNull(),
	fileSize: integer("file_size"),
	mimeType: text("mime_type"),
	version: integer().default(1),
	status: onboardingDocumentStatus().default('SUBMITTED'),
	reviewedBy: text("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	remarks: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_onboarding_docs_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_onboarding_docs_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.documentTypeId],
			foreignColumns: [documentTypes.id],
			name: "onboarding_documents_document_type_id_document_types_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "onboarding_documents_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "onboarding_documents_reviewed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "onboarding_documents_user_id_users_id_fk"
		}),
]);

export const interviewScorecards = pgTable("interview_scorecards", {
	id: serial().primaryKey().notNull(),
	interviewId: integer("interview_id").notNull(),
	interviewerId: text("interviewer_id").notNull(),
	templateId: integer("template_id"),
	ratings: jsonb().default({}).notNull(),
	recommendation: text().default('MAYBE').notNull(),
	notes: text(),
	isBlindMode: boolean("is_blind_mode").default(false).notNull(),
	submittedAt: timestamp("submitted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_scorecards_interview").using("btree", table.interviewId.asc().nullsLast().op("int4_ops")),
	index("idx_scorecards_interviewer").using("btree", table.interviewerId.asc().nullsLast().op("text_ops")),
	uniqueIndex("uniq_scorecard_interview_interviewer").using("btree", table.interviewId.asc().nullsLast().op("int4_ops"), table.interviewerId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.interviewId],
			foreignColumns: [interviews.id],
			name: "interview_scorecards_interview_id_interviews_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.interviewerId],
			foreignColumns: [users.id],
			name: "interview_scorecards_interviewer_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [scorecardTemplates.id],
			name: "interview_scorecards_template_id_scorecard_templates_id_fk"
		}),
]);

export const clientOnboardingItems = pgTable("client_onboarding_items", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	clientId: integer("client_id").notNull(),
	templateId: integer("template_id"),
	title: text().notNull(),
	description: text(),
	assignedTo: text("assigned_to"),
	dueDate: date("due_date"),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	completedBy: text("completed_by"),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_onboarding_items_client").using("btree", table.clientId.asc().nullsLast().op("int4_ops")),
	index("idx_onboarding_items_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "client_onboarding_items_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_onboarding_items_client_id_clients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.completedBy],
			foreignColumns: [users.id],
			name: "client_onboarding_items_completed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "client_onboarding_items_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [clientOnboardingTemplates.id],
			name: "client_onboarding_items_template_id_client_onboarding_templates"
		}),
]);

export const clientOnboardingTemplates = pgTable("client_onboarding_templates", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	description: text(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_client_onboarding_templates_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "client_onboarding_templates_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "client_onboarding_templates_org_id_organizations_id_fk"
		}),
]);

export const clientOpportunities = pgTable("client_opportunities", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	clientId: integer("client_id").notNull(),
	title: text().notNull(),
	type: text().default('upsell').notNull(),
	stage: text().default('identified').notNull(),
	value: numeric({ precision: 15, scale:  2 }),
	notes: text(),
	expectedCloseDate: date("expected_close_date"),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_client_opps_client").using("btree", table.clientId.asc().nullsLast().op("int4_ops")),
	index("idx_client_opps_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "client_opportunities_client_id_clients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "client_opportunities_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "client_opportunities_org_id_organizations_id_fk"
		}),
]);

export const csatSurveys = pgTable("csat_surveys", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	clientId: integer("client_id"),
	title: text().notNull(),
	question: text().default('How satisfied are you with our service?').notNull(),
	scaleMax: integer("scale_max").default(5).notNull(),
	status: text().default('draft').notNull(),
	publicToken: text("public_token").notNull(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	closedAt: timestamp("closed_at", { mode: 'string' }),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_csat_surveys_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_csat_surveys_token").using("btree", table.publicToken.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "csat_surveys_client_id_clients_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "csat_surveys_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "csat_surveys_org_id_organizations_id_fk"
		}),
]);

export const customFieldDefinitions = pgTable("custom_field_definitions", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	entityType: text("entity_type").notNull(),
	name: text().notNull(),
	label: text().notNull(),
	fieldType: text("field_type").default('text').notNull(),
	options: jsonb(),
	isRequired: boolean("is_required").default(false),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order").default(0),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("cfd_org_entity_name_idx").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.entityType.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	index("idx_cfd_org_entity").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.entityType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "custom_field_definitions_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "custom_field_definitions_org_id_organizations_id_fk"
		}),
]);

export const dealMeetings = pgTable("deal_meetings", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	dealId: integer("deal_id").notNull(),
	title: text().notNull(),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }).notNull(),
	durationMinutes: integer("duration_minutes").default(30),
	attendees: text().array(),
	agenda: text(),
	notes: text(),
	actionItems: text("action_items"),
	recordingLink: text("recording_link"),
	status: text().default('scheduled').notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_deal_meetings_deal").using("btree", table.dealId.asc().nullsLast().op("int4_ops")),
	index("idx_deal_meetings_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "deal_meetings_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.dealId],
			foreignColumns: [deals.id],
			name: "deal_meetings_deal_id_deals_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "deal_meetings_org_id_organizations_id_fk"
		}),
]);

export const terminations = pgTable("terminations", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id").notNull(),
	reasons: text().array().default([""]).notNull(),
	detailedExplanation: text("detailed_explanation").notNull(),
	effectiveDate: date("effective_date").notNull(),
	severanceAmount: numeric("severance_amount"),
	noticePeriodWaived: boolean("notice_period_waived").default(false),
	terminationLetterUrl: text("termination_letter_url"),
	supportingDocUrls: text("supporting_doc_urls").array().default([""]),
	internalNotes: text("internal_notes"),
	status: terminationStatus().default('DRAFT'),
	initiatedBy: text("initiated_by"),
	ceoReviewedBy: text("ceo_reviewed_by"),
	ceoReviewedAt: timestamp("ceo_reviewed_at", { mode: 'string' }),
	ceoRemarks: text("ceo_remarks"),
	emailSentAt: timestamp("email_sent_at", { mode: 'string' }),
	emailStatus: text("email_status"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_terminations_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_terminations_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("idx_terminations_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ceoReviewedBy],
			foreignColumns: [users.id],
			name: "terminations_ceo_reviewed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.initiatedBy],
			foreignColumns: [users.id],
			name: "terminations_initiated_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "terminations_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "terminations_user_id_users_id_fk"
		}),
]);

export const vaultAccessLogs = pgTable("vault_access_logs", {
	id: serial().primaryKey().notNull(),
	vaultDocumentId: integer("vault_document_id").notNull(),
	accessedBy: text("accessed_by").notNull(),
	action: text().default('VIEW').notNull(),
	accessedAt: timestamp("accessed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.accessedBy],
			foreignColumns: [users.id],
			name: "vault_access_logs_accessed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.vaultDocumentId],
			foreignColumns: [candidateDocumentsVault.id],
			name: "vault_access_logs_vault_document_id_candidate_documents_vault_i"
		}).onDelete("cascade"),
]);

export const taskSequences = pgTable("task_sequences", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	description: text(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "task_sequences_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "task_sequences_org_id_organizations_id_fk"
		}),
]);

export const tasks = pgTable("tasks", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	notes: text(),
	entityType: taskEntityType("entity_type"),
	entityId: integer("entity_id"),
	type: taskType().default('CUSTOM').notNull(),
	status: taskStatus().default('pending').notNull(),
	assigneeId: text("assignee_id"),
	createdBy: text("created_by"),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	remindAt: timestamp("remind_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	timezone: text(),
	recurrence: jsonb(),
	parentTaskId: integer("parent_task_id"),
	isTemplate: boolean("is_template").default(false).notNull(),
	templateName: text("template_name"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_tasks_assignee").using("btree", table.assigneeId.asc().nullsLast().op("text_ops")),
	index("idx_tasks_due_date").using("btree", table.dueDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_tasks_entity").using("btree", table.entityType.asc().nullsLast().op("int4_ops"), table.entityId.asc().nullsLast().op("enum_ops")),
	index("idx_tasks_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("idx_tasks_parent").using("btree", table.parentTaskId.asc().nullsLast().op("int4_ops")),
	index("idx_tasks_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.assigneeId],
			foreignColumns: [users.id],
			name: "tasks_assignee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "tasks_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "tasks_org_id_organizations_id_fk"
		}),
]);

export const territories = pgTable("territories", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	states: text().array().default([""]),
	cities: text().array().default([""]),
	assignedReps: integer("assigned_reps").array().default([]),
	description: text(),
	isActive: boolean("is_active").default(true),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("territories_org_id_idx").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "territories_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "territories_org_id_organizations_id_fk"
		}),
]);

export const webLeadForms = pgTable("web_lead_forms", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	description: text(),
	fields: jsonb().default([]).notNull(),
	publicToken: text("public_token").notNull(),
	isActive: boolean("is_active").default(true),
	submitMessage: text("submit_message").default('Thank you! We\'ll be in touch soon.'),
	redirectUrl: text("redirect_url"),
	totalSubmissions: integer("total_submissions").default(0),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("web_lead_forms_org_id_idx").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	uniqueIndex("web_lead_forms_token_idx").using("btree", table.publicToken.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "web_lead_forms_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "web_lead_forms_org_id_organizations_id_fk"
		}),
	unique("web_lead_forms_public_token_unique").on(table.publicToken),
]);

export const aiUsageLogs = pgTable("ai_usage_logs", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	userId: text("user_id"),
	feature: text().notNull(),
	model: text().notNull(),
	promptTokens: integer("prompt_tokens").default(0).notNull(),
	completionTokens: integer("completion_tokens").default(0).notNull(),
	totalTokens: integer("total_tokens").default(0).notNull(),
	estimatedCostUsd: numeric("estimated_cost_usd", { precision: 12, scale:  6 }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_ai_usage_org_created").using("btree", table.orgId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	index("idx_ai_usage_org_feature").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.feature.asc().nullsLast().op("text_ops")),
	index("idx_ai_usage_user").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "ai_usage_logs_org_id_organizations_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_usage_logs_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const announcements = pgTable("announcements", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	authorId: text("author_id").notNull(),
	content: text().notNull(),
	isPinned: boolean("is_pinned").default(false).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_announcements_org").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.expiresAt.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "announcements_author_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "announcements_org_id_organizations_id_fk"
		}).onDelete("cascade"),
]);

export const leadImportBatches = pgTable("lead_import_batches", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	createdBy: text("created_by").notNull(),
	filename: text().notNull(),
	status: text().default('PROCESSING').notNull(),
	totalRows: integer("total_rows").default(0).notNull(),
	importedRows: integer("imported_rows").default(0).notNull(),
	failedRows: integer("failed_rows").default(0).notNull(),
	errorReport: jsonb("error_report"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	index("idx_lead_batches_org").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "lead_import_batches_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "lead_import_batches_org_id_organizations_id_fk"
		}),
]);

export const apiKeys = pgTable("api_keys", {
	id: text().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	keyHash: text("key_hash").notNull(),
	keyPrefix: text("key_prefix").notNull(),
	description: text(),
	isRevoked: boolean("is_revoked").default(false).notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	scopes: text().array().default([""]).notNull(),
}, (table) => [
	uniqueIndex("idx_api_keys_key_prefix").using("btree", table.keyPrefix.asc().nullsLast().op("text_ops")),
	index("idx_api_keys_org_active").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.isRevoked.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "api_keys_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "api_keys_org_id_organizations_id_fk"
		}),
]);

export const taskSequenceSteps = pgTable("task_sequence_steps", {
	id: serial().primaryKey().notNull(),
	sequenceId: integer("sequence_id").notNull(),
	title: text().notNull(),
	type: text().default('CUSTOM').notNull(),
	notes: text(),
	offsetDays: integer("offset_days").default(0).notNull(),
	order: integer().default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.sequenceId],
			foreignColumns: [taskSequences.id],
			name: "task_sequence_steps_sequence_id_task_sequences_id_fk"
		}).onDelete("cascade"),
]);

export const eventAttendees = pgTable("event_attendees", {
	id: serial().primaryKey().notNull(),
	eventId: integer("event_id").notNull(),
	userId: text("user_id").notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_event_attendees_event_id").using("btree", table.eventId.asc().nullsLast().op("int4_ops")),
	index("idx_event_attendees_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.eventId],
			foreignColumns: [calendarEvents.id],
			name: "event_attendees_event_id_calendar_events_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "event_attendees_user_id_users_id_fk"
		}).onDelete("cascade"),
	unique("event_attendees_event_user_unique").on(table.eventId, table.userId),
]);

export const abTests = pgTable("ab_tests", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	description: text(),
	status: text().default('draft'),
	variantASubject: text("variant_a_subject").notNull(),
	variantBSubject: text("variant_b_subject").notNull(),
	variantABody: text("variant_a_body"),
	variantBBody: text("variant_b_body"),
	splitPercent: integer("split_percent").default(50),
	audienceSize: integer("audience_size").default(0),
	variantASent: integer("variant_a_sent").default(0),
	variantBSent: integer("variant_b_sent").default(0),
	variantAOpens: integer("variant_a_opens").default(0),
	variantBOpens: integer("variant_b_opens").default(0),
	variantAClicks: integer("variant_a_clicks").default(0),
	variantBClicks: integer("variant_b_clicks").default(0),
	winnerVariant: text("winner_variant"),
	startedAt: timestamp("started_at", { mode: 'string' }),
	endedAt: timestamp("ended_at", { mode: 'string' }),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("ab_tests_org_id_idx").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("ab_tests_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "ab_tests_created_by_users_id_fk"
		}),
]);

export const interviews = pgTable("interviews", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	candidateId: integer("candidate_id").notNull(),
	jobPostingId: integer("job_posting_id"),
	interviewerId: text("interviewer_id"),
	type: interviewType().default('VIDEO'),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }).notNull(),
	duration: integer().default(60),
	location: text(),
	meetingLink: text("meeting_link"),
	result: interviewResult().default('PENDING'),
	feedback: text(),
	rating: integer(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	rubric: jsonb(),
	recordingUrl: text("recording_url"),
	recordingPlatform: text("recording_platform"),
	panelInterviewerIds: jsonb("panel_interviewer_ids").default([]),
	remindersSent: jsonb("reminders_sent").default({}).notNull(),
	calendarSyncToken: text("calendar_sync_token"),
}, (table) => [
	index("idx_interviews_candidate").using("btree", table.candidateId.asc().nullsLast().op("int4_ops")),
	index("idx_interviews_interviewer").using("btree", table.interviewerId.asc().nullsLast().op("text_ops")),
	index("idx_interviews_scheduled").using("btree", table.scheduledAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.candidateId],
			foreignColumns: [candidates.id],
			name: "interviews_candidate_id_candidates_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.interviewerId],
			foreignColumns: [users.id],
			name: "interviews_interviewer_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.jobPostingId],
			foreignColumns: [jobPostings.id],
			name: "interviews_job_posting_id_job_postings_id_fk"
		}),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "interviews_org_id_organizations_id_fk"
		}),
]);

export const projectTemplateTickets = pgTable("project_template_tickets", {
	id: serial().primaryKey().notNull(),
	templateId: integer("template_id").notNull(),
	title: text().notNull(),
	description: text(),
	type: text().default('TASK'),
	priority: text().default('MEDIUM'),
	estimatedHours: numeric("estimated_hours"),
	order: integer().default(0).notNull(),
	phase: text(),
}, (table) => [
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [projectTemplates.id],
			name: "project_template_tickets_template_id_project_templates_id_fk"
		}).onDelete("cascade"),
]);

export const csatResponses = pgTable("csat_responses", {
	id: serial().primaryKey().notNull(),
	surveyId: integer("survey_id").notNull(),
	orgId: text("org_id").notNull(),
	rating: integer().notNull(),
	comment: text(),
	respondentName: text("respondent_name"),
	respondentEmail: text("respondent_email"),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_csat_responses_survey").using("btree", table.surveyId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.orgId],
			foreignColumns: [organizations.id],
			name: "csat_responses_org_id_organizations_id_fk"
		}),
	foreignKey({
			columns: [table.surveyId],
			foreignColumns: [csatSurveys.id],
			name: "csat_responses_survey_id_csat_surveys_id_fk"
		}).onDelete("cascade"),
]);

export const contentCalendarItems = pgTable("content_calendar_items", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	title: text().notNull(),
	contentType: text("content_type").default('blog').notNull(),
	channel: text(),
	status: text().default('idea'),
	scheduledDate: date("scheduled_date"),
	publishedDate: date("published_date"),
	assignedTo: text("assigned_to"),
	description: text(),
	tags: text().array().default([""]),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("content_calendar_org_id_idx").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("content_calendar_scheduled_date_idx").using("btree", table.scheduledDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "content_calendar_items_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "content_calendar_items_created_by_users_id_fk"
		}),
]);

export const landingPages = pgTable("landing_pages", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	name: text().notNull(),
	slug: text(),
	title: text(),
	content: text(),
	isPublished: boolean("is_published").default(false),
	url: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true),
	settings: jsonb(),
	createdBy: text("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "landing_pages_created_by_users_id_fk"
		}),
]);

export const pageViews = pgTable("page_views", {
	id: serial().primaryKey().notNull(),
	pageId: integer("page_id"),
	orgId: text("org_id").notNull(),
	referrer: text(),
	country: text(),
	city: text(),
	deviceType: text("device_type"),
	utmSource: text("utm_source"),
	utmMedium: text("utm_medium"),
	utmCampaign: text("utm_campaign"),
	abVariant: text("ab_variant"),
	viewedAt: timestamp("viewed_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("page_views_org_id_idx").using("btree", table.orgId.asc().nullsLast().op("text_ops")),
	index("page_views_page_id_idx").using("btree", table.pageId.asc().nullsLast().op("int4_ops")),
	index("page_views_viewed_at_idx").using("btree", table.viewedAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.pageId],
			foreignColumns: [landingPages.id],
			name: "page_views_page_id_landing_pages_id_fk"
		}).onDelete("cascade"),
]);

export const socialMetrics = pgTable("social_metrics", {
	id: serial().primaryKey().notNull(),
	orgId: text("org_id").notNull(),
	platform: text().notNull(),
	metricDate: date("metric_date").notNull(),
	followers: integer().default(0),
	impressions: integer().default(0),
	engagements: integer().default(0),
	clicks: integer().default(0),
	shares: integer().default(0),
	comments: integer().default(0),
	reach: integer().default(0),
	recordedBy: text("recorded_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("social_metrics_date_idx").using("btree", table.metricDate.asc().nullsLast().op("date_ops")),
	index("social_metrics_org_platform_idx").using("btree", table.orgId.asc().nullsLast().op("text_ops"), table.platform.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.recordedBy],
			foreignColumns: [users.id],
			name: "social_metrics_recorded_by_users_id_fk"
		}),
]);
