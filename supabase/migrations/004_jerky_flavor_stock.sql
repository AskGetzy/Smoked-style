ALTER TABLE products ADD COLUMN IF NOT EXISTS jerky_flavor_stock jsonb NOT NULL DEFAULT '{}'::jsonb;
