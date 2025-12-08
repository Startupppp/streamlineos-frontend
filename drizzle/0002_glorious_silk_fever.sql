ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_balances" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "leave_types" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "payrolls" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "sprints" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "org_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "timesheets" ADD COLUMN "org_id" text NOT NULL;