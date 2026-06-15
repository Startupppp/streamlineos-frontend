-- AUTO-GENERATED full-schema DDL via 'pnpm drizzle-kit export' (source of truth: lib/db/schema).
-- Purpose: authoritative reproducible schema for fresh-DB / CI / DR rebuild. The incremental
-- drizzle journal (drizzle/meta) diverged long ago and feat/nonhr-modules tables were applied
-- via db:push, so this dump is the reliable way to recreate the FULL current schema.
-- Regenerate: pnpm drizzle-kit export > drizzle/_schema_snapshot.generated.sql

[dotenv@17.2.3] injecting env (0) from .env -- tip: 🔄 add secrets lifecycle management: https://dotenvx.com/ops
CREATE TYPE "public"."account_type" AS ENUM('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');
CREATE TYPE "public"."ack_status" AS ENUM('PENDING', 'ACKNOWLEDGED', 'DECLINED');
CREATE TYPE "public"."application_status" AS ENUM('APPLIED', 'SHORTLISTED', 'INTERVIEWING', 'OFFERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');
CREATE TYPE "public"."asset_status" AS ENUM('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED');
CREATE TYPE "public"."assignment_rule_type" AS ENUM('assign_user', 'round_robin');
CREATE TYPE "public"."blog_post_status" AS ENUM('draft', 'published', 'archived');
CREATE TYPE "public"."bonus_type" AS ENUM('PERFORMANCE', 'FESTIVAL', 'REFERRAL', 'SPOT', 'ANNUAL');
CREATE TYPE "public"."branch_status" AS ENUM('ACTIVE', 'INACTIVE');
CREATE TYPE "public"."candidate_status" AS ENUM('NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED');
CREATE TYPE "public"."chat_message_type" AS ENUM('text', 'lead_submission', 'system');
CREATE TYPE "public"."client_account_status" AS ENUM('ACCOUNT_OPENING', 'QUERIES', 'PLAN_SELECTED', 'INVESTED');
CREATE TYPE "public"."crm_activity_type" AS ENUM('deal_won', 'meeting', 'proposal', 'call', 'email', 'ticket', 'escalation');
CREATE TYPE "public"."crm_campaign_status" AS ENUM('active', 'paused', 'completed');
CREATE TYPE "public"."crm_deal_stage" AS ENUM('Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won');
CREATE TYPE "public"."crm_event_status" AS ENUM('planning', 'confirmed', 'completed');
CREATE TYPE "public"."crm_health" AS ENUM('healthy', 'at_risk', 'critical');
CREATE TYPE "public"."crm_lead_status" AS ENUM('visitor', 'lead', 'mql', 'sql', 'opportunity');
CREATE TYPE "public"."crm_person_role" AS ENUM('sales_rep', 'csm');
CREATE TYPE "public"."crm_support_ticket_priority" AS ENUM('critical', 'high', 'medium', 'low');
CREATE TYPE "public"."crm_support_ticket_status" AS ENUM('new', 'in_progress', 'resolved', 'closed');
CREATE TYPE "public"."cycle_status" AS ENUM('draft', 'active', 'completed');
CREATE TYPE "public"."deal_activity_type" AS ENUM('stage_change', 'note', 'call', 'email', 'meeting', 'document');
CREATE TYPE "public"."deal_stage" AS ENUM('LEAD', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');
CREATE TYPE "public"."device_status" AS ENUM('ACTIVE', 'INACTIVE', 'LOST', 'RETURNED');
CREATE TYPE "public"."doc_audit_action" AS ENUM('UPLOADED', 'APPROVED', 'REJECTED', 'RE_UPLOAD_REQUESTED', 'RE_UPLOADED');
CREATE TYPE "public"."document_type" AS ENUM('CONTRACT', 'CERTIFICATE', 'ID_PROOF', 'PAYSLIP', 'POLICY', 'OFFER_LETTER', 'RESUME', 'OTHER');
CREATE TYPE "public"."exit_checklist_status" AS ENUM('PENDING', 'DONE');
CREATE TYPE "public"."expense_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE "public"."feedback_type" AS ENUM('SELF', 'PEER', 'MANAGER', 'SKIP_LEVEL');
CREATE TYPE "public"."fnf_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID');
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER');
CREATE TYPE "public"."incentive_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'ADDED_TO_PAYROLL');
CREATE TYPE "public"."intake_source" AS ENUM('manual', 'web_form', 'email');
CREATE TYPE "public"."intake_status" AS ENUM('pending', 'accepted', 'declined', 'duplicate');
CREATE TYPE "public"."interview_result" AS ENUM('PENDING', 'PASSED', 'FAILED', 'NO_SHOW');
CREATE TYPE "public"."interview_type" AS ENUM('PHONE', 'VIDEO', 'ONSITE', 'TECHNICAL', 'HR', 'FINAL');
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "public"."job_posting_status" AS ENUM('DRAFT', 'OPEN', 'PAUSED', 'CLOSED', 'FILLED');
CREATE TYPE "public"."journal_entry_status" AS ENUM('DRAFT', 'POSTED', 'VOID');
CREATE TYPE "public"."lead_activity_type" AS ENUM('call', 'email', 'whatsapp', 'meeting', 'site_visit');
CREATE TYPE "public"."lead_email_direction" AS ENUM('sent', 'received');
CREATE TYPE "public"."lead_pipeline_status" AS ENUM('NEW', 'CONTACTED', 'INTERESTED', 'QUALIFIED', 'CONVERTED', 'LOST');
CREATE TYPE "public"."lead_priority" AS ENUM('HOT', 'WARM', 'COLD');
CREATE TYPE "public"."lead_source" AS ENUM('referral', 'campaign', 'cold_call', 'website', 'social_media', 'walk_in', 'other');
CREATE TYPE "public"."lead_task_status" AS ENUM('open', 'done');
CREATE TYPE "public"."leave_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "public"."loan_status" AS ENUM('PENDING', 'APPROVED', 'ACTIVE', 'REPAID', 'REJECTED');
CREATE TYPE "public"."meeting_status" AS ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
CREATE TYPE "public"."module_status" AS ENUM('backlog', 'planned', 'in-progress', 'completed', 'paused', 'cancelled');
CREATE TYPE "public"."notification_type" AS ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR');
CREATE TYPE "public"."onboarding_doc_status" AS ENUM('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED');
CREATE TYPE "public"."onboarding_document_status" AS ENUM('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RE_UPLOAD_REQUESTED');
CREATE TYPE "public"."onboarding_status" AS ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');
CREATE TYPE "public"."org_size" AS ENUM('1-10', '11-50', '51-200', '201-1000', '1000+');
CREATE TYPE "public"."payroll_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID');
CREATE TYPE "public"."pip_status" AS ENUM('ACTIVE', 'EXTENDED', 'COMPLETED', 'TERMINATED');
CREATE TYPE "public"."project_status" AS ENUM('ACTIVE', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "public"."quote_status" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');
CREATE TYPE "public"."reimbursement_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE "public"."resignation_status" AS ENUM('SUBMITTED', 'PENDING_HR', 'HR_APPROVED', 'CEO_APPROVED', 'IN_PROGRESS', 'APPROVED', 'WITHDRAWN', 'COMPLETED', 'REJECTED');
CREATE TYPE "public"."review_cycle_status" AS ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "public"."review_status" AS ENUM('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "public"."scoring_operator" AS ENUM('eq', 'gt', 'lt', 'contains', 'in');
CREATE TYPE "public"."sla_applies_to" AS ENUM('lead', 'deal', 'both');
CREATE TYPE "public"."sla_priority" AS ENUM('low', 'medium', 'high', 'urgent');
CREATE TYPE "public"."state_group" AS ENUM('backlog', 'unstarted', 'started', 'completed', 'cancelled');
CREATE TYPE "public"."subscription_plan" AS ENUM('STARTER', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE "public"."subscription_status" AS ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');
CREATE TYPE "public"."support_ticket_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "public"."support_ticket_status" AS ENUM('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED');
CREATE TYPE "public"."survey_status" AS ENUM('DRAFT', 'ACTIVE', 'CLOSED');
CREATE TYPE "public"."task_entity_type" AS ENUM('LEAD', 'DEAL', 'CONTACT', 'PROJECT');
CREATE TYPE "public"."task_status" AS ENUM('pending', 'completed', 'cancelled');
CREATE TYPE "public"."task_type" AS ENUM('CALL', 'EMAIL', 'MEETING', 'CUSTOM');
CREATE TYPE "public"."termination_status" AS ENUM('DRAFT', 'PENDING_CEO', 'APPROVED', 'REJECTED', 'SENT', 'COMPLETED');
CREATE TYPE "public"."ticket_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "public"."ticket_status" AS ENUM('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');
CREATE TYPE "public"."ticket_type" AS ENUM('EPIC', 'STORY', 'TASK', 'BUG');
CREATE TYPE "public"."view_layout" AS ENUM('board', 'list', 'table', 'calendar', 'gantt');
CREATE TYPE "public"."wfh_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "public"."work_item_relation_type" AS ENUM('blocks', 'blocked_by', 'duplicate_of', 'relates_to');
CREATE TYPE "public"."okr_goal_level" AS ENUM('company', 'team', 'individual');
CREATE TYPE "public"."okr_goal_status" AS ENUM('not_started', 'on_track', 'at_risk', 'off_track', 'completed');
CREATE TYPE "public"."okr_kr_metric" AS ENUM('number', 'percentage', 'currency', 'boolean');
CREATE TYPE "public"."changelog_type" AS ENUM('feature', 'improvement', 'fix');
CREATE TYPE "public"."feedback_status" AS ENUM('open', 'planned', 'in_progress', 'completed', 'declined');
CREATE TYPE "public"."roadmap_status" AS ENUM('planned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "public"."git_provider" AS ENUM('github', 'gitlab', 'bitbucket');
CREATE TYPE "public"."git_ref_type" AS ENUM('commit', 'pull_request', 'branch');
CREATE TYPE "public"."ticket_activity_action" AS ENUM('created', 'status_changed', 'priority_changed', 'assignee_changed', 'title_changed', 'sprint_changed', 'due_date_changed', 'comment_added', 'label_changed');
CREATE TYPE "public"."client_health_status" AS ENUM('healthy', 'at_risk', 'critical');
CREATE TYPE "public"."nps_category" AS ENUM('promoter', 'passive', 'detractor');
CREATE TYPE "public"."nps_survey_status" AS ENUM('draft', 'active', 'closed');
CREATE TYPE "public"."kb_article_status" AS ENUM('draft', 'published', 'archived');
CREATE TYPE "public"."kb_article_visibility" AS ENUM('public', 'internal');
CREATE TYPE "public"."support_activity_action" AS ENUM('created', 'status_changed', 'priority_changed', 'assignee_changed', 'replied', 'internal_note', 'resolved', 'reopened');
CREATE TYPE "public"."automation_run_status" AS ENUM('success', 'failed', 'skipped');
CREATE TYPE "public"."automation_trigger" AS ENUM('lead.created', 'deal.stage_changed', 'ticket.created', 'invoice.overdue');
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);

CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"description" text,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"org_id" text NOT NULL,
	"role" text DEFAULT 'ENGINEERING' NOT NULL,
	"invited_by" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);

CREATE TABLE "mfa_backup_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "onboarding_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"step_name" text NOT NULL,
	"status" "onboarding_status" DEFAULT 'PENDING' NOT NULL,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "organization_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"role" text DEFAULT 'ENGINEERING' NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"website" text,
	"industry" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"fiscal_year_start" integer DEFAULT 4 NOT NULL,
	"settings" jsonb,
	"billing_email" text,
	"address" jsonb,
	"mfa_enforced" boolean DEFAULT false NOT NULL,
	"allowed_email_domains" text[] DEFAULT '{}',
	"password_expiry_days" integer,
	"enabled_modules" text[],
	"onboarding_completed_at" timestamp,
	"company_size" text,
	"country" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);

CREATE TABLE "password_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);

CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);

CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"permission_id" integer NOT NULL,
	"org_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"org_id" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);

CREATE TABLE "user_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"permission_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"granted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "user_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"last_active" timestamp DEFAULT now() NOT NULL,
	"device_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"password" text,
	"first_name" text,
	"last_name" text,
	"gender" "gender",
	"skills" text[],
	"experience_years" numeric(5, 2),
	"joining_date" date,
	"date_of_birth" date,
	"tax_id" text,
	"bank_details" jsonb,
	"image" text,
	"role" text DEFAULT 'ENGINEERING' NOT NULL,
	"department_id" integer,
	"designation" text,
	"phone" text,
	"whatsapp_number" text,
	"whatsapp_same_as_phone" boolean DEFAULT true NOT NULL,
	"monthly_salary" numeric(15, 2),
	"employee_id" text,
	"metadata" jsonb,
	"is_password_change_required" boolean DEFAULT false NOT NULL,
	"login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"has_dashboard_access" boolean DEFAULT false NOT NULL,
	"reporting_to" text,
	"team" text,
	"branch_id" integer,
	"emergency_contact" jsonb,
	"totp_secret" text,
	"totp_enabled" boolean DEFAULT false NOT NULL,
	"password_changed_at" timestamp,
	"google_refresh_token" text,
	"google_email" text,
	"is_profile_picture_required" boolean DEFAULT false NOT NULL,
	"bio" text,
	"linkedin_url" text,
	"twitter_url" text,
	"github_url" text,
	"website_url" text,
	"onboarding_doc_status" "onboarding_doc_status" DEFAULT 'PENDING' NOT NULL,
	"onboarding_completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);

CREATE TABLE "custom_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3B82F6' NOT NULL,
	"group" "state_group" NOT NULL,
	"sequence" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "cycle_status" DEFAULT 'draft' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "module_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_id" integer NOT NULL,
	"linked_module_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "module_status" DEFAULT 'backlog' NOT NULL,
	"lead_id" text,
	"start_date" date,
	"end_date" date,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "project_template_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'TASK' NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"estimated_hours" numeric(8, 2),
	"order" integer DEFAULT 0 NOT NULL,
	"phase" text
);

CREATE TABLE "project_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'GENERAL' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"key" text NOT NULL,
	"client_id" text,
	"manager_id" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"status" "project_status" DEFAULT 'ACTIVE' NOT NULL,
	"deal_id" integer,
	"budget" numeric(15, 2),
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_key_unique" UNIQUE("key")
);

CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb,
	"created_by" text,
	"is_scheduled" boolean DEFAULT false NOT NULL,
	"schedule_config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "sprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"goal" text,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ticket_assignees" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" text
);

