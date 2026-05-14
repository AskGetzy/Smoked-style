module.exports =
  "Create the Supabase database schema by generating a SQL migration file at supabase/migrations/001_initial.sql\n\n" +
  "Create the following tables:\n\n" +
  "PRODUCTS table:\n" +
  "- id (uuid, primary key)\n" +
  "- name (text)\n" +
  "- description (text)\n" +
  "- category (text) — values: jerky, steaks, smoked, non_smoked, boards\n" +
  "- subcategory (text) — e.g. jerky_board, meat_board, steak_board, carpaccio\n" +
  "- price (numeric)\n" +
  "- sold_as (text) — values: per_lb, per_piece, per_pack, per_pan, per_board\n" +
  "- pack_size (integer) — for items sold in packs, e.g. 4 for Skirt Steak\n" +
  "- flavors (text[]) — array of available flavors, for Jerky only\n" +
  "- weight_options (numeric[]) — array of available weights, for Jerky only\n" +
  "- size_label (text) — e.g. '8x12', '10x15', for boards\n" +
  "- stock_quantity (numeric)\n" +
  "- low_stock_threshold (numeric)\n" +
  "- is_in_stock (boolean, default true)\n" +
  "- is_featured_purim (boolean, default false)\n" +
  "- image_url (text)\n" +
  "- created_at (timestamptz)\n\n" +
  "CUSTOMERS table:\n" +
  "- id (uuid, primary key, references auth.users)\n" +
  "- full_name (text)\n" +
  "- email (text)\n" +
  "- phone (text)\n" +
  "- stripe_customer_id (text)\n" +
  "- tags (text[]) — values: vip, wholesale, event_customer\n" +
  "- admin_notes (text)\n" +
  "- created_at (timestamptz)\n\n" +
  "DELIVERY_AREAS table:\n" +
  "- id (uuid, primary key)\n" +
  "- name (text) — e.g. Williamsburg, Boro Park, Monsey\n" +
  "- delivery_fee (numeric, default 30)\n" +
  "- is_backend_only (boolean, default false) — true for Personal Delivery and Uber\n" +
  "- is_active (boolean, default true)\n\n" +
  "ORDERS table:\n" +
  "- id (uuid, primary key)\n" +
  "- order_number (text, unique) — auto-generated readable ID like SS-2024-0001\n" +
  "- customer_id (uuid, references customers)\n" +
  "- status (text) — values: pending, approved, out_for_delivery, delivered, cancelled\n" +
  "- order_type (text) — values: delivery, pickup\n" +
  "- delivery_area_id (uuid, references delivery_areas)\n" +
  "- delivery_address (text)\n" +
  "- delivery_date (date)\n" +
  "- recipient_name (text)\n" +
  "- recipient_phone (text)\n" +
  "- subtotal (numeric)\n" +
  "- delivery_fee (numeric)\n" +
  "- custom_adjustment (numeric, default 0)\n" +
  "- custom_adjustment_note (text)\n" +
  "- total (numeric)\n" +
  "- order_notes (text)\n" +
  "- gift_message (text)\n" +
  "- stripe_payment_intent_id (text)\n" +
  "- assigned_driver_id (uuid)\n" +
  "- is_bulk_order (boolean, default false)\n" +
  "- parent_bulk_order_id (uuid) — for individual stops within a bulk order\n" +
  "- created_at (timestamptz)\n" +
  "- approved_at (timestamptz)\n" +
  "- delivered_at (timestamptz)\n\n" +
  "ORDER_ITEMS table:\n" +
  "- id (uuid, primary key)\n" +
  "- order_id (uuid, references orders)\n" +
  "- product_id (uuid, references products)\n" +
  "- product_name (text) — snapshot of name at time of order\n" +
  "- quantity (numeric)\n" +
  "- selected_flavor (text) — for jerky\n" +
  "- selected_weight (numeric) — for jerky\n" +
  "- selected_size (text) — for boards\n" +
  "- unit_price (numeric)\n" +
  "- line_total (numeric)\n\n" +
  "ADMIN_USERS table:\n" +
  "- id (uuid, primary key)\n" +
  "- email (text)\n" +
  "- full_name (text)\n" +
  "- role (text) — values: owner, staff\n" +
  "- created_at (timestamptz)\n\n" +
  "STOCK_HISTORY table:\n" +
  "- id (uuid, primary key)\n" +
  "- product_id (uuid, references products)\n" +
  "- changed_by (uuid, references admin_users)\n" +
  "- change_amount (numeric)\n" +
  "- previous_quantity (numeric)\n" +
  "- new_quantity (numeric)\n" +
  "- reason (text)\n" +
  "- created_at (timestamptz)\n\n" +
  "Enable Row Level Security on all tables. Customers can only read/write their own data. Admin users have full access via service role key.";
