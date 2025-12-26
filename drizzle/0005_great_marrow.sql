CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER');--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'CONTRIBUTOR',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::text;--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::text;--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::text;--> statement-breakpoint
DROP TYPE "public"."role";--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('OWNER', 'ADMIN', 'MEMBER');--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"public"."role";--> statement-breakpoint
ALTER TABLE "invitations" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"public"."role";--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "role_permissions" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"public"."role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "type" SET DEFAULT 'TASK';--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "timesheets" ALTER COLUMN "hours" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "timesheets" ALTER COLUMN "hours" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "settings" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" "gender";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;