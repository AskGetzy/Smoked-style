ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_email text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_phone text;
