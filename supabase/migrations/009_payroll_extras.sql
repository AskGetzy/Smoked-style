ALTER TABLE payroll_entries ADD COLUMN IF NOT EXISTS extras jsonb DEFAULT '[]'::jsonb;
