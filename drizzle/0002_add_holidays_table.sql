-- Add holidays table for company-wide holiday management
CREATE TABLE IF NOT EXISTS "holidays" (
  "id" SERIAL PRIMARY KEY,
  "org_id" TEXT NOT NULL REFERENCES "organizations"("id"),
  "name" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "message" TEXT,
  "notification_sent" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "holidays_org_id_idx" ON "holidays"("org_id");
CREATE INDEX IF NOT EXISTS "holidays_date_idx" ON "holidays"("date");
CREATE INDEX IF NOT EXISTS "holidays_notification_sent_idx" ON "holidays"("notification_sent");


