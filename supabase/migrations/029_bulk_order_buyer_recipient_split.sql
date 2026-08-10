ALTER TABLE orders
ADD COLUMN IF NOT EXISTS is_bulk_order boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_customer_id uuid REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS bulk_total numeric,
ADD COLUMN IF NOT EXISTS bulk_payment_method text
  CHECK (bulk_payment_method IN ('payment_link', 'cash', 'check', 'card_on_file')),
ADD COLUMN IF NOT EXISTS bulk_paid_at timestamptz,
ADD COLUMN IF NOT EXISTS bulk_payment_link_url text;

CREATE TABLE IF NOT EXISTS bulk_order_recipients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  recipient_phone text,
  product_id uuid REFERENCES products(id),
  product_name text NOT NULL,
  flavor text,
  weight numeric,
  size text,
  unit_price numeric,
  quantity integer NOT NULL DEFAULT 1,
  order_type text CHECK (order_type IN ('pickup', 'delivery')),
  delivery_area_id uuid REFERENCES delivery_areas(id),
  delivery_area text,
  address text,
  delivery_date date,
  notes text,
  gift_message text,
  line_total numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bulk_order_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role only" ON bulk_order_recipients;
CREATE POLICY "service role only" ON bulk_order_recipients
FOR ALL USING (auth.role() = 'service_role');
