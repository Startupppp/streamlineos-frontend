-- Add ticket_number column to tickets table
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "ticket_number" INTEGER;

-- Backfill ticket_number for existing tickets (per project)
-- This assigns sequential numbers starting from 1 for each project
-- Tickets without a project_id are treated as a separate group
WITH numbered_tickets AS (
  SELECT 
    id,
    project_id,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(project_id, -1) ORDER BY id ASC) as ticket_num
  FROM tickets
  WHERE ticket_number IS NULL
)
UPDATE tickets
SET ticket_number = numbered_tickets.ticket_num
FROM numbered_tickets
WHERE tickets.id = numbered_tickets.id;

-- Make ticket_number NOT NULL after backfilling
ALTER TABLE "tickets" ALTER COLUMN "ticket_number" SET NOT NULL;

-- Create index for faster queries on ticket_number per project
CREATE INDEX IF NOT EXISTS "tickets_project_id_ticket_number_idx" ON "tickets"("project_id", "ticket_number");