CREATE TABLE "ticket_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"ticket_id" integer NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ticket_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"content" text NOT NULL,
	"parent_comment_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ticket_label_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"label_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ticket_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#3B82F6' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ticket_watchers" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "ticket_type" DEFAULT 'TASK' NOT NULL,
	"status" text DEFAULT 'TODO' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'MEDIUM' NOT NULL,
	"project_id" integer,
	"ticket_number" integer NOT NULL,
	"sprint_id" integer,
	"epic_id" integer,
	"assignee_id" text,
	"reporter_id" text,
	"points" integer,
	"story_points" integer,
	"link" text,
	"order" integer DEFAULT 0 NOT NULL,
	"parent_ticket_id" integer,
	"original_estimate" numeric(10, 2),
	"time_spent" numeric(10, 2) DEFAULT '0' NOT NULL,
	"start_date" date,
	"due_date" date,
	"state_id" integer,
	"module_id" integer,
	"cycle_id" integer,
	"sequence_id" text,
	"estimate" integer,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "timesheets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"ticket_id" integer,
	"date" date NOT NULL,
	"hours" numeric(6, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"image_url" text,
	"work_link" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"is_billable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "work_item_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_item_id" integer NOT NULL,
	"related_work_item_id" integer NOT NULL,
	"relation_type" "work_item_relation_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "intake_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"description" jsonb,
	"source" "intake_source" DEFAULT 'manual' NOT NULL,
	"status" "intake_status" DEFAULT 'pending' NOT NULL,
	"submitter_email" text,
	"linked_work_item_id" integer,
	"decline_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb,
	"icon" text,
	"cover_image" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"parent_page_id" integer,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'CONTRIBUTOR' NOT NULL,
	"hourly_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "project_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_date" date NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "project_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "project_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"group_by" text,
	"order_by" text,
	"layout_type" "view_layout" DEFAULT 'board' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "project_daily_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"project_id" integer NOT NULL,
	"snapshot_date" date NOT NULL,
	"state_group" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "okr_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"owner_id" text,
	"level" "okr_goal_level" DEFAULT 'company' NOT NULL,
	"status" "okr_goal_status" DEFAULT 'not_started' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"start_date" date,
	"due_date" date,
	"parent_goal_id" integer,
	"project_id" integer,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "okr_key_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"goal_id" integer NOT NULL,
	"title" text NOT NULL,
	"metric_type" "okr_kr_metric" DEFAULT 'number' NOT NULL,
	"start_value" numeric(18, 2) DEFAULT '0' NOT NULL,
	"target_value" numeric(18, 2) NOT NULL,
	"current_value" numeric(18, 2) DEFAULT '0' NOT NULL,
	"unit" text,
	"status" "okr_goal_status" DEFAULT 'not_started' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "okr_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"goal_id" integer NOT NULL,
	"ticket_id" integer,
	"project_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "okr_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"goal_id" integer NOT NULL,
	"key_result_id" integer,
	"note" text,
	"previous_value" numeric(18, 2),
	"new_value" numeric(18, 2),
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "changelog_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"version" text,
	"type" "changelog_type" DEFAULT 'feature' NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"linked_roadmap_item_id" integer,
	"published_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "feedback_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "feedback_status" DEFAULT 'open' NOT NULL,
	"category" text,
	"votes" integer DEFAULT 0 NOT NULL,
	"submitted_by_name" text,
	"submitted_by_email" text,
	"linked_roadmap_item_id" integer,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "feedback_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"feedback_post_id" integer NOT NULL,
	"voter_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "roadmap_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "roadmap_status" DEFAULT 'planned' NOT NULL,
	"category" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"project_id" integer,
	"epic_ticket_id" integer,
	"target_quarter" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"votes" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "roadmap_votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"roadmap_item_id" integer NOT NULL,
	"voter_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "project_whiteboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"data" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "git_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"provider" "git_provider" NOT NULL,
	"repo_url" text NOT NULL,
	"repo_name" text,
	"webhook_secret" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "git_ticket_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"ticket_id" integer NOT NULL,
	"connection_id" integer,
	"provider" "git_provider" NOT NULL,
	"ref_type" "git_ref_type" NOT NULL,
	"external_id" text NOT NULL,
	"title" text,
	"url" text,
	"author" text,
	"status" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ticket_activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"ticket_id" integer NOT NULL,
	"user_id" text,
	"action" "ticket_activity_action" NOT NULL,
	"from_value" text,
	"to_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ticket_comment_mentions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"comment_id" integer NOT NULL,
	"mentioned_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "department_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"manager_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"check_in" timestamp,
	"check_out" timestamp,
	"status" text DEFAULT 'PRESENT' NOT NULL,
	"work_hours" numeric(6, 2),
	"break_hours" numeric(6, 2) DEFAULT '0' NOT NULL,
	"breaks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"location_data" jsonb,
	"is_overtime" boolean DEFAULT false NOT NULL,
	"auto_checked_out" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "employee_devices" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"device_type" text NOT NULL,
	"device_name" text NOT NULL,
	"serial_number" text,
	"brand" text,
	"model" text,
	"assigned_date" date,
	"return_date" date,
	"status" "device_status" DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "helpdesk_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text,
	"priority" "ticket_priority" DEFAULT 'MEDIUM' NOT NULL,
	"status" "ticket_status" DEFAULT 'TODO' NOT NULL,
	"assignee_id" text,
	"resolved_at" timestamp,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "holidays" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"message" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"notification_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "wfh_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"reason" text,
	"status" "wfh_request_status" DEFAULT 'PENDING' NOT NULL,
	"approver_id" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "leave_balances" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"leave_type_id" integer NOT NULL,
	"balance" numeric(6, 2) DEFAULT '0' NOT NULL,
	"year" integer NOT NULL
);

CREATE TABLE "leave_blackout_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text NOT NULL,
	"applies_to" text DEFAULT 'ALL' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"leave_type_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"status" "leave_status" DEFAULT 'PENDING' NOT NULL,
	"approver_id" text,
	"rejection_reason" text,
	"manager_comment" text,
	"attachment_url" text,
	"is_half_day" boolean DEFAULT false NOT NULL,
	"half_day_period" text,
	"covering_employee_id" text,
	"lop_days" numeric(5, 1) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "leave_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"days_per_year" integer NOT NULL,
	"carry_forward" boolean DEFAULT false NOT NULL
);

CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"serial_number" text,
	"assigned_to" text,
	"status" "asset_status" DEFAULT 'AVAILABLE' NOT NULL,
	"purchase_date" date,
	"purchase_cost" numeric(15, 2),
	"location" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "asset_returns" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"asset_id" integer,
	"asset_name" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"returned_at" timestamp,
	"condition" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "bonuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "bonus_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"reason" text,
	"month" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "expense_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"budget_limit" numeric(15, 2),
	"budget_period" text DEFAULT 'MONTHLY' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "expenses" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"category_id" integer,
	"category" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"description" text,
	"receipt_url" text,
	"receipt_file_name" text,
	"merchant" text,
	"payment_method" text,
	"project_id" integer,
	"status" "expense_status" DEFAULT 'PENDING' NOT NULL,
	"approver_id" text,
	"approved_at" timestamp,
	"rejection_reason" text,
	"paid_at" timestamp,
	"transaction_ref" text,
	"expense_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "fnf_settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"resignation_id" integer,
	"basic_dues" numeric(15, 2) DEFAULT '0' NOT NULL,
	"leave_encashment" numeric(15, 2) DEFAULT '0' NOT NULL,
	"bonus_due" numeric(15, 2) DEFAULT '0' NOT NULL,
	"deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"loan_recovery" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_payable" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" "fnf_status" DEFAULT 'DRAFT' NOT NULL,
	"approved_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "payrolls" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"month" text NOT NULL,
	"basic_salary" numeric(15, 2) NOT NULL,
	"hra" numeric(15, 2) DEFAULT '0' NOT NULL,
	"allowances" numeric(15, 2) DEFAULT '0' NOT NULL,
	"deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"gross_salary" numeric(15, 2) NOT NULL,
	"net_salary" numeric(15, 2) NOT NULL,
	"status" "payroll_status" DEFAULT 'DRAFT' NOT NULL,
	"generated_by" text,
	"approved_by" text,
	"overtime_type" text,
	"overtime_days" numeric(6, 2) DEFAULT '0' NOT NULL,
	"overtime_hours" numeric(6, 2) DEFAULT '0' NOT NULL,
	"overtime_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"payslip_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "reimbursements" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"description" text,
	"receipt_url" text,
	"status" "reimbursement_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"paid_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "salary_loans" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"reason" text,
	"emi_amount" numeric(15, 2),
	"total_emis" integer,
	"paid_emis" integer DEFAULT 0 NOT NULL,
	"status" "loan_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"disbursed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "salary_structures" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"basic_salary" numeric(15, 2) NOT NULL,
	"hra_percentage" numeric(5, 2) DEFAULT '40' NOT NULL,
	"allowances" numeric(15, 2) DEFAULT '0' NOT NULL,
	"deductions" numeric(15, 2) DEFAULT '0' NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "calibration_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_posting_id" integer,
	"scheduled_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"decision" text,
	"participant_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "candidate_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_posting_id" integer NOT NULL,
	"status" "application_status" DEFAULT 'APPLIED' NOT NULL,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"cover_letter" text,
	"notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "candidate_documents_vault" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"filename" text NOT NULL,
	"s3_key" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"document_type" text,
	"av_result" text DEFAULT 'PENDING' NOT NULL,
	"expires_at" date,
	"uploaded_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "candidate_offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_posting_id" integer,
	"offered_by" text,
	"offer_status" text DEFAULT 'DRAFT' NOT NULL,
	"offered_salary" numeric(15, 2),
	"offered_designation" text,
	"joining_date" date,
	"offer_letter_url" text,
	"valid_until" date,
	"notes" text,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "candidate_reference_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"reference_name" text NOT NULL,
	"reference_designation" text,
	"reference_company" text,
	"reference_email" text,
	"reference_phone" text,
	"relationship" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"outcome" text,
	"notes" text,
	"contacted_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "candidate_referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"candidate_id" integer NOT NULL,
	"referred_by" text NOT NULL,
	"relationship" text,
	"notes" text,
	"bonus_eligible" boolean DEFAULT true NOT NULL,
	"bonus_amount" numeric(12, 2),
	"bonus_paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "candidate_sla_tracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"candidate_id" integer NOT NULL,
	"stage" text NOT NULL,
	"entered_at" timestamp DEFAULT now() NOT NULL,
	"breached_at" timestamp,
	"status" text DEFAULT 'ON_TRACK' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "candidate_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"platform" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"oauth_token" text,
	"meta" jsonb,
	"last_synced_at" timestamp,
	"last_sync_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"resume_url" text,
	"linkedin_url" text,
	"portfolio_url" text,
	"current_company" text,
	"current_role" text,
	"experience_years" numeric(5, 2),
	"skills" text[],
	"source" text DEFAULT 'DIRECT' NOT NULL,
	"status" "candidate_status" DEFAULT 'NEW' NOT NULL,
	"notes" text,
	"rating" integer,
	"referred_by" text,
	"external_id" text,
	"duplicate_of_id" integer,
	"resume_text" text,
	"ai_score" integer,
	"ai_score_breakdown" jsonb,
	"ai_score_generated_at" timestamp,
	"bgv_status" text DEFAULT 'NOT_INITIATED',
	"bgv_agency" text,
	"bgv_notes" text,
	"bgv_initiated_at" timestamp,
	"bgv_completed_at" timestamp,
	"source_url" text,
	"location" text,
	"gender" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "interview_booking_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_posting_id" integer,
	"token" text NOT NULL,
	"interviewer_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duration_minutes" integer DEFAULT 60 NOT NULL,
	"interview_type" text DEFAULT 'VIDEO' NOT NULL,
	"available_slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_slot" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_by" text NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "interview_booking_links_token_unique" UNIQUE("token")
);

CREATE TABLE "interview_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"question" text NOT NULL,
	"category" text DEFAULT 'GENERAL' NOT NULL,
	"role" text,
	"difficulty" text DEFAULT 'MEDIUM' NOT NULL,
	"tags" text[] DEFAULT '{}',
	"sample_answer" text,
	"keywords" text[] DEFAULT '{}',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "interview_scorecards" (
	"id" serial PRIMARY KEY NOT NULL,
	"interview_id" integer NOT NULL,
	"interviewer_id" text NOT NULL,
	"template_id" integer,
	"ratings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recommendation" text DEFAULT 'MAYBE' NOT NULL,
	"notes" text,
	"is_blind_mode" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "interview_slas" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"stage" text NOT NULL,
	"max_hours" integer DEFAULT 48 NOT NULL,
	"warning_hours" integer DEFAULT 36 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_posting_id" integer,
	"interviewer_id" text,
	"type" "interview_type" DEFAULT 'VIDEO' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"location" text,
	"meeting_link" text,
	"result" "interview_result" DEFAULT 'PENDING' NOT NULL,
	"feedback" text,
	"rating" integer,
	"rubric" jsonb,
	"notes" text,
	"recording_url" text,
	"recording_platform" text,
	"panel_interviewer_ids" jsonb DEFAULT '[]'::jsonb,
	"reminders_sent" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"calendar_sync_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "job_postings" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"department_id" integer,
	"location" text,
	"type" text DEFAULT 'FULL_TIME' NOT NULL,
	"experience" text,
	"salary_min" numeric(15, 2),
	"salary_max" numeric(15, 2),
	"description" text,
	"requirements" text,
	"benefits" text,
	"status" "job_posting_status" DEFAULT 'DRAFT' NOT NULL,
	"openings" integer DEFAULT 1 NOT NULL,
	"application_deadline" date,
	"closing_date" timestamp,
	"posted_by" text,
	"external_posting_ids" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "scorecard_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"criteria" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "vault_access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"vault_document_id" integer NOT NULL,
	"accessed_by" text NOT NULL,
	"action" text DEFAULT 'VIEW' NOT NULL,
	"accessed_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "alumni_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"current_company" text,
	"current_role" text,
	"linkedin_url" text,
	"email" text,
	"left_date" date,
	"is_opted_in" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "background_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"provider" text,
	"reference_number" text,
	"result" text,
	"notes" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "candidate_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"template_id" integer,
	"title" text NOT NULL,
	"html_content" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'GENERATED' NOT NULL,
	"external_doc_id" text,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"signed_at" timestamp,
	"declined_at" timestamp,
	"acceptance_deadline" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "certifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"issuing_organization" text,
	"issue_date" date,
	"expiry_date" date,
	"credential_id" text,
	"credential_url" text,
	"document_url" text,
	"reminder_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "document_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"onboarding_document_id" integer NOT NULL,
	"action" "doc_audit_action" NOT NULL,
	"performed_by" text NOT NULL,
	"remarks" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "document_template_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"html_content" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"archived_at" timestamp DEFAULT now() NOT NULL,
	"archived_by" text NOT NULL
);

CREATE TABLE "document_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'OFFER' NOT NULL,
	"html_content" text DEFAULT '' NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "document_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"applicable_roles" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "exit_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"resignation_id" integer NOT NULL,
	"item" text NOT NULL,
	"assigned_to" text,
	"status" "exit_checklist_status" DEFAULT 'PENDING' NOT NULL,
	"completed_at" timestamp,
	"notes" text
);

