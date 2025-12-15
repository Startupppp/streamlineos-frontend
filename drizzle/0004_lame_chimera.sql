CREATE TABLE "onboarding_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"step_name" text NOT NULL,
	"status" "onboarding_status" DEFAULT 'PENDING',
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"color" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'TODO';--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "key" text NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "story_points" integer;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "link" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "parent_ticket_id" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "skills" text[];--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "experience_years" numeric;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "joining_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_details" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_password_change_required" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_statuses" ADD CONSTRAINT "project_statuses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_statuses" ADD CONSTRAINT "project_statuses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_parent_ticket_id_tickets_id_fk" FOREIGN KEY ("parent_ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_key_unique" UNIQUE("key");