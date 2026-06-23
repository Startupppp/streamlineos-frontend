import { pgTable, text, serial, timestamp, boolean, jsonb, decimal, date, integer, index, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  jobPostingStatusEnum, candidateStatusEnum, interviewTypeEnum,
  interviewResultEnum, applicationStatusEnum,
} from "../enums";
import { organizations, users } from "../auth";
import { departments } from "./employees";

export const hiringFlows = pgTable("hiring_flows", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: text("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_hiring_flows_org").on(table.orgId),
]);

export const hiringFlowRounds = pgTable("hiring_flow_rounds", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id").references(() => hiringFlows.id, { onDelete: "cascade" }).notNull(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  roundType: text("round_type").$type<"HR_SCREENING" | "TECHNICAL" | "MANAGER" | "CULTURAL_FIT" | "FINAL" | "CUSTOM">().notNull().default("CUSTOM"),
  mode: text("mode").$type<"VIDEO" | "PHONE" | "ONSITE">().notNull().default("VIDEO"),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  slaDays: integer("sla_days"),
  questionBankTag: text("question_bank_tag"),
  scorecardTemplateId: integer("scorecard_template_id").references(() => scorecardTemplates.id),
  interviewerRoleRestriction: text("interviewer_role_restriction"),
  autoAdvanceThreshold: integer("auto_advance_threshold"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_hiring_flow_rounds_flow").on(table.flowId),
]);

export const jobPostings = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  departmentId: integer("department_id").references(() => departments.id),
  hiringFlowId: integer("hiring_flow_id").references(() => hiringFlows.id),
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

export const interviewQuestions = pgTable("interview_questions", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  category: text("category").notNull().default("GENERAL"),
  role: text("role"),
  difficulty: text("difficulty").notNull().default("MEDIUM"),
  tags: text("tags").array().default([]),
  sampleAnswer: text("sample_answer"),
  keywords: text("keywords").array().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_interview_questions_org").on(table.orgId),
  index("idx_interview_questions_category").on(table.orgId, table.category),
]);

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

export const hiringFlowsRelations = relations(hiringFlows, ({ one, many }) => ({
  organization: one(organizations, { fields: [hiringFlows.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [hiringFlows.createdBy], references: [users.id] }),
  rounds: many(hiringFlowRounds),
  jobPostings: many(jobPostings),
}));

export const hiringFlowRoundsRelations = relations(hiringFlowRounds, ({ one }) => ({
  flow: one(hiringFlows, { fields: [hiringFlowRounds.flowId], references: [hiringFlows.id] }),
  scorecardTemplate: one(scorecardTemplates, { fields: [hiringFlowRounds.scorecardTemplateId], references: [scorecardTemplates.id] }),
}));

export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  organization: one(organizations, { fields: [jobPostings.orgId], references: [organizations.id] }),
  department: one(departments, { fields: [jobPostings.departmentId], references: [departments.id] }),
  hiringFlow: one(hiringFlows, { fields: [jobPostings.hiringFlowId], references: [hiringFlows.id] }),
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

export const interviewSlasRelations = relations(interviewSlas, ({ one }) => ({
  organization: one(organizations, { fields: [interviewSlas.orgId], references: [organizations.id] }),
}));

export const candidateSlaTrackingRelations = relations(candidateSlaTracking, ({ one }) => ({
  organization: one(organizations, { fields: [candidateSlaTracking.orgId], references: [organizations.id] }),
  candidate: one(candidates, { fields: [candidateSlaTracking.candidateId], references: [candidates.id] }),
}));

export const interviewQuestionsRelations = relations(interviewQuestions, ({ one }) => ({
  organization: one(organizations, { fields: [interviewQuestions.orgId], references: [organizations.id] }),
  creator: one(users, { fields: [interviewQuestions.createdBy], references: [users.id] }),
}));

export const candidateReferenceChecksRelations = relations(candidateReferenceChecks, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateReferenceChecks.candidateId], references: [candidates.id] }),
  organization: one(organizations, { fields: [candidateReferenceChecks.orgId], references: [organizations.id] }),
  createdByUser: one(users, { fields: [candidateReferenceChecks.createdBy], references: [users.id] }),
}));

export const candidateOffersRelations = relations(candidateOffers, ({ one }) => ({
  candidate: one(candidates, { fields: [candidateOffers.candidateId], references: [candidates.id] }),
  organization: one(organizations, { fields: [candidateOffers.orgId], references: [organizations.id] }),
  jobPosting: one(jobPostings, { fields: [candidateOffers.jobPostingId], references: [jobPostings.id] }),
  offeredByUser: one(users, { fields: [candidateOffers.offeredBy], references: [users.id] }),
}));
