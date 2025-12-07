ALTER TABLE "attendance" ALTER COLUMN "break_hours" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "breaks" jsonb DEFAULT '[]'::jsonb;