CREATE TABLE "onboarding_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"document_type_id" integer NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "onboarding_document_status" DEFAULT 'SUBMITTED' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "onboarding_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"template_step_id" integer,
	"title" text NOT NULL,
	"description" text,
	"owner_role" text DEFAULT 'NEW_HIRE' NOT NULL,
	"due_date" timestamp,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"completed_at" timestamp,
	"completed_by" text,
	"depends_on_task_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "onboarding_template_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"owner_role" text DEFAULT 'NEW_HIRE' NOT NULL,
	"due_offset_days" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_compliance_item" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "onboarding_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"department_id" integer,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "resignations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reason" text,
	"reason_category" text,
	"last_working_date" date,
	"notice_period_days" integer DEFAULT 30 NOT NULL,
	"status" "resignation_status" DEFAULT 'SUBMITTED' NOT NULL,
	"resignation_letter_url" text,
	"approved_by" text,
	"approved_at" timestamp,
	"hr_reviewed_by" text,
	"hr_reviewed_at" timestamp,
	"hr_remarks" text,
	"ceo_reviewed_by" text,
	"ceo_reviewed_at" timestamp,
	"ceo_remarks" text,
	"willing_for_exit_interview" boolean DEFAULT true NOT NULL,
	"company_feedback" text,
	"exit_interview_notes" text,
	"exit_interview_date" timestamp,
	"exit_interview_conducted_by" text,
	"feedback" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "terminations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reasons" text[] DEFAULT '{}' NOT NULL,
	"detailed_explanation" text NOT NULL,
	"effective_date" date NOT NULL,
	"severance_amount" numeric(15, 2),
	"notice_period_waived" boolean DEFAULT false NOT NULL,
	"termination_letter_url" text,
	"supporting_doc_urls" text[] DEFAULT '{}',
	"internal_notes" text,
	"status" "termination_status" DEFAULT 'DRAFT' NOT NULL,
	"initiated_by" text,
	"ceo_reviewed_by" text,
	"ceo_reviewed_at" timestamp,
	"ceo_remarks" text,
	"email_sent_at" timestamp,
	"email_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "assessment_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"answers" jsonb,
	"score" integer,
	"passed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "employee_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"skill_name" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"verified_by" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "enps_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"score" integer NOT NULL,
	"comment" text,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"period" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "feedback_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"subject_user_id" text NOT NULL,
	"reviewer_user_id" text NOT NULL,
	"type" "feedback_type" NOT NULL,
	"cycle_id" integer,
	"ratings" jsonb,
	"strengths" text,
	"improvements" text,
	"overall_rating" integer,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'OKR' NOT NULL,
	"target_value" numeric(15, 2),
	"current_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"unit" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'IN_PROGRESS' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"parent_goal_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "key_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"goal_id" integer NOT NULL,
	"title" text NOT NULL,
	"target_value" numeric(15, 2),
	"current_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"unit" text,
	"progress" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "one_on_one_meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"manager_id" text NOT NULL,
	"employee_id" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration" integer DEFAULT 30 NOT NULL,
	"status" "meeting_status" DEFAULT 'SCHEDULED' NOT NULL,
	"notes" text,
	"action_items" jsonb,
	"agenda" text,
	"meeting_link" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "performance_improvement_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"manager_id" text NOT NULL,
	"hr_rep_id" text,
	"reason" text NOT NULL,
	"objectives" jsonb,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" "pip_status" DEFAULT 'ACTIVE' NOT NULL,
	"outcome" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "performance_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"reviewer_id" text,
	"cycle_id" integer,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" "review_status" DEFAULT 'DRAFT' NOT NULL,
	"ratings" jsonb,
	"strengths" text,
	"improvements" text,
	"goals" jsonb,
	"overall_rating" numeric(4, 2),
	"comments" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "pulse_surveys" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"questions" jsonb,
	"status" "survey_status" DEFAULT 'DRAFT' NOT NULL,
	"is_anonymous" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"closes_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "recognitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"from_user_id" text NOT NULL,
	"to_user_id" text NOT NULL,
	"message" text NOT NULL,
	"category" text DEFAULT 'KUDOS' NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "review_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'QUARTERLY' NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"deadline" date,
	"status" "review_cycle_status" DEFAULT 'DRAFT' NOT NULL,
	"description" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "skill_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"skill_name" text NOT NULL,
	"questions" jsonb,
	"passing_score" integer DEFAULT 70 NOT NULL,
	"time_limit" integer,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "survey_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"survey_id" integer NOT NULL,
	"user_id" text,
	"answers" jsonb,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "career_ladders" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"department" text,
	"description" text,
	"levels" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"department_id" integer,
	"name" text NOT NULL,
	"description" text,
	"type" "document_type" NOT NULL,
	"category" text,
	"file_url" text NOT NULL,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"version" integer DEFAULT 1 NOT NULL,
	"parent_document_id" integer,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expiry_date" date,
	"expiry_reminder_sent" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"metadata" jsonb,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "hr_email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"category" text DEFAULT 'GENERAL' NOT NULL,
	"variables" text[],
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "handbook_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"version" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"document_id" integer,
	"document_url" text,
	"changelog" text,
	"published_at" timestamp,
	"published_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "learning_paths" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_role" text,
	"steps" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "policy_acknowledgments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"document_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"status" "ack_status" DEFAULT 'PENDING' NOT NULL,
	"acknowledged_at" timestamp,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "rich_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"content_json" jsonb,
	"template_type" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "team_event_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'GOING' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "team_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'TEAM_BUILDING' NOT NULL,
	"date" date NOT NULL,
	"time" text,
	"location" text,
	"max_participants" integer,
	"organized_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "crm_campaign_status" DEFAULT 'active' NOT NULL,
	"channel" text,
	"description" text,
	"start_date" date,
	"end_date" date,
	"target_audience" text,
	"leads" integer DEFAULT 0 NOT NULL,
	"spend" numeric(15, 2) DEFAULT '0' NOT NULL,
	"roi" numeric(8, 4) DEFAULT '0' NOT NULL,
	"budget_allocated" numeric(15, 2),
	"budget_spent" numeric(15, 2),
	"owner_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"leads" integer DEFAULT 0 NOT NULL,
	"conv_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"date" text NOT NULL,
	"type" text NOT NULL,
	"status" "crm_event_status" DEFAULT 'planning' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"campaign_id" integer,
	"email" text,
	"name" text,
	"status" "crm_lead_status" DEFAULT 'lead' NOT NULL,
	"channel" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "email_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"template_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"recipient_filter" jsonb,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp,
	"sent_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "assignment_rule_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"rule_id" integer NOT NULL,
	"last_assigned_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "assignment_rule_state_rule_id_unique" UNIQUE("rule_id")
);

CREATE TABLE "lead_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"lead_id" integer NOT NULL,
	"type" "lead_activity_type" NOT NULL,
	"date" timestamp NOT NULL,
	"duration" integer,
	"subject" text,
	"location" text,
	"location_link" text,
	"message_summary" text,
	"notes" text,
	"outcome" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "lead_assignment_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb,
	"assignment_type" "assignment_rule_type" NOT NULL,
	"assign_to_user_id" text,
	"round_robin_user_ids" jsonb DEFAULT '[]'::jsonb,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "lead_emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"direction" "lead_email_direction" NOT NULL,
	"subject" text,
	"body" text,
	"from_email" text NOT NULL,
	"to_email" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"message_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "lead_import_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_by" text NOT NULL,
	"filename" text NOT NULL,
	"status" text DEFAULT 'PROCESSING' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"failed_rows" integer DEFAULT 0 NOT NULL,
	"error_report" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);

CREATE TABLE "lead_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "lead_scoring_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"field" text NOT NULL,
	"operator" "scoring_operator" NOT NULL,
	"value" text NOT NULL,
	"points" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "lead_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"due_date" date,
	"assignee_id" text,
	"status" "lead_task_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"whatsapp_number" text,
	"source" "lead_source" DEFAULT 'other' NOT NULL,
	"campaign_id" integer,
	"status" "lead_pipeline_status" DEFAULT 'NEW' NOT NULL,
	"priority" "lead_priority" DEFAULT 'WARM' NOT NULL,
	"investment_interest" numeric(15, 2),
	"potential_value" numeric(15, 2),
	"notes" text,
	"assigned_to_id" text,
	"assigned_by_id" text,
	"verified_by_id" text,
	"assigned_at" timestamp,
	"converted_at" timestamp,
	"lost_reason" text,
	"company" text,
	"designation" text,
	"city" text,
	"referred_by" text,
	"tags" text[],
	"score" integer DEFAULT 0 NOT NULL,
	"sla_deadline" timestamp,
	"website" text,
	"sub_source" text,
	"dm_lead_id" integer,
	"follow_up_date" timestamp,
	"follow_up_notes" text,
	"custom_data" jsonb,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_content" text,
	"utm_term" text,
	"ip_address" text,
	"referrer_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"merged_into_id" integer
);

CREATE TABLE "web_lead_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"public_token" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"submit_message" text DEFAULT 'Thank you! We''ll be in touch soon.' NOT NULL,
	"redirect_url" text,
	"total_submissions" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "web_lead_forms_public_token_unique" UNIQUE("public_token")
);

CREATE TABLE "branches" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"city" text,
	"state" text,
	"country" text DEFAULT 'India' NOT NULL,
	"pincode" text,
	"address" text,
	"phone" text,
	"email" text,
	"branch_manager_id" text,
	"branch_hr_id" text,
	"status" "branch_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "client_account_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_account_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "client_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"branch_id" integer,
	"lead_id" integer NOT NULL,
	"sales_rep_id" text NOT NULL,
	"assigned_crm_id" text,
	"client_name" text NOT NULL,
	"client_email" text,
	"client_phone" text,
	"client_whatsapp" text,
	"status" "client_account_status" DEFAULT 'ACCOUNT_OPENING' NOT NULL,
	"investment_amount" numeric(15, 2),
	"plan_name" text,
	"investment_date" timestamp,
	"transaction_ref" text,
	"conversion_notes" text,
	"estimated_investment" numeric(15, 2),
	"converted_at" timestamp DEFAULT now() NOT NULL,
	"invested_at" timestamp,
	"renewal_stage" text DEFAULT 'upcoming' NOT NULL,
	"renewal_date" date,
	"renewal_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "client_onboarding_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"client_id" integer NOT NULL,
	"template_id" integer,
	"title" text NOT NULL,
	"description" text,
	"assigned_to" text,
	"due_date" date,
	"completed_at" timestamp,
	"completed_by" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "client_onboarding_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "client_opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"client_id" integer NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'upsell' NOT NULL,
	"stage" text DEFAULT 'identified' NOT NULL,
	"value" numeric(15, 2),
	"notes" text,
	"expected_close_date" date,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"lead_id" integer,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"designation" text,
	"city" text,
	"state" text,
	"gstin" text,
	"is_vendor" boolean DEFAULT false NOT NULL,
	"investment_value" numeric(15, 2),
	"status" text DEFAULT 'active' NOT NULL,
	"account_manager_id" text,
	"notes" text,
	"health_score" integer DEFAULT 50 NOT NULL,
	"health_status" "crm_health" DEFAULT 'healthy' NOT NULL,
	"last_health_check" timestamp,
	"churn_risk_score" integer,
	"churn_risk_reasoning" text,
	"converted_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"title" text,
	"department" text,
	"company" text,
	"organization_id" integer,
	"linkedin_url" text,
	"twitter_url" text,
	"website_url" text,
	"avatar_url" text,
	"lead_id" integer,
	"deal_id" integer,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"industry" text,
	"size" "org_size",
	"website" text,
	"linkedin_url" text,
	"description" text,
	"health_score" integer,
	"parent_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "csat_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"survey_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"respondent_name" text,
	"respondent_email" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "csat_surveys" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"client_id" integer,
	"title" text NOT NULL,
	"question" text DEFAULT 'How satisfied are you with our service?' NOT NULL,
	"scale_max" integer DEFAULT 5 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"public_token" text NOT NULL,
	"sent_at" timestamp,
	"closed_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "commission_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'flat_percent' NOT NULL,
	"flat_rate" numeric(5, 2),
	"tiers" jsonb,
	"applies_to" text DEFAULT 'all' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "commissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"deal_id" integer NOT NULL,
	"rule_id" integer,
	"deal_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"commission_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"commission_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "custom_field_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"name" text NOT NULL,
	"label" text NOT NULL,
	"field_type" text DEFAULT 'text' NOT NULL,
	"options" jsonb,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deal_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"deal_id" integer NOT NULL,
	"type" "deal_activity_type" NOT NULL,
	"previous_value" text,
	"new_value" text,
	"subject" text,
	"notes" text,
	"duration" integer,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deal_approval_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"min_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"approver_role" text DEFAULT 'CEO' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deal_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"deal_id" integer NOT NULL,
	"requested_by" text NOT NULL,
	"requested_stage" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);

CREATE TABLE "deal_meetings" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"deal_id" integer NOT NULL,
	"title" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"attendees" text[],
	"agenda" text,
	"notes" text,
	"action_items" text,
	"recording_link" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"lead_id" integer,
	"client_id" integer,
	"name" text NOT NULL,
	"value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"stage" "deal_stage" DEFAULT 'LEAD' NOT NULL,
	"probability" integer DEFAULT 0 NOT NULL,
	"contact_person" text,
	"contact_email" text,
	"contact_phone" text,
	"assigned_to_id" text,
	"last_contact_date" timestamp,
	"expected_close_date" date,
	"actual_close_date" date,
	"lost_reason" text,
	"notes" text,
	"sla_deadline" timestamp,
	"follow_up_date" timestamp,
	"follow_up_notes" text,
	"custom_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "incentive_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"branch_id" integer,
	"incentive_rate" numeric(5, 2) NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_to" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "incentives" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"branch_id" integer,
	"client_account_id" integer NOT NULL,
	"sales_rep_id" text NOT NULL,
	"investment_amount" numeric(15, 2) NOT NULL,
	"incentive_rate" numeric(5, 2) NOT NULL,
	"calculated_amount" numeric(15, 2) NOT NULL,
	"approved_amount" numeric(15, 2),
	"status" "incentive_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp,
	"payroll_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "sales_quotas" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"period" text DEFAULT 'monthly' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"target_revenue" numeric(15, 2) DEFAULT '0' NOT NULL,
	"actual_revenue" numeric(15, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"set_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "target_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"target_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"changed_by_id" text NOT NULL,
	"field" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "targets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"metric_type" text NOT NULL,
	"target_value" numeric(15, 2) NOT NULL,
	"current_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"period" text DEFAULT 'daily' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"set_by_id" text,
	"branch_id" integer,
	"parent_target_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "task_sequence_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"sequence_id" integer NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'CUSTOM' NOT NULL,
	"notes" text,
	"offset_days" integer DEFAULT 0 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE "task_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"entity_type" "task_entity_type",
	"entity_id" integer,
	"type" "task_type" DEFAULT 'CUSTOM' NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"assignee_id" text,
	"created_by" text,
	"due_date" timestamp with time zone,
	"remind_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"timezone" text,
	"recurrence" jsonb,
	"parent_task_id" integer,
	"is_template" boolean DEFAULT false NOT NULL,
	"template_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "territories" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"states" text[] DEFAULT '{}',
	"cities" text[] DEFAULT '{}',
	"assigned_reps" integer[] DEFAULT '{}',
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"description" text NOT NULL,
	"hsn_sac_code" text,
	"quantity" numeric(18, 4) NOT NULL,
	"rate" numeric(18, 4) NOT NULL,
	"gst_rate" numeric(5, 2) NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"line_order" integer NOT NULL
);

CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"client_id" integer,
	"project_id" integer,
	"invoice_number" text NOT NULL,
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"discount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"due_date" date,
	"notes" text,
	"sent_at" timestamp,
	"paid_at" timestamp,
	"viewed_at" timestamp,
	"terms" text,
	"place_of_supply" text,
	"customer_gstin" text,
	"supplier_gstin" text,
	"reverse_charge" boolean DEFAULT false NOT NULL,
	"tax_inclusive" boolean DEFAULT false NOT NULL,
	"cgst_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"sgst_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"igst_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_interval" text,
	"next_recurring_date" date,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"invoice_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" text NOT NULL,
	"reference_number" text,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "purchase_bill_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" integer NOT NULL,
	"description" text NOT NULL,
	"hsn_sac_code" text,
	"quantity" numeric(18, 4) NOT NULL,
	"rate" numeric(18, 4) NOT NULL,
	"gst_rate" numeric(5, 2) NOT NULL,
	"amount" numeric(18, 4) NOT NULL,
	"line_order" integer NOT NULL
);

CREATE TABLE "purchase_bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"vendor_id" integer,
	"bill_number" text NOT NULL,
	"vendor_bill_number" text,
	"bill_date" date NOT NULL,
	"due_date" date,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"subtotal" numeric(18, 4) DEFAULT '0' NOT NULL,
	"tax_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"cgst_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"sgst_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"igst_amount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"discount" numeric(18, 4) DEFAULT '0' NOT NULL,
	"total" numeric(18, 4) DEFAULT '0' NOT NULL,
	"amount_paid" numeric(18, 4) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"place_of_supply" text,
	"vendor_gstin" text,
	"supplier_gstin" text,
	"reverse_charge" boolean DEFAULT false NOT NULL,
	"notes" text,
	"expense_account_code" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "quote_line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quote_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"deal_id" integer,
	"client_id" integer,
	"quote_number" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"status" "quote_status" DEFAULT 'DRAFT' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"total_amount" numeric(15, 2) NOT NULL,
	"tax_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(15, 2) NOT NULL,
	"valid_until" date NOT NULL,
	"terms_and_conditions" text,
	"created_by_id" text NOT NULL,
	"sent_at" timestamp,
	"accepted_at" timestamp,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "support_ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"author_id" text NOT NULL,
	"body" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"client_id" integer,
	"assignee_id" text,
	"title" text NOT NULL,
	"category" text,
	"description" text,
	"status" "support_ticket_status" DEFAULT 'OPEN' NOT NULL,
	"priority" "support_ticket_priority" DEFAULT 'MEDIUM' NOT NULL,
	"sla_deadline" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "vendor_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"bill_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" date NOT NULL,
	"payment_method" text NOT NULL,
	"reference_number" text,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"type" "crm_activity_type" NOT NULL,
	"message" text NOT NULL,
	"time" text NOT NULL,
	"person" text,
	"person_id" integer,
	"category" text DEFAULT 'sales' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"health" "crm_health" DEFAULT 'healthy' NOT NULL,
	"revenue" numeric(15, 2) DEFAULT '0' NOT NULL,
	"renewal_date" date,
	"renewal_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"customer_since" text,
	"csm_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"company_name" text NOT NULL,
	"value" numeric(15, 2) NOT NULL,
	"stage" "crm_deal_stage" NOT NULL,
	"probability" integer DEFAULT 0 NOT NULL,
	"close_date" date,
	"sales_rep_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_monthly_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"month" text NOT NULL,
	"revenue" numeric(15, 2) DEFAULT '0' NOT NULL,
	"mqls" integer DEFAULT 0 NOT NULL,
	"retention" numeric(5, 2) DEFAULT '0' NOT NULL,
	"csat" numeric(4, 2) DEFAULT '0' NOT NULL,
	"ticket_volume" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_people" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"role" "crm_person_role" NOT NULL,
	"title" text NOT NULL,
	"department" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"location" text,
	"join_date" text,
	"bio" text,
	"skills" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_sla_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"applies_to" "sla_applies_to" NOT NULL,
	"priority" "sla_priority" NOT NULL,
	"first_response_hours" integer NOT NULL,
	"resolution_hours" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_support_team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"access" text NOT NULL,
	"avatar" text NOT NULL,
	"status" text DEFAULT 'online' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text,
	"priority" "crm_support_ticket_priority" DEFAULT 'medium' NOT NULL,
	"status" "crm_support_ticket_status" DEFAULT 'new' NOT NULL,
	"assignee_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);

CREATE TABLE "crm_team_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"person_id" integer NOT NULL,
	"month" text NOT NULL,
	"value" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "crm_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"created_by" text NOT NULL,
	"name" text NOT NULL,
	"entity_type" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb,
	"sort_by" text,
	"sort_dir" text DEFAULT 'asc' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "email_campaign_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"lead_id" integer,
	"email" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"clicked_at" timestamp,
	"error_message" text
);

CREATE TABLE "client_health_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"client_account_id" integer NOT NULL,
	"score" integer NOT NULL,
	"status" "client_health_status" NOT NULL,
	"breakdown" jsonb NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "health_score_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"weights" jsonb NOT NULL,
	"thresholds" jsonb NOT NULL,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "health_score_config_org_id_unique" UNIQUE("org_id")
);

CREATE TABLE "nps_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"survey_id" integer NOT NULL,
	"score" integer NOT NULL,
	"category" "nps_category" NOT NULL,
	"comment" text,
	"respondent_name" text,
	"respondent_email" text,
	"client_account_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "nps_surveys" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"question" text NOT NULL,
	"status" "nps_survey_status" DEFAULT 'draft' NOT NULL,
	"public_token" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nps_surveys_public_token_unique" UNIQUE("public_token")
);

CREATE TABLE "playbook_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text,
	"content" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "chat_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_key" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "chat_channel_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'MEMBER' NOT NULL,
	"last_read_at" timestamp DEFAULT now() NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"muted_until" timestamp
);

CREATE TABLE "chat_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'GROUP' NOT NULL,
	"description" text,
	"avatar_url" text,
	"created_by" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"linked_deal_id" integer,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "chat_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel_id" integer NOT NULL,
	"sender_id" text NOT NULL,
	"content" text,
	"reply_to_id" integer,
	"is_edited" boolean DEFAULT false NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"message_type" "chat_message_type" DEFAULT 'text' NOT NULL,
	"reactions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb,
	"action_status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "chat_user_presence" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"status" text DEFAULT 'OFFLINE' NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "ai_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_usd" numeric(12, 6),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text,
	"target_id" text,
	"target_type" text,
	"metadata" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "calendar_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"color" text,
	"category" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"created_by" text NOT NULL,
	"attendee_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_rule" text,
	"agenda" text,
	"post_meeting_notes" text,
	"linked_deal_id" integer,
	"linked_lead_id" integer,
	"reminder_15min_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "event_attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "event_attendees_event_user_unique" UNIQUE("event_id","user_id")
);

CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"push_enabled" boolean DEFAULT true NOT NULL,
	"sms_enabled" boolean DEFAULT false NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"quiet_hours_start" text,
	"quiet_hours_end" text,
	"categories" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text,
	"type" "notification_type" DEFAULT 'INFO' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"channel" text DEFAULT 'in_app' NOT NULL,
	"sound" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);

CREATE TABLE "subscription_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"subscription_id" integer NOT NULL,
	"razorpay_payment_id" text,
	"razorpay_order_id" text,
	"amount" numeric(15, 2) NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text NOT NULL,
	"paid_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"plan" "subscription_plan" DEFAULT 'STARTER' NOT NULL,
	"status" "subscription_status" DEFAULT 'TRIAL' NOT NULL,
	"razorpay_subscription_id" text,
	"razorpay_customer_id" text,
	"razorpay_plan_id" text,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"trial_ends_at" timestamp,
	"cancelled_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "webhook_endpoints" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"description" text,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"endpoint_id" integer NOT NULL,
	"org_id" text NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb,
	"status_code" integer,
	"response_body" text,
	"attempt" integer DEFAULT 1 NOT NULL,
	"success" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "blog_authors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(320),
	"avatar" text,
	"bio" text,
	"role" varchar(100),
	"twitter" varchar(100),
	"linkedin" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_authors_email_unique" UNIQUE("email")
);

CREATE TABLE "blog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);

CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(256) NOT NULL,
	"slug" varchar(256) NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"content_json" jsonb,
	"cover_image" text NOT NULL,
	"category_id" uuid,
	"author_id" uuid,
	"status" "blog_post_status" DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"reading_time" integer,
	"meta_title" varchar(256),
	"meta_description" varchar(320),
	"published_at" timestamp,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);

CREATE TABLE "platform_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_code" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text,
	"phone" text,
	"topic" text DEFAULT 'sales' NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'NEW' NOT NULL,
	"replied_at" timestamp,
	"replied_by_id" text,
	"reply_body" text,
	"ip_address" text,
	"user_agent" text,
	"referrer_url" text,
	"utm" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_messages_public_code_unique" UNIQUE("public_code")
);

CREATE TABLE "platform_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"razorpay_payment_id" text NOT NULL,
	"razorpay_order_id" text,
	"razorpay_signature" text,
	"org_id" text,
	"customer_email" text,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"status" text NOT NULL,
	"method" text,
	"description" text,
	"invoice_url" text,
	"metadata" jsonb,
	"captured_at" timestamp,
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "platform_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"plan" text NOT NULL,
	"seat_count" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"razorpay_subscription_id" text,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancelled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "platform_visits" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" text NOT NULL,
	"path" text NOT NULL,
	"referrer" text,
	"user_agent" text,
	"country" text,
	"is_first_visit" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "indian_states" (
	"state_code" text PRIMARY KEY NOT NULL,
	"state_name" text NOT NULL,
	"gst_state_code" text NOT NULL
);

CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"entry_number" text NOT NULL,
	"entry_date" date NOT NULL,
	"description" text,
	"source_type" text NOT NULL,
	"source_id" text,
	"source_event" text,
	"status" "journal_entry_status" DEFAULT 'POSTED' NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_je_org_number" UNIQUE("org_id","entry_number"),
	CONSTRAINT "uniq_je_idempotency" UNIQUE("org_id","source_type","source_id","source_event")
);

CREATE TABLE "journal_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit" numeric(18, 4) DEFAULT '0' NOT NULL,
	"credit" numeric(18, 4) DEFAULT '0' NOT NULL,
	"description" text,
	"line_order" integer NOT NULL
);

CREATE TABLE "ledger_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"account_type" "account_type" NOT NULL,
	"parent_account_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_ledger_accounts_org_code" UNIQUE("org_id","code")
);

