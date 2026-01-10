-- Add approval workflow and billable hours to timesheets
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING';
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS approved_by text REFERENCES users(id);
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS approved_at timestamp;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS is_billable boolean DEFAULT false;
ALTER TABLE timesheets ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON timesheets(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_billable ON timesheets(is_billable);

