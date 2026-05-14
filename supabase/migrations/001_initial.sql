-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  subcategory text,
  price numeric not null,
  sold_as text not null default 'per_piece',
  pack_size integer,
  flavors text[],
  weight_options numeric[],
  size_label text,
  stock_quantity numeric not null default 0,
  low_stock_threshold numeric not null default 5,
  is_in_stock boolean not null default true,
  is_featured_purim boolean not null default false,
  image_url text,
  created_at timestamptz not null default now()
);

-- Customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  stripe_customer_id text,
  tags text[] not null default '{}',
  admin_notes text,
  created_at timestamptz not null default now()
);

-- Delivery areas
create table delivery_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  delivery_fee numeric not null default 30,
  is_backend_only boolean not null default false,
  is_active boolean not null default true
);

-- Orders
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_id uuid references customers(id),
  status text not null default 'pending',
  order_type text not null default 'delivery',
  delivery_area_id uuid references delivery_areas(id),
  delivery_address text,
  delivery_date date,
  recipient_name text,
  recipient_phone text,
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  custom_adjustment numeric not null default 0,
  custom_adjustment_note text,
  total numeric not null default 0,
  order_notes text,
  gift_message text,
  stripe_payment_intent_id text,
  assigned_driver_id uuid,
  is_bulk_order boolean not null default false,
  parent_bulk_order_id uuid,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  delivered_at timestamptz
);

-- Order items
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text not null,
  quantity numeric not null default 1,
  selected_flavor text,
  selected_weight numeric,
  selected_size text,
  unit_price numeric not null,
  line_total numeric not null
);

-- Admin users
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  role text not null default 'staff',
  created_at timestamptz not null default now()
);

-- Stock history
create table stock_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id),
  changed_by uuid,
  change_amount numeric not null,
  previous_quantity numeric not null,
  new_quantity numeric not null,
  reason text,
  created_at timestamptz not null default now()
);

-- RLS
alter table products enable row level security;
alter table customers enable row level security;
alter table delivery_areas enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table admin_users enable row level security;
alter table stock_history enable row level security;

-- Public read for products and delivery areas
create policy "products_public_read" on products for select using (true);
create policy "areas_public_read" on delivery_areas for select using (true);

-- Customers can read/write their own data
create policy "customers_own" on customers for all using (auth.uid() = id);
create policy "orders_own" on orders for select using (auth.uid() = customer_id);
create policy "order_items_own" on order_items for select
  using (exists (select 1 from orders where orders.id = order_items.order_id and orders.customer_id = auth.uid()));