CREATE TABLE "kb_article_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"article_id" integer NOT NULL,
	"helpful" boolean NOT NULL,
	"comment" text,
	"visitor_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "kb_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"category_id" integer,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text DEFAULT '' NOT NULL,
	"status" "kb_article_status" DEFAULT 'draft' NOT NULL,
	"visibility" "kb_article_visibility" DEFAULT 'internal' NOT NULL,
	"author_id" text,
	"views" integer DEFAULT 0 NOT NULL,
	"helpful_count" integer DEFAULT 0 NOT NULL,
	"not_helpful_count" integer DEFAULT 0 NOT NULL,
	"tags" text[],
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "kb_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "kb_article_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"article_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_key" text NOT NULL,
	"file_url" text,
	"file_size" integer,
	"mime_type" text,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "support_macros" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"category" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "support_routing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assignee_id" text,
	"set_priority" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "kb_article_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"article_id" integer NOT NULL,
	"user_id" text,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "support_ticket_activity" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"support_ticket_id" integer NOT NULL,
	"user_id" text,
	"action" "support_activity_action" NOT NULL,
	"from_value" text,
	"to_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "automation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"trigger_event" "automation_trigger" NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"run_count" integer DEFAULT 0 NOT NULL,
	"last_run_at" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "automation_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"rule_id" integer NOT NULL,
	"trigger_event" text NOT NULL,
	"status" "automation_run_status" NOT NULL,
	"payload" jsonb,
	"result" jsonb,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "mfa_backup_codes" ADD CONSTRAINT "mfa_backup_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "roles" ADD CONSTRAINT "roles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "users" ADD CONSTRAINT "users_reporting_to_users_id_fk" FOREIGN KEY ("reporting_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "custom_states" ADD CONSTRAINT "custom_states_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "custom_states" ADD CONSTRAINT "custom_states_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "module_links" ADD CONSTRAINT "module_links_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "module_links" ADD CONSTRAINT "module_links_linked_module_id_modules_id_fk" FOREIGN KEY ("linked_module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "modules" ADD CONSTRAINT "modules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "modules" ADD CONSTRAINT "modules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "modules" ADD CONSTRAINT "modules_lead_id_users_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "modules" ADD CONSTRAINT "modules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "project_template_tickets" ADD CONSTRAINT "project_template_tickets_template_id_project_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."project_templates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_templates" ADD CONSTRAINT "project_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_templates" ADD CONSTRAINT "project_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "reports" ADD CONSTRAINT "reports_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reports" ADD CONSTRAINT "reports_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_assignees" ADD CONSTRAINT "ticket_assignees_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_assignees" ADD CONSTRAINT "ticket_assignees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_assignees" ADD CONSTRAINT "ticket_assignees_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_parent_comment_id_ticket_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."ticket_comments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_label_mappings" ADD CONSTRAINT "ticket_label_mappings_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_label_mappings" ADD CONSTRAINT "ticket_label_mappings_label_id_ticket_labels_id_fk" FOREIGN KEY ("label_id") REFERENCES "public"."ticket_labels"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_labels" ADD CONSTRAINT "ticket_labels_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_watchers" ADD CONSTRAINT "ticket_watchers_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_watchers" ADD CONSTRAINT "ticket_watchers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_state_id_custom_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."custom_states"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_cycle_id_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycles"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_epic_id_tickets_id_fk" FOREIGN KEY ("epic_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_parent_ticket_id_tickets_id_fk" FOREIGN KEY ("parent_ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "work_item_relations" ADD CONSTRAINT "work_item_relations_work_item_id_tickets_id_fk" FOREIGN KEY ("work_item_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "work_item_relations" ADD CONSTRAINT "work_item_relations_related_work_item_id_tickets_id_fk" FOREIGN KEY ("related_work_item_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "intake_items" ADD CONSTRAINT "intake_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "intake_items" ADD CONSTRAINT "intake_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "intake_items" ADD CONSTRAINT "intake_items_linked_work_item_id_tickets_id_fk" FOREIGN KEY ("linked_work_item_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "pages" ADD CONSTRAINT "pages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "pages" ADD CONSTRAINT "pages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "pages" ADD CONSTRAINT "pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_page_id_pages_id_fk" FOREIGN KEY ("parent_page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "project_statuses" ADD CONSTRAINT "project_statuses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_statuses" ADD CONSTRAINT "project_statuses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_views" ADD CONSTRAINT "project_views_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "project_daily_snapshots" ADD CONSTRAINT "project_daily_snapshots_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_daily_snapshots" ADD CONSTRAINT "project_daily_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "okr_goals" ADD CONSTRAINT "okr_goals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "okr_goals" ADD CONSTRAINT "okr_goals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "okr_goals" ADD CONSTRAINT "okr_goals_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "okr_goals" ADD CONSTRAINT "okr_goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "okr_goals" ADD CONSTRAINT "okr_goals_parent_goal_id_okr_goals_id_fk" FOREIGN KEY ("parent_goal_id") REFERENCES "public"."okr_goals"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "okr_key_results" ADD CONSTRAINT "okr_key_results_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "okr_key_results" ADD CONSTRAINT "okr_key_results_goal_id_okr_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."okr_goals"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "okr_links" ADD CONSTRAINT "okr_links_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "okr_links" ADD CONSTRAINT "okr_links_goal_id_okr_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."okr_goals"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "okr_links" ADD CONSTRAINT "okr_links_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "okr_links" ADD CONSTRAINT "okr_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "okr_updates" ADD CONSTRAINT "okr_updates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "okr_updates" ADD CONSTRAINT "okr_updates_goal_id_okr_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."okr_goals"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "okr_updates" ADD CONSTRAINT "okr_updates_key_result_id_okr_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "public"."okr_key_results"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "okr_updates" ADD CONSTRAINT "okr_updates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_linked_roadmap_item_id_roadmap_items_id_fk" FOREIGN KEY ("linked_roadmap_item_id") REFERENCES "public"."roadmap_items"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "feedback_posts" ADD CONSTRAINT "feedback_posts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "feedback_posts" ADD CONSTRAINT "feedback_posts_linked_roadmap_item_id_roadmap_items_id_fk" FOREIGN KEY ("linked_roadmap_item_id") REFERENCES "public"."roadmap_items"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "feedback_votes" ADD CONSTRAINT "feedback_votes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "feedback_votes" ADD CONSTRAINT "feedback_votes_feedback_post_id_feedback_posts_id_fk" FOREIGN KEY ("feedback_post_id") REFERENCES "public"."feedback_posts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_epic_ticket_id_tickets_id_fk" FOREIGN KEY ("epic_ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "roadmap_votes" ADD CONSTRAINT "roadmap_votes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "roadmap_votes" ADD CONSTRAINT "roadmap_votes_roadmap_item_id_roadmap_items_id_fk" FOREIGN KEY ("roadmap_item_id") REFERENCES "public"."roadmap_items"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_whiteboards" ADD CONSTRAINT "project_whiteboards_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_whiteboards" ADD CONSTRAINT "project_whiteboards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "git_connections" ADD CONSTRAINT "git_connections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "git_connections" ADD CONSTRAINT "git_connections_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "git_ticket_links" ADD CONSTRAINT "git_ticket_links_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "git_ticket_links" ADD CONSTRAINT "git_ticket_links_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "git_ticket_links" ADD CONSTRAINT "git_ticket_links_connection_id_git_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."git_connections"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ticket_activity_log" ADD CONSTRAINT "ticket_activity_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_activity_log" ADD CONSTRAINT "ticket_activity_log_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_activity_log" ADD CONSTRAINT "ticket_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ticket_comment_mentions" ADD CONSTRAINT "ticket_comment_mentions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_comment_mentions" ADD CONSTRAINT "ticket_comment_mentions_comment_id_ticket_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."ticket_comments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ticket_comment_mentions" ADD CONSTRAINT "ticket_comment_mentions_mentioned_user_id_users_id_fk" FOREIGN KEY ("mentioned_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "department_members" ADD CONSTRAINT "department_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "departments" ADD CONSTRAINT "departments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "employee_devices" ADD CONSTRAINT "employee_devices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "employee_devices" ADD CONSTRAINT "employee_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "wfh_requests" ADD CONSTRAINT "wfh_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "wfh_requests" ADD CONSTRAINT "wfh_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "wfh_requests" ADD CONSTRAINT "wfh_requests_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "leave_blackout_dates" ADD CONSTRAINT "leave_blackout_dates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "leave_blackout_dates" ADD CONSTRAINT "leave_blackout_dates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_type_id_leave_types_id_fk" FOREIGN KEY ("leave_type_id") REFERENCES "public"."leave_types"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_covering_employee_id_users_id_fk" FOREIGN KEY ("covering_employee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assets" ADD CONSTRAINT "assets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assets" ADD CONSTRAINT "assets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "asset_returns" ADD CONSTRAINT "asset_returns_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bonuses" ADD CONSTRAINT "bonuses_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_expense_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "fnf_settlements" ADD CONSTRAINT "fnf_settlements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "fnf_settlements" ADD CONSTRAINT "fnf_settlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "fnf_settlements" ADD CONSTRAINT "fnf_settlements_resignation_id_resignations_id_fk" FOREIGN KEY ("resignation_id") REFERENCES "public"."resignations"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "fnf_settlements" ADD CONSTRAINT "fnf_settlements_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "salary_loans" ADD CONSTRAINT "salary_loans_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "salary_loans" ADD CONSTRAINT "salary_loans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "salary_loans" ADD CONSTRAINT "salary_loans_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_job_posting_id_job_postings_id_fk" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_applications" ADD CONSTRAINT "candidate_applications_job_posting_id_job_postings_id_fk" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_documents_vault" ADD CONSTRAINT "candidate_documents_vault_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_documents_vault" ADD CONSTRAINT "candidate_documents_vault_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_documents_vault" ADD CONSTRAINT "candidate_documents_vault_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_job_posting_id_job_postings_id_fk" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidate_offers" ADD CONSTRAINT "candidate_offers_offered_by_users_id_fk" FOREIGN KEY ("offered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidate_reference_checks" ADD CONSTRAINT "candidate_reference_checks_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_reference_checks" ADD CONSTRAINT "candidate_reference_checks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_reference_checks" ADD CONSTRAINT "candidate_reference_checks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidate_referrals" ADD CONSTRAINT "candidate_referrals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_referrals" ADD CONSTRAINT "candidate_referrals_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_referrals" ADD CONSTRAINT "candidate_referrals_referred_by_users_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidate_sla_tracking" ADD CONSTRAINT "candidate_sla_tracking_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_sla_tracking" ADD CONSTRAINT "candidate_sla_tracking_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_sources" ADD CONSTRAINT "candidate_sources_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_sources" ADD CONSTRAINT "candidate_sources_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_referred_by_users_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_duplicate_of_id_candidates_id_fk" FOREIGN KEY ("duplicate_of_id") REFERENCES "public"."candidates"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "interview_booking_links" ADD CONSTRAINT "interview_booking_links_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interview_booking_links" ADD CONSTRAINT "interview_booking_links_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interview_booking_links" ADD CONSTRAINT "interview_booking_links_job_posting_id_job_postings_id_fk" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "interview_booking_links" ADD CONSTRAINT "interview_booking_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interview_questions" ADD CONSTRAINT "interview_questions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "interview_scorecards" ADD CONSTRAINT "interview_scorecards_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interview_scorecards" ADD CONSTRAINT "interview_scorecards_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "interview_scorecards" ADD CONSTRAINT "interview_scorecards_template_id_scorecard_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."scorecard_templates"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "interview_slas" ADD CONSTRAINT "interview_slas_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_job_posting_id_job_postings_id_fk" FOREIGN KEY ("job_posting_id") REFERENCES "public"."job_postings"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_id_users_id_fk" FOREIGN KEY ("interviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_posted_by_users_id_fk" FOREIGN KEY ("posted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "scorecard_templates" ADD CONSTRAINT "scorecard_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "scorecard_templates" ADD CONSTRAINT "scorecard_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "vault_access_logs" ADD CONSTRAINT "vault_access_logs_vault_document_id_candidate_documents_vault_id_fk" FOREIGN KEY ("vault_document_id") REFERENCES "public"."candidate_documents_vault"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vault_access_logs" ADD CONSTRAINT "vault_access_logs_accessed_by_users_id_fk" FOREIGN KEY ("accessed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "alumni_profiles" ADD CONSTRAINT "alumni_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "background_verifications" ADD CONSTRAINT "background_verifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "background_verifications" ADD CONSTRAINT "background_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "candidate_documents" ADD CONSTRAINT "candidate_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "document_audit_logs" ADD CONSTRAINT "document_audit_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "document_audit_logs" ADD CONSTRAINT "document_audit_logs_onboarding_document_id_onboarding_documents_id_fk" FOREIGN KEY ("onboarding_document_id") REFERENCES "public"."onboarding_documents"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "document_audit_logs" ADD CONSTRAINT "document_audit_logs_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "document_template_versions" ADD CONSTRAINT "document_template_versions_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "document_template_versions" ADD CONSTRAINT "document_template_versions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "document_template_versions" ADD CONSTRAINT "document_template_versions_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "exit_checklists" ADD CONSTRAINT "exit_checklists_resignation_id_resignations_id_fk" FOREIGN KEY ("resignation_id") REFERENCES "public"."resignations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "exit_checklists" ADD CONSTRAINT "exit_checklists_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "onboarding_documents" ADD CONSTRAINT "onboarding_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "onboarding_documents" ADD CONSTRAINT "onboarding_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "onboarding_documents" ADD CONSTRAINT "onboarding_documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "onboarding_documents" ADD CONSTRAINT "onboarding_documents_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_template_step_id_onboarding_template_steps_id_fk" FOREIGN KEY ("template_step_id") REFERENCES "public"."onboarding_template_steps"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "onboarding_template_steps" ADD CONSTRAINT "onboarding_template_steps_template_id_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."onboarding_templates"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "onboarding_templates" ADD CONSTRAINT "onboarding_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_hr_reviewed_by_users_id_fk" FOREIGN KEY ("hr_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_ceo_reviewed_by_users_id_fk" FOREIGN KEY ("ceo_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "resignations" ADD CONSTRAINT "resignations_exit_interview_conducted_by_users_id_fk" FOREIGN KEY ("exit_interview_conducted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "terminations" ADD CONSTRAINT "terminations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "terminations" ADD CONSTRAINT "terminations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "terminations" ADD CONSTRAINT "terminations_initiated_by_users_id_fk" FOREIGN KEY ("initiated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "terminations" ADD CONSTRAINT "terminations_ceo_reviewed_by_users_id_fk" FOREIGN KEY ("ceo_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_skill_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."skill_assessments"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "enps_scores" ADD CONSTRAINT "enps_scores_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "enps_scores" ADD CONSTRAINT "enps_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "feedback_requests" ADD CONSTRAINT "feedback_requests_cycle_id_review_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."review_cycles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "goals" ADD CONSTRAINT "goals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_goal_id_goals_id_fk" FOREIGN KEY ("parent_goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "one_on_one_meetings" ADD CONSTRAINT "one_on_one_meetings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "one_on_one_meetings" ADD CONSTRAINT "one_on_one_meetings_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "one_on_one_meetings" ADD CONSTRAINT "one_on_one_meetings_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "performance_improvement_plans" ADD CONSTRAINT "performance_improvement_plans_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "performance_improvement_plans" ADD CONSTRAINT "performance_improvement_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "performance_improvement_plans" ADD CONSTRAINT "performance_improvement_plans_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "performance_improvement_plans" ADD CONSTRAINT "performance_improvement_plans_hr_rep_id_users_id_fk" FOREIGN KEY ("hr_rep_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_cycle_id_review_cycles_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."review_cycles"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "pulse_surveys" ADD CONSTRAINT "pulse_surveys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "pulse_surveys" ADD CONSTRAINT "pulse_surveys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "recognitions" ADD CONSTRAINT "recognitions_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_pulse_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."pulse_surveys"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "career_ladders" ADD CONSTRAINT "career_ladders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_parent_document_id_documents_id_fk" FOREIGN KEY ("parent_document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "hr_email_templates" ADD CONSTRAINT "hr_email_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "hr_email_templates" ADD CONSTRAINT "hr_email_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "handbook_versions" ADD CONSTRAINT "handbook_versions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "handbook_versions" ADD CONSTRAINT "handbook_versions_document_id_rich_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."rich_documents"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "handbook_versions" ADD CONSTRAINT "handbook_versions_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "policy_acknowledgments" ADD CONSTRAINT "policy_acknowledgments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "rich_documents" ADD CONSTRAINT "rich_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rich_documents" ADD CONSTRAINT "rich_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "rich_documents" ADD CONSTRAINT "rich_documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_event_participants" ADD CONSTRAINT "team_event_participants_event_id_team_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."team_events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_event_participants" ADD CONSTRAINT "team_event_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "team_events" ADD CONSTRAINT "team_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "team_events" ADD CONSTRAINT "team_events_organized_by_users_id_fk" FOREIGN KEY ("organized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_campaigns" ADD CONSTRAINT "crm_campaigns_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "crm_content" ADD CONSTRAINT "crm_content_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_events" ADD CONSTRAINT "crm_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_campaign_id_crm_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crm_campaigns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "email_campaigns" ADD CONSTRAINT "email_campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "assignment_rule_state" ADD CONSTRAINT "assignment_rule_state_rule_id_lead_assignment_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."lead_assignment_rules"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "lead_assignment_rules" ADD CONSTRAINT "lead_assignment_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_assignment_rules" ADD CONSTRAINT "lead_assignment_rules_assign_to_user_id_users_id_fk" FOREIGN KEY ("assign_to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "lead_emails" ADD CONSTRAINT "lead_emails_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_emails" ADD CONSTRAINT "lead_emails_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_import_batches" ADD CONSTRAINT "lead_import_batches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_import_batches" ADD CONSTRAINT "lead_import_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "lead_scoring_rules" ADD CONSTRAINT "lead_scoring_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_tasks" ADD CONSTRAINT "lead_tasks_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_tasks" ADD CONSTRAINT "lead_tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "lead_tasks" ADD CONSTRAINT "lead_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "leads" ADD CONSTRAINT "leads_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_crm_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."crm_campaigns"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "leads" ADD CONSTRAINT "leads_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "leads" ADD CONSTRAINT "leads_merged_into_id_leads_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "web_lead_forms" ADD CONSTRAINT "web_lead_forms_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "web_lead_forms" ADD CONSTRAINT "web_lead_forms_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "branches" ADD CONSTRAINT "branches_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "branches" ADD CONSTRAINT "branches_branch_manager_id_users_id_fk" FOREIGN KEY ("branch_manager_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "branches" ADD CONSTRAINT "branches_branch_hr_id_users_id_fk" FOREIGN KEY ("branch_hr_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_account_activities" ADD CONSTRAINT "client_account_activities_client_account_id_client_accounts_id_fk" FOREIGN KEY ("client_account_id") REFERENCES "public"."client_accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "client_account_activities" ADD CONSTRAINT "client_account_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_sales_rep_id_users_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_accounts" ADD CONSTRAINT "client_accounts_assigned_crm_id_users_id_fk" FOREIGN KEY ("assigned_crm_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_onboarding_items" ADD CONSTRAINT "client_onboarding_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "client_onboarding_items" ADD CONSTRAINT "client_onboarding_items_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "client_onboarding_items" ADD CONSTRAINT "client_onboarding_items_template_id_client_onboarding_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."client_onboarding_templates"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_onboarding_items" ADD CONSTRAINT "client_onboarding_items_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_onboarding_items" ADD CONSTRAINT "client_onboarding_items_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_onboarding_templates" ADD CONSTRAINT "client_onboarding_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "client_onboarding_templates" ADD CONSTRAINT "client_onboarding_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_opportunities" ADD CONSTRAINT "client_opportunities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "client_opportunities" ADD CONSTRAINT "client_opportunities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "client_opportunities" ADD CONSTRAINT "client_opportunities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "clients" ADD CONSTRAINT "clients_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "clients" ADD CONSTRAINT "clients_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "clients" ADD CONSTRAINT "clients_account_manager_id_users_id_fk" FOREIGN KEY ("account_manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_crm_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."crm_organizations"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "crm_organizations" ADD CONSTRAINT "crm_organizations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_organizations" ADD CONSTRAINT "crm_organizations_parent_id_crm_organizations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."crm_organizations"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "csat_responses" ADD CONSTRAINT "csat_responses_survey_id_csat_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."csat_surveys"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "csat_responses" ADD CONSTRAINT "csat_responses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "csat_surveys" ADD CONSTRAINT "csat_surveys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "csat_surveys" ADD CONSTRAINT "csat_surveys_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "csat_surveys" ADD CONSTRAINT "csat_surveys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_rule_id_commission_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."commission_rules"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "custom_field_definitions" ADD CONSTRAINT "custom_field_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "deal_activities" ADD CONSTRAINT "deal_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "deal_approval_rules" ADD CONSTRAINT "deal_approval_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "deal_approvals" ADD CONSTRAINT "deal_approvals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "deal_approvals" ADD CONSTRAINT "deal_approvals_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "deal_approvals" ADD CONSTRAINT "deal_approvals_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "deal_approvals" ADD CONSTRAINT "deal_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "deal_meetings" ADD CONSTRAINT "deal_meetings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "deal_meetings" ADD CONSTRAINT "deal_meetings_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "deal_meetings" ADD CONSTRAINT "deal_meetings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "deals" ADD CONSTRAINT "deals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "deals" ADD CONSTRAINT "deals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "deals" ADD CONSTRAINT "deals_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "incentive_config" ADD CONSTRAINT "incentive_config_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "incentive_config" ADD CONSTRAINT "incentive_config_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incentive_config" ADD CONSTRAINT "incentive_config_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incentives" ADD CONSTRAINT "incentives_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "incentives" ADD CONSTRAINT "incentives_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incentives" ADD CONSTRAINT "incentives_client_account_id_client_accounts_id_fk" FOREIGN KEY ("client_account_id") REFERENCES "public"."client_accounts"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incentives" ADD CONSTRAINT "incentives_sales_rep_id_users_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incentives" ADD CONSTRAINT "incentives_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "incentives" ADD CONSTRAINT "incentives_payroll_id_payrolls_id_fk" FOREIGN KEY ("payroll_id") REFERENCES "public"."payrolls"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "sales_quotas" ADD CONSTRAINT "sales_quotas_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sales_quotas" ADD CONSTRAINT "sales_quotas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sales_quotas" ADD CONSTRAINT "sales_quotas_set_by_id_users_id_fk" FOREIGN KEY ("set_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "target_history" ADD CONSTRAINT "target_history_target_id_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."targets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "target_history" ADD CONSTRAINT "target_history_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "target_history" ADD CONSTRAINT "target_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "targets" ADD CONSTRAINT "targets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "targets" ADD CONSTRAINT "targets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "targets" ADD CONSTRAINT "targets_set_by_id_users_id_fk" FOREIGN KEY ("set_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "targets" ADD CONSTRAINT "targets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "targets" ADD CONSTRAINT "targets_parent_target_id_targets_id_fk" FOREIGN KEY ("parent_target_id") REFERENCES "public"."targets"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "task_sequence_steps" ADD CONSTRAINT "task_sequence_steps_sequence_id_task_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."task_sequences"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "task_sequences" ADD CONSTRAINT "task_sequences_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "task_sequences" ADD CONSTRAINT "task_sequences_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_tasks_id_fk" FOREIGN KEY ("parent_task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "territories" ADD CONSTRAINT "territories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "territories" ADD CONSTRAINT "territories_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "purchase_bill_items" ADD CONSTRAINT "purchase_bill_items_bill_id_purchase_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."purchase_bills"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_vendor_id_clients_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "quote_line_items" ADD CONSTRAINT "quote_line_items_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_client_accounts_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_bill_id_purchase_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."purchase_bills"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "vendor_payments" ADD CONSTRAINT "vendor_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_person_id_crm_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."crm_people"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_companies" ADD CONSTRAINT "crm_companies_csm_id_crm_people_id_fk" FOREIGN KEY ("csm_id") REFERENCES "public"."crm_people"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_sales_rep_id_crm_people_id_fk" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."crm_people"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "crm_email_templates" ADD CONSTRAINT "crm_email_templates_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_email_templates" ADD CONSTRAINT "crm_email_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "crm_monthly_metrics" ADD CONSTRAINT "crm_monthly_metrics_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_people" ADD CONSTRAINT "crm_people_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_sla_policies" ADD CONSTRAINT "crm_sla_policies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_support_team_members" ADD CONSTRAINT "crm_support_team_members_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_support_tickets" ADD CONSTRAINT "crm_support_tickets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_support_tickets" ADD CONSTRAINT "crm_support_tickets_assignee_id_crm_people_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."crm_people"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "crm_team_performance" ADD CONSTRAINT "crm_team_performance_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_team_performance" ADD CONSTRAINT "crm_team_performance_person_id_crm_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."crm_people"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_views" ADD CONSTRAINT "crm_views_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "crm_views" ADD CONSTRAINT "crm_views_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "client_health_scores" ADD CONSTRAINT "client_health_scores_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "client_health_scores" ADD CONSTRAINT "client_health_scores_client_account_id_client_accounts_id_fk" FOREIGN KEY ("client_account_id") REFERENCES "public"."client_accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "health_score_config" ADD CONSTRAINT "health_score_config_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_survey_id_nps_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."nps_surveys"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_client_account_id_client_accounts_id_fk" FOREIGN KEY ("client_account_id") REFERENCES "public"."client_accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "nps_surveys" ADD CONSTRAINT "nps_surveys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "nps_surveys" ADD CONSTRAINT "nps_surveys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "playbook_entries" ADD CONSTRAINT "playbook_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "playbook_entries" ADD CONSTRAINT "playbook_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "chat_attachments" ADD CONSTRAINT "chat_attachments_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_channel_members" ADD CONSTRAINT "chat_channel_members_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_channel_members" ADD CONSTRAINT "chat_channel_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "chat_channels" ADD CONSTRAINT "chat_channels_linked_deal_id_deals_id_fk" FOREIGN KEY ("linked_deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_channel_id_chat_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."chat_channels"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_to_id_chat_messages_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."chat_messages"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "chat_user_presence" ADD CONSTRAINT "chat_user_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "chat_user_presence" ADD CONSTRAINT "chat_user_presence_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_blog_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."blog_authors"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "platform_messages" ADD CONSTRAINT "platform_messages_replied_by_id_users_id_fk" FOREIGN KEY ("replied_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "platform_subscriptions" ADD CONSTRAINT "platform_subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_ledger_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_parent_account_id_ledger_accounts_id_fk" FOREIGN KEY ("parent_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "kb_article_feedback" ADD CONSTRAINT "kb_article_feedback_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "kb_article_feedback" ADD CONSTRAINT "kb_article_feedback_article_id_kb_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."kb_articles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "kb_articles" ADD CONSTRAINT "kb_articles_category_id_kb_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."kb_categories"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "kb_categories" ADD CONSTRAINT "kb_categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "kb_article_attachments" ADD CONSTRAINT "kb_article_attachments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "kb_article_attachments" ADD CONSTRAINT "kb_article_attachments_article_id_kb_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."kb_articles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "support_macros" ADD CONSTRAINT "support_macros_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "support_routing_rules" ADD CONSTRAINT "support_routing_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "kb_article_comments" ADD CONSTRAINT "kb_article_comments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "kb_article_comments" ADD CONSTRAINT "kb_article_comments_article_id_kb_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."kb_articles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "support_ticket_activity" ADD CONSTRAINT "support_ticket_activity_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "support_ticket_activity" ADD CONSTRAINT "support_ticket_activity_support_ticket_id_support_tickets_id_fk" FOREIGN KEY ("support_ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_rule_id_automation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."automation_rules"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "idx_api_keys_org_active" ON "api_keys" USING btree ("org_id","is_revoked");
CREATE UNIQUE INDEX "idx_api_keys_key_prefix" ON "api_keys" USING btree ("key_prefix");
CREATE INDEX "idx_invitations_org_email" ON "invitations" USING btree ("org_id","email");
CREATE INDEX "idx_invitations_expires" ON "invitations" USING btree ("expires_at");
CREATE INDEX "idx_mfa_backup_codes_user" ON "mfa_backup_codes" USING btree ("user_id");
CREATE INDEX "idx_onboarding_steps_user" ON "onboarding_steps" USING btree ("user_id");
CREATE INDEX "idx_onboarding_steps_org_status" ON "onboarding_steps" USING btree ("org_id","status");
CREATE UNIQUE INDEX "uniq_org_members_user_org" ON "organization_members" USING btree ("user_id","org_id");
CREATE INDEX "idx_org_members_org_role" ON "organization_members" USING btree ("org_id","role");
CREATE INDEX "idx_org_members_owner" ON "organization_members" USING btree ("org_id","is_owner");
CREATE INDEX "idx_password_history_user" ON "password_history" USING btree ("user_id","created_at");
CREATE INDEX "idx_password_reset_email" ON "password_reset_tokens" USING btree ("email");
CREATE INDEX "idx_password_reset_expires" ON "password_reset_tokens" USING btree ("expires_at");
CREATE UNIQUE INDEX "uniq_role_permissions_role_perm_org" ON "role_permissions" USING btree ("role","permission_id","org_id");
CREATE INDEX "idx_role_permissions_org" ON "role_permissions" USING btree ("org_id");
CREATE INDEX "idx_role_permissions_role" ON "role_permissions" USING btree ("role");
CREATE INDEX "idx_role_permissions_org_role" ON "role_permissions" USING btree ("org_id","role");
CREATE UNIQUE INDEX "uniq_role_slug_org" ON "roles" USING btree ("slug","org_id");
CREATE UNIQUE INDEX "uniq_user_permissions_user_perm_org" ON "user_permissions" USING btree ("user_id","permission_id","org_id");
CREATE INDEX "idx_user_permissions_org" ON "user_permissions" USING btree ("org_id");
CREATE INDEX "idx_user_permissions_user_org" ON "user_permissions" USING btree ("user_id","org_id");
CREATE INDEX "idx_user_sessions_user_active" ON "user_sessions" USING btree ("user_id","is_revoked","created_at");
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");
CREATE INDEX "idx_custom_states_project" ON "custom_states" USING btree ("project_id");
CREATE INDEX "idx_custom_states_org" ON "custom_states" USING btree ("org_id");
CREATE INDEX "idx_cycles_project" ON "cycles" USING btree ("project_id");
CREATE INDEX "idx_cycles_org_status" ON "cycles" USING btree ("org_id","status");
CREATE UNIQUE INDEX "uniq_module_links" ON "module_links" USING btree ("module_id","linked_module_id");
CREATE INDEX "idx_modules_project" ON "modules" USING btree ("project_id");
CREATE INDEX "idx_modules_org" ON "modules" USING btree ("org_id");
CREATE INDEX "idx_project_template_tickets_template" ON "project_template_tickets" USING btree ("template_id");
CREATE INDEX "idx_project_templates_org" ON "project_templates" USING btree ("org_id");
CREATE INDEX "idx_projects_org_status" ON "projects" USING btree ("org_id","status");
CREATE INDEX "idx_projects_manager" ON "projects" USING btree ("manager_id");
CREATE INDEX "idx_projects_deal" ON "projects" USING btree ("deal_id");
CREATE INDEX "idx_reports_org_type" ON "reports" USING btree ("org_id","type");
CREATE INDEX "idx_sprints_project_status" ON "sprints" USING btree ("project_id","status");
CREATE UNIQUE INDEX "uniq_ticket_assignees_ticket_user" ON "ticket_assignees" USING btree ("ticket_id","user_id");
CREATE INDEX "idx_ticket_assignees_user_id" ON "ticket_assignees" USING btree ("user_id");
CREATE INDEX "idx_ticket_attachments_ticket" ON "ticket_attachments" USING btree ("ticket_id");
CREATE INDEX "idx_ticket_comments_ticket" ON "ticket_comments" USING btree ("ticket_id");
CREATE UNIQUE INDEX "uniq_ticket_label_mappings_ticket_label" ON "ticket_label_mappings" USING btree ("ticket_id","label_id");
CREATE UNIQUE INDEX "uniq_ticket_labels_org_name" ON "ticket_labels" USING btree ("org_id","name");
CREATE UNIQUE INDEX "uniq_ticket_watcher" ON "ticket_watchers" USING btree ("ticket_id","user_id");
CREATE INDEX "idx_ticket_watchers_user" ON "ticket_watchers" USING btree ("user_id");
CREATE UNIQUE INDEX "uniq_tickets_project_number" ON "tickets" USING btree ("project_id","ticket_number");
CREATE INDEX "idx_tickets_project_status" ON "tickets" USING btree ("project_id","status");
CREATE INDEX "idx_tickets_assignee" ON "tickets" USING btree ("assignee_id");
CREATE INDEX "idx_tickets_sprint" ON "tickets" USING btree ("sprint_id");
CREATE INDEX "idx_tickets_org_status_priority" ON "tickets" USING btree ("org_id","status","priority");
CREATE INDEX "idx_timesheets_user_date" ON "timesheets" USING btree ("user_id","date");
CREATE INDEX "idx_timesheets_org_status" ON "timesheets" USING btree ("org_id","status");
CREATE UNIQUE INDEX "uniq_timesheets_work_log" ON "timesheets" USING btree ("org_id","user_id","date") WHERE ticket_id IS NULL;
CREATE UNIQUE INDEX "uniq_work_item_relation" ON "work_item_relations" USING btree ("work_item_id","related_work_item_id");
CREATE INDEX "idx_work_item_relations_item" ON "work_item_relations" USING btree ("work_item_id");
CREATE INDEX "idx_work_item_relations_related" ON "work_item_relations" USING btree ("related_work_item_id");
CREATE INDEX "idx_intake_items_project" ON "intake_items" USING btree ("project_id");
CREATE INDEX "idx_intake_items_org_status" ON "intake_items" USING btree ("org_id","status");
CREATE INDEX "idx_pages_project" ON "pages" USING btree ("project_id");
CREATE INDEX "idx_pages_org" ON "pages" USING btree ("org_id");
CREATE INDEX "idx_pages_parent" ON "pages" USING btree ("parent_page_id");
CREATE UNIQUE INDEX "uniq_project_members_project_user" ON "project_members" USING btree ("project_id","user_id");
CREATE INDEX "idx_project_members_user" ON "project_members" USING btree ("user_id");
CREATE INDEX "idx_project_milestones_project" ON "project_milestones" USING btree ("project_id");
CREATE INDEX "idx_project_milestones_org" ON "project_milestones" USING btree ("org_id");
CREATE INDEX "idx_project_statuses_project" ON "project_statuses" USING btree ("project_id");
CREATE INDEX "idx_project_views_project" ON "project_views" USING btree ("project_id");
CREATE INDEX "idx_project_views_org" ON "project_views" USING btree ("org_id");
CREATE UNIQUE INDEX "uniq_project_daily_snapshots_project_date_group" ON "project_daily_snapshots" USING btree ("project_id","snapshot_date","state_group");
CREATE INDEX "idx_project_daily_snapshots_org_project" ON "project_daily_snapshots" USING btree ("org_id","project_id");
CREATE INDEX "idx_okr_goals_org" ON "okr_goals" USING btree ("org_id");
CREATE INDEX "idx_okr_goals_org_status" ON "okr_goals" USING btree ("org_id","status");
CREATE INDEX "idx_okr_goals_parent" ON "okr_goals" USING btree ("parent_goal_id");
CREATE INDEX "idx_okr_key_results_goal" ON "okr_key_results" USING btree ("goal_id");
CREATE UNIQUE INDEX "uniq_okr_links_goal_ticket" ON "okr_links" USING btree ("goal_id","ticket_id");
CREATE INDEX "idx_okr_links_goal" ON "okr_links" USING btree ("goal_id");
CREATE INDEX "idx_okr_updates_goal" ON "okr_updates" USING btree ("goal_id");
CREATE INDEX "idx_changelog_entries_org_published" ON "changelog_entries" USING btree ("org_id","is_published");
CREATE INDEX "idx_feedback_posts_org_status" ON "feedback_posts" USING btree ("org_id","status");
CREATE UNIQUE INDEX "uniq_feedback_votes_post_voter" ON "feedback_votes" USING btree ("feedback_post_id","voter_key");
CREATE INDEX "idx_roadmap_items_org_status" ON "roadmap_items" USING btree ("org_id","status");
CREATE UNIQUE INDEX "uniq_roadmap_votes_item_voter" ON "roadmap_votes" USING btree ("roadmap_item_id","voter_key");
CREATE INDEX "idx_project_whiteboards_org_project" ON "project_whiteboards" USING btree ("org_id","project_id");
CREATE INDEX "idx_git_connections_org" ON "git_connections" USING btree ("org_id");
CREATE INDEX "idx_git_ticket_links_ticket" ON "git_ticket_links" USING btree ("ticket_id");
CREATE UNIQUE INDEX "uniq_git_ticket_links_ref" ON "git_ticket_links" USING btree ("ticket_id","ref_type","external_id");
CREATE INDEX "idx_ticket_activity_log_ticket" ON "ticket_activity_log" USING btree ("ticket_id");
CREATE INDEX "idx_ticket_comment_mentions_comment" ON "ticket_comment_mentions" USING btree ("comment_id");
CREATE UNIQUE INDEX "uniq_ticket_comment_mentions_comment_user" ON "ticket_comment_mentions" USING btree ("comment_id","mentioned_user_id");
CREATE UNIQUE INDEX "uniq_dept_members_dept_user" ON "department_members" USING btree ("department_id","user_id");
CREATE UNIQUE INDEX "uniq_departments_org_name" ON "departments" USING btree ("org_id","name");
CREATE UNIQUE INDEX "uniq_attendance_user_date" ON "attendance" USING btree ("user_id","date");
CREATE INDEX "idx_attendance_org_date_status" ON "attendance" USING btree ("org_id","date","status");
CREATE UNIQUE INDEX "uniq_leave_balances_user_type_year" ON "leave_balances" USING btree ("user_id","leave_type_id","year");
CREATE INDEX "idx_leave_balances_org_year" ON "leave_balances" USING btree ("org_id","year");
CREATE INDEX "idx_leave_blackout_org" ON "leave_blackout_dates" USING btree ("org_id","start_date");
CREATE INDEX "idx_leave_requests_user_id" ON "leave_requests" USING btree ("user_id");
CREATE INDEX "idx_leave_requests_org_status" ON "leave_requests" USING btree ("org_id","status");
CREATE INDEX "idx_leave_requests_dates" ON "leave_requests" USING btree ("start_date","end_date");
CREATE INDEX "idx_leave_requests_org_user_status" ON "leave_requests" USING btree ("org_id","user_id","status");
CREATE UNIQUE INDEX "uniq_leave_types_org_name" ON "leave_types" USING btree ("org_id","name");
CREATE INDEX "idx_assets_org_status" ON "assets" USING btree ("org_id","status");
CREATE INDEX "idx_assets_assigned" ON "assets" USING btree ("assigned_to");
CREATE INDEX "idx_asset_returns_user" ON "asset_returns" USING btree ("user_id");
CREATE INDEX "idx_bonuses_user" ON "bonuses" USING btree ("user_id");
CREATE UNIQUE INDEX "uniq_expense_categories_org_name" ON "expense_categories" USING btree ("org_id","name");
CREATE INDEX "idx_expenses_user_id" ON "expenses" USING btree ("user_id");
CREATE INDEX "idx_expenses_org_status_date" ON "expenses" USING btree ("org_id","status","expense_date");
CREATE INDEX "idx_expenses_category" ON "expenses" USING btree ("category_id");
CREATE INDEX "idx_fnf_user" ON "fnf_settlements" USING btree ("user_id");
CREATE UNIQUE INDEX "uniq_payrolls_user_month" ON "payrolls" USING btree ("user_id","month");
CREATE INDEX "idx_payrolls_org_month_status" ON "payrolls" USING btree ("org_id","month","status");
CREATE INDEX "idx_reimbursements_org" ON "reimbursements" USING btree ("org_id");
CREATE INDEX "idx_reimbursements_user" ON "reimbursements" USING btree ("user_id");
CREATE INDEX "idx_loans_org" ON "salary_loans" USING btree ("org_id");
CREATE INDEX "idx_loans_user" ON "salary_loans" USING btree ("user_id");
CREATE INDEX "idx_salary_structures_user_active" ON "salary_structures" USING btree ("user_id","is_active");
CREATE INDEX "idx_calibration_sessions_candidate" ON "calibration_sessions" USING btree ("candidate_id");
CREATE INDEX "idx_calibration_sessions_org" ON "calibration_sessions" USING btree ("org_id");
CREATE INDEX "idx_applications_candidate" ON "candidate_applications" USING btree ("candidate_id");
CREATE INDEX "idx_applications_job" ON "candidate_applications" USING btree ("job_posting_id");
CREATE INDEX "idx_vault_candidate" ON "candidate_documents_vault" USING btree ("candidate_id");
CREATE INDEX "idx_vault_org" ON "candidate_documents_vault" USING btree ("org_id");
CREATE INDEX "idx_candidate_offers_candidate" ON "candidate_offers" USING btree ("candidate_id");
CREATE INDEX "idx_candidate_offers_org" ON "candidate_offers" USING btree ("org_id");
CREATE INDEX "idx_reference_checks_candidate" ON "candidate_reference_checks" USING btree ("candidate_id");
CREATE INDEX "idx_reference_checks_org" ON "candidate_reference_checks" USING btree ("org_id");
CREATE INDEX "idx_referrals_candidate" ON "candidate_referrals" USING btree ("candidate_id");
CREATE INDEX "idx_referrals_referred_by" ON "candidate_referrals" USING btree ("referred_by");
CREATE UNIQUE INDEX "uniq_sla_tracking_candidate_stage" ON "candidate_sla_tracking" USING btree ("candidate_id","stage");
CREATE INDEX "idx_sla_tracking_org_status" ON "candidate_sla_tracking" USING btree ("org_id","status");
CREATE INDEX "idx_sla_tracking_candidate" ON "candidate_sla_tracking" USING btree ("candidate_id");
CREATE INDEX "idx_candidate_sources_org" ON "candidate_sources" USING btree ("org_id");
CREATE UNIQUE INDEX "uq_candidate_sources_org_platform" ON "candidate_sources" USING btree ("org_id","platform");
CREATE INDEX "idx_candidates_org" ON "candidates" USING btree ("org_id");
CREATE INDEX "idx_candidates_status" ON "candidates" USING btree ("status");
CREATE INDEX "idx_candidates_email" ON "candidates" USING btree ("email");
CREATE INDEX "idx_booking_links_token" ON "interview_booking_links" USING btree ("token");
CREATE INDEX "idx_booking_links_candidate" ON "interview_booking_links" USING btree ("candidate_id");
CREATE INDEX "idx_interview_questions_org" ON "interview_questions" USING btree ("org_id");
CREATE INDEX "idx_interview_questions_category" ON "interview_questions" USING btree ("org_id","category");
CREATE INDEX "idx_scorecards_interview" ON "interview_scorecards" USING btree ("interview_id");
CREATE INDEX "idx_scorecards_interviewer" ON "interview_scorecards" USING btree ("interviewer_id");
CREATE UNIQUE INDEX "uniq_scorecard_interview_interviewer" ON "interview_scorecards" USING btree ("interview_id","interviewer_id");
CREATE UNIQUE INDEX "uniq_interview_sla_org_stage" ON "interview_slas" USING btree ("org_id","stage");
CREATE INDEX "idx_interviews_candidate" ON "interviews" USING btree ("candidate_id");
CREATE INDEX "idx_interviews_interviewer" ON "interviews" USING btree ("interviewer_id");
CREATE INDEX "idx_interviews_scheduled" ON "interviews" USING btree ("scheduled_at");
CREATE INDEX "idx_job_postings_org" ON "job_postings" USING btree ("org_id");
CREATE INDEX "idx_job_postings_status" ON "job_postings" USING btree ("status");
CREATE INDEX "idx_scorecard_templates_org" ON "scorecard_templates" USING btree ("org_id");
CREATE INDEX "idx_alumni_org" ON "alumni_profiles" USING btree ("org_id");
CREATE INDEX "idx_bgv_user" ON "background_verifications" USING btree ("user_id");
CREATE INDEX "idx_candidate_docs_candidate" ON "candidate_documents" USING btree ("candidate_id");
CREATE INDEX "idx_candidate_docs_external" ON "candidate_documents" USING btree ("external_doc_id");
CREATE INDEX "idx_certifications_user" ON "certifications" USING btree ("user_id");
CREATE INDEX "idx_certifications_expiry" ON "certifications" USING btree ("expiry_date");
CREATE INDEX "idx_dtv_template_id" ON "document_template_versions" USING btree ("template_id");
CREATE INDEX "idx_doc_templates_org" ON "document_templates" USING btree ("org_id","type");
CREATE INDEX "idx_doc_types_org" ON "document_types" USING btree ("org_id");
CREATE INDEX "idx_onboarding_docs_user" ON "onboarding_documents" USING btree ("user_id");
CREATE INDEX "idx_onboarding_docs_org" ON "onboarding_documents" USING btree ("org_id");
CREATE INDEX "idx_onboarding_tasks_user" ON "onboarding_tasks" USING btree ("user_id","org_id");
CREATE INDEX "idx_onboarding_tasks_status" ON "onboarding_tasks" USING btree ("org_id","status");
CREATE INDEX "idx_onboarding_templates_org" ON "onboarding_templates" USING btree ("org_id");
CREATE INDEX "idx_resignations_org" ON "resignations" USING btree ("org_id");
CREATE INDEX "idx_resignations_user" ON "resignations" USING btree ("user_id");
CREATE INDEX "idx_terminations_org" ON "terminations" USING btree ("org_id");
CREATE INDEX "idx_terminations_user" ON "terminations" USING btree ("user_id");
CREATE INDEX "idx_terminations_status" ON "terminations" USING btree ("status");
CREATE INDEX "idx_assessment_attempts_user" ON "assessment_attempts" USING btree ("user_id");
CREATE INDEX "idx_employee_skills_user" ON "employee_skills" USING btree ("user_id");
CREATE INDEX "idx_employee_skills_name" ON "employee_skills" USING btree ("skill_name");
CREATE INDEX "idx_enps_org_period" ON "enps_scores" USING btree ("org_id","period");
CREATE INDEX "idx_feedback_subject" ON "feedback_requests" USING btree ("subject_user_id");
CREATE INDEX "idx_feedback_reviewer" ON "feedback_requests" USING btree ("reviewer_user_id");
CREATE INDEX "idx_goals_user_status" ON "goals" USING btree ("user_id","status");
CREATE INDEX "idx_goals_org_status" ON "goals" USING btree ("org_id","status");
CREATE INDEX "idx_key_results_goal" ON "key_results" USING btree ("goal_id");
CREATE INDEX "idx_one_on_ones_org" ON "one_on_one_meetings" USING btree ("org_id");
CREATE INDEX "idx_one_on_ones_manager" ON "one_on_one_meetings" USING btree ("manager_id");
CREATE INDEX "idx_one_on_ones_scheduled" ON "one_on_one_meetings" USING btree ("scheduled_at");
CREATE INDEX "idx_pip_user" ON "performance_improvement_plans" USING btree ("user_id");
CREATE INDEX "idx_perf_reviews_org_cycle" ON "performance_reviews" USING btree ("org_id","cycle_id");
CREATE INDEX "idx_perf_reviews_user" ON "performance_reviews" USING btree ("user_id");
CREATE INDEX "idx_surveys_org" ON "pulse_surveys" USING btree ("org_id");
CREATE INDEX "idx_recognitions_org" ON "recognitions" USING btree ("org_id");
CREATE INDEX "idx_recognitions_to_user" ON "recognitions" USING btree ("to_user_id");
CREATE INDEX "idx_review_cycles_org" ON "review_cycles" USING btree ("org_id");
CREATE INDEX "idx_skill_assessments_org" ON "skill_assessments" USING btree ("org_id");
CREATE INDEX "idx_survey_responses_survey" ON "survey_responses" USING btree ("survey_id");
CREATE INDEX "idx_career_ladders_org" ON "career_ladders" USING btree ("org_id");
CREATE INDEX "idx_documents_org_type" ON "documents" USING btree ("org_id","type");
CREATE INDEX "idx_documents_user" ON "documents" USING btree ("user_id");
CREATE INDEX "idx_documents_expiry" ON "documents" USING btree ("expiry_date");
CREATE INDEX "idx_email_templates_org" ON "hr_email_templates" USING btree ("org_id");
CREATE INDEX "idx_handbook_org" ON "handbook_versions" USING btree ("org_id");
CREATE INDEX "idx_learning_paths_org" ON "learning_paths" USING btree ("org_id");
CREATE INDEX "idx_policy_ack_doc" ON "policy_acknowledgments" USING btree ("document_id");
CREATE INDEX "idx_policy_ack_user" ON "policy_acknowledgments" USING btree ("user_id");
CREATE INDEX "idx_rich_documents_org" ON "rich_documents" USING btree ("org_id");
CREATE INDEX "idx_team_events_org" ON "team_events" USING btree ("org_id");
CREATE INDEX "idx_email_campaigns_org" ON "email_campaigns" USING btree ("org_id","status");
CREATE INDEX "idx_lead_activities_lead" ON "lead_activities" USING btree ("lead_id");
CREATE INDEX "idx_lead_activities_user" ON "lead_activities" USING btree ("user_id");
CREATE INDEX "idx_lead_activities_org_date" ON "lead_activities" USING btree ("org_id","date");
CREATE INDEX "idx_lead_assignment_rules_org" ON "lead_assignment_rules" USING btree ("org_id");
CREATE INDEX "idx_lead_emails_lead" ON "lead_emails" USING btree ("lead_id");
CREATE INDEX "idx_lead_emails_org_sent" ON "lead_emails" USING btree ("org_id","sent_at");
CREATE INDEX "idx_lead_batches_org" ON "lead_import_batches" USING btree ("org_id");
CREATE INDEX "idx_lead_notes_lead" ON "lead_notes" USING btree ("lead_id");
CREATE INDEX "idx_lead_notes_org_created" ON "lead_notes" USING btree ("org_id","created_at");
CREATE INDEX "idx_lead_scoring_rules_org" ON "lead_scoring_rules" USING btree ("org_id");
CREATE INDEX "idx_lead_tasks_lead" ON "lead_tasks" USING btree ("lead_id");
CREATE INDEX "idx_lead_tasks_org_status" ON "lead_tasks" USING btree ("org_id","status");
CREATE INDEX "idx_leads_org_status_created" ON "leads" USING btree ("org_id","status","created_at");
CREATE INDEX "idx_leads_assigned_to" ON "leads" USING btree ("assigned_to_id");
CREATE INDEX "idx_leads_source" ON "leads" USING btree ("source");
CREATE INDEX "idx_leads_score" ON "leads" USING btree ("score");
CREATE INDEX "idx_leads_deleted" ON "leads" USING btree ("deleted_at");
CREATE INDEX "web_lead_forms_org_id_idx" ON "web_lead_forms" USING btree ("org_id");
CREATE UNIQUE INDEX "web_lead_forms_token_idx" ON "web_lead_forms" USING btree ("public_token");
CREATE INDEX "idx_branches_org" ON "branches" USING btree ("org_id");
CREATE UNIQUE INDEX "uniq_branch_code_org" ON "branches" USING btree ("org_id","code");
CREATE INDEX "idx_client_account_activities_account" ON "client_account_activities" USING btree ("client_account_id");
CREATE INDEX "idx_client_account_activities_user" ON "client_account_activities" USING btree ("user_id");
CREATE INDEX "idx_client_accounts_org" ON "client_accounts" USING btree ("org_id");
CREATE INDEX "idx_client_accounts_sales_rep" ON "client_accounts" USING btree ("sales_rep_id");
CREATE INDEX "idx_client_accounts_status" ON "client_accounts" USING btree ("org_id","status");
CREATE INDEX "idx_onboarding_items_client" ON "client_onboarding_items" USING btree ("client_id");
CREATE INDEX "idx_onboarding_items_org" ON "client_onboarding_items" USING btree ("org_id");
CREATE INDEX "idx_client_onboarding_templates_org" ON "client_onboarding_templates" USING btree ("org_id");
CREATE INDEX "idx_client_opps_org" ON "client_opportunities" USING btree ("org_id");
CREATE INDEX "idx_client_opps_client" ON "client_opportunities" USING btree ("client_id");
CREATE INDEX "idx_clients_org_status" ON "clients" USING btree ("org_id","status");
CREATE INDEX "idx_clients_account_manager" ON "clients" USING btree ("account_manager_id");
CREATE INDEX "idx_contacts_org" ON "contacts" USING btree ("org_id");
CREATE INDEX "idx_contacts_organization" ON "contacts" USING btree ("organization_id");
CREATE INDEX "idx_contacts_name_email" ON "contacts" USING btree ("org_id","name","email");
CREATE INDEX "idx_crm_organizations_org" ON "crm_organizations" USING btree ("org_id");
CREATE INDEX "idx_crm_organizations_parent" ON "crm_organizations" USING btree ("org_id","parent_id");
CREATE INDEX "idx_csat_responses_survey" ON "csat_responses" USING btree ("survey_id");
CREATE INDEX "idx_csat_surveys_org" ON "csat_surveys" USING btree ("org_id");
CREATE UNIQUE INDEX "idx_csat_surveys_token" ON "csat_surveys" USING btree ("public_token");
CREATE INDEX "idx_commissions_org_user" ON "commissions" USING btree ("org_id","user_id");
CREATE INDEX "idx_commissions_deal" ON "commissions" USING btree ("deal_id");
CREATE INDEX "cfd_org_entity_name_idx" ON "custom_field_definitions" USING btree ("org_id","entity_type","name");
CREATE INDEX "idx_cfd_org_entity" ON "custom_field_definitions" USING btree ("org_id","entity_type");
CREATE INDEX "idx_deal_activities_deal" ON "deal_activities" USING btree ("deal_id");
CREATE INDEX "idx_deal_activities_org" ON "deal_activities" USING btree ("org_id");
CREATE INDEX "idx_deal_approvals_org" ON "deal_approvals" USING btree ("org_id","status");
CREATE INDEX "idx_deal_approvals_deal" ON "deal_approvals" USING btree ("deal_id");
CREATE INDEX "idx_deal_meetings_deal" ON "deal_meetings" USING btree ("deal_id");
CREATE INDEX "idx_deal_meetings_org" ON "deal_meetings" USING btree ("org_id");
CREATE INDEX "idx_deals_org_stage_assignee" ON "deals" USING btree ("org_id","stage","assigned_to_id");
CREATE INDEX "idx_deals_client" ON "deals" USING btree ("client_id");
CREATE INDEX "idx_deals_lead" ON "deals" USING btree ("lead_id");
CREATE INDEX "idx_deals_close_date" ON "deals" USING btree ("expected_close_date");
CREATE INDEX "idx_incentives_org" ON "incentives" USING btree ("org_id");
CREATE INDEX "idx_incentives_sales_rep" ON "incentives" USING btree ("sales_rep_id");
CREATE INDEX "idx_incentives_status" ON "incentives" USING btree ("status");
CREATE INDEX "idx_sales_quotas_org_user" ON "sales_quotas" USING btree ("org_id","user_id");
CREATE INDEX "idx_target_history_target" ON "target_history" USING btree ("target_id");
CREATE INDEX "idx_target_history_org_created" ON "target_history" USING btree ("org_id","created_at");
CREATE INDEX "idx_targets_user_period" ON "targets" USING btree ("user_id","period");
CREATE INDEX "idx_targets_branch" ON "targets" USING btree ("branch_id");
CREATE INDEX "idx_targets_parent" ON "targets" USING btree ("parent_target_id");
CREATE INDEX "idx_tasks_org" ON "tasks" USING btree ("org_id");
CREATE INDEX "idx_tasks_assignee" ON "tasks" USING btree ("assignee_id");
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");
CREATE INDEX "idx_tasks_due_date" ON "tasks" USING btree ("due_date");
CREATE INDEX "idx_tasks_entity" ON "tasks" USING btree ("entity_type","entity_id");
CREATE INDEX "idx_tasks_parent" ON "tasks" USING btree ("parent_task_id");
CREATE INDEX "territories_org_id_idx" ON "territories" USING btree ("org_id");
CREATE INDEX "idx_invoice_items_invoice" ON "invoice_items" USING btree ("invoice_id");
CREATE INDEX "idx_invoices_org_status" ON "invoices" USING btree ("org_id","status");
CREATE INDEX "idx_invoices_client" ON "invoices" USING btree ("client_id");
CREATE INDEX "idx_invoices_project" ON "invoices" USING btree ("project_id");
CREATE INDEX "idx_invoices_due_date" ON "invoices" USING btree ("due_date");
CREATE INDEX "idx_payments_invoice" ON "payments" USING btree ("invoice_id");
CREATE INDEX "idx_payments_org_date" ON "payments" USING btree ("org_id","payment_date");
CREATE INDEX "idx_purchase_bill_items_bill" ON "purchase_bill_items" USING btree ("bill_id");
CREATE INDEX "idx_purchase_bills_org_status" ON "purchase_bills" USING btree ("org_id","status");
CREATE INDEX "idx_purchase_bills_vendor" ON "purchase_bills" USING btree ("vendor_id");
CREATE INDEX "idx_purchase_bills_due_date" ON "purchase_bills" USING btree ("due_date");
CREATE INDEX "idx_quotes_org_status" ON "quotes" USING btree ("org_id","status");
CREATE INDEX "idx_quotes_deal" ON "quotes" USING btree ("deal_id");
CREATE INDEX "idx_quotes_client" ON "quotes" USING btree ("client_id");
CREATE INDEX "idx_quotes_created_by" ON "quotes" USING btree ("created_by_id");
CREATE UNIQUE INDEX "idx_quotes_number" ON "quotes" USING btree ("org_id","quote_number");
CREATE INDEX "idx_support_ticket_messages_ticket" ON "support_ticket_messages" USING btree ("ticket_id");
CREATE INDEX "idx_support_ticket_messages_author" ON "support_ticket_messages" USING btree ("author_id");
CREATE INDEX "idx_support_tickets_org_status" ON "support_tickets" USING btree ("org_id","status");
CREATE INDEX "idx_support_tickets_assignee" ON "support_tickets" USING btree ("assignee_id");
CREATE INDEX "idx_support_tickets_client" ON "support_tickets" USING btree ("client_id");
CREATE INDEX "idx_support_tickets_priority" ON "support_tickets" USING btree ("priority");
CREATE INDEX "idx_support_tickets_sla" ON "support_tickets" USING btree ("sla_deadline");
CREATE INDEX "idx_vendor_payments_bill" ON "vendor_payments" USING btree ("bill_id");
CREATE INDEX "idx_vendor_payments_org_date" ON "vendor_payments" USING btree ("org_id","payment_date");
CREATE INDEX "idx_crm_email_templates_org" ON "crm_email_templates" USING btree ("org_id");
CREATE INDEX "idx_crm_sla_org" ON "crm_sla_policies" USING btree ("org_id");
CREATE INDEX "idx_crm_views_org" ON "crm_views" USING btree ("org_id");
CREATE INDEX "idx_ecr_campaign" ON "email_campaign_recipients" USING btree ("campaign_id","status");
CREATE INDEX "idx_ecr_lead" ON "email_campaign_recipients" USING btree ("lead_id");
CREATE INDEX "idx_client_health_scores_account" ON "client_health_scores" USING btree ("org_id","client_account_id");
CREATE INDEX "idx_client_health_scores_computed" ON "client_health_scores" USING btree ("org_id","computed_at");
CREATE INDEX "idx_health_score_config_org" ON "health_score_config" USING btree ("org_id");
CREATE INDEX "idx_nps_responses_survey" ON "nps_responses" USING btree ("survey_id");
CREATE INDEX "idx_nps_surveys_org_status" ON "nps_surveys" USING btree ("org_id","status");
CREATE INDEX "idx_playbook_entries_org" ON "playbook_entries" USING btree ("org_id");
CREATE INDEX "idx_chat_attachments_msg" ON "chat_attachments" USING btree ("message_id");
CREATE UNIQUE INDEX "uniq_channel_member" ON "chat_channel_members" USING btree ("channel_id","user_id");
CREATE INDEX "idx_chat_members_user" ON "chat_channel_members" USING btree ("user_id");
CREATE INDEX "idx_chat_members_channel" ON "chat_channel_members" USING btree ("channel_id");
CREATE INDEX "idx_chat_channels_org" ON "chat_channels" USING btree ("org_id");
CREATE INDEX "idx_chat_channels_last_msg" ON "chat_channels" USING btree ("org_id","last_message_at");
CREATE INDEX "idx_chat_messages_channel" ON "chat_messages" USING btree ("channel_id","created_at");
CREATE INDEX "idx_chat_messages_sender" ON "chat_messages" USING btree ("sender_id");
CREATE INDEX "idx_chat_messages_unread" ON "chat_messages" USING btree ("channel_id","is_deleted","created_at");
CREATE UNIQUE INDEX "uniq_chat_presence_user" ON "chat_user_presence" USING btree ("user_id");
CREATE INDEX "idx_chat_presence_org" ON "chat_user_presence" USING btree ("org_id","status");
CREATE INDEX "idx_chat_presence_lastseen" ON "chat_user_presence" USING btree ("org_id","last_seen_at");
CREATE INDEX "idx_ai_usage_org_feature" ON "ai_usage_logs" USING btree ("org_id","feature");
CREATE INDEX "idx_ai_usage_org_created" ON "ai_usage_logs" USING btree ("org_id","created_at");
CREATE INDEX "idx_ai_usage_user" ON "ai_usage_logs" USING btree ("user_id");
CREATE INDEX "idx_announcements_org" ON "announcements" USING btree ("org_id","expires_at");
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");
CREATE INDEX "idx_audit_logs_org_id" ON "audit_logs" USING btree ("org_id");
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");
CREATE INDEX "idx_calendar_events_org_date" ON "calendar_events" USING btree ("org_id","start_date");
CREATE INDEX "idx_calendar_events_category" ON "calendar_events" USING btree ("category");
CREATE INDEX "idx_calendar_events_created_by" ON "calendar_events" USING btree ("created_by");
CREATE INDEX "idx_event_attendees_event_id" ON "event_attendees" USING btree ("event_id");
CREATE INDEX "idx_event_attendees_user_id" ON "event_attendees" USING btree ("user_id");
CREATE INDEX "idx_notifications_user_unread_created" ON "notifications" USING btree ("user_id","is_read","created_at");
CREATE INDEX "idx_notifications_org_created" ON "notifications" USING btree ("org_id","created_at");
CREATE INDEX "idx_push_subs_user" ON "push_subscriptions" USING btree ("user_id");
CREATE INDEX "idx_sub_payments_org" ON "subscription_payments" USING btree ("org_id");
CREATE INDEX "idx_sub_payments_sub" ON "subscription_payments" USING btree ("subscription_id");
CREATE INDEX "idx_subscriptions_org" ON "subscriptions" USING btree ("org_id");
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" USING btree ("status");
CREATE INDEX "idx_subscriptions_razorpay" ON "subscriptions" USING btree ("razorpay_subscription_id");
CREATE INDEX "idx_webhook_endpoints_org" ON "webhook_endpoints" USING btree ("org_id");
CREATE INDEX "idx_webhook_logs_endpoint" ON "webhook_logs" USING btree ("endpoint_id");
CREATE INDEX "idx_webhook_logs_org_event" ON "webhook_logs" USING btree ("org_id","event");
CREATE INDEX "idx_blog_authors_name" ON "blog_authors" USING btree ("name");
CREATE INDEX "idx_blog_categories_slug" ON "blog_categories" USING btree ("slug");
CREATE INDEX "idx_blog_posts_status" ON "blog_posts" USING btree ("status");
CREATE INDEX "idx_blog_posts_category" ON "blog_posts" USING btree ("category_id");
CREATE INDEX "idx_blog_posts_author" ON "blog_posts" USING btree ("author_id");
CREATE INDEX "idx_blog_posts_status_published" ON "blog_posts" USING btree ("status","published_at" DESC NULLS LAST);
CREATE INDEX "idx_platform_messages_status" ON "platform_messages" USING btree ("status");
CREATE INDEX "idx_platform_messages_topic" ON "platform_messages" USING btree ("topic");
CREATE INDEX "idx_platform_messages_created" ON "platform_messages" USING btree ("created_at");
CREATE INDEX "idx_platform_messages_email" ON "platform_messages" USING btree ("email");
CREATE UNIQUE INDEX "uniq_platform_payments_razorpay_payment" ON "platform_payments" USING btree ("razorpay_payment_id");
CREATE INDEX "idx_platform_payments_status" ON "platform_payments" USING btree ("status");
CREATE INDEX "idx_platform_payments_org" ON "platform_payments" USING btree ("org_id");
CREATE INDEX "idx_platform_payments_created" ON "platform_payments" USING btree ("created_at");
CREATE UNIQUE INDEX "uniq_platform_subscriptions_org" ON "platform_subscriptions" USING btree ("org_id");
CREATE INDEX "idx_platform_subscriptions_status" ON "platform_subscriptions" USING btree ("status");
CREATE INDEX "idx_platform_visits_session" ON "platform_visits" USING btree ("session_token");
CREATE INDEX "idx_platform_visits_path" ON "platform_visits" USING btree ("path");
CREATE INDEX "idx_platform_visits_created" ON "platform_visits" USING btree ("created_at");
CREATE INDEX "idx_je_org_date" ON "journal_entries" USING btree ("org_id","entry_date");
CREATE INDEX "idx_je_org_source" ON "journal_entries" USING btree ("org_id","source_type","source_id");
CREATE INDEX "idx_je_org_status" ON "journal_entries" USING btree ("org_id","status");
CREATE INDEX "idx_jl_entry" ON "journal_lines" USING btree ("entry_id");
CREATE INDEX "idx_jl_account" ON "journal_lines" USING btree ("account_id");
CREATE INDEX "idx_ledger_accounts_org_type_active" ON "ledger_accounts" USING btree ("org_id","account_type","is_active");
CREATE INDEX "idx_kb_article_feedback_article" ON "kb_article_feedback" USING btree ("article_id");
CREATE UNIQUE INDEX "uniq_kb_articles_org_slug" ON "kb_articles" USING btree ("org_id","slug");
CREATE INDEX "idx_kb_articles_org_status" ON "kb_articles" USING btree ("org_id","status");
CREATE INDEX "idx_kb_articles_org_category" ON "kb_articles" USING btree ("org_id","category_id");
CREATE UNIQUE INDEX "uniq_kb_categories_org_slug" ON "kb_categories" USING btree ("org_id","slug");
CREATE INDEX "idx_kb_article_attachments_article" ON "kb_article_attachments" USING btree ("article_id");
CREATE INDEX "idx_support_macros_org" ON "support_macros" USING btree ("org_id");
CREATE INDEX "idx_support_routing_rules_org_enabled" ON "support_routing_rules" USING btree ("org_id","is_enabled");
CREATE INDEX "idx_kb_article_comments_article" ON "kb_article_comments" USING btree ("article_id");
CREATE INDEX "idx_support_ticket_activity_ticket" ON "support_ticket_activity" USING btree ("support_ticket_id");
CREATE INDEX "idx_automation_rules_org_trigger_enabled" ON "automation_rules" USING btree ("org_id","trigger_event","is_enabled");
CREATE INDEX "idx_automation_runs_rule" ON "automation_runs" USING btree ("rule_id");
