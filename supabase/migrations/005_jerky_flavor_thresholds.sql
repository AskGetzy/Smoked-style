ALTER TABLE products ADD COLUMN IF NOT EXISTS jerky_flavor_thresholds jsonb NOT NULL DEFAULT '{}'::jsonb;
