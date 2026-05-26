alter table products
  add column if not exists customer_inquiry_only boolean not null default false;

insert into products (
  name,
  description,
  category,
  price,
  customer_inquiry_only,
  sold_as,
  flavors,
  weight_options,
  stock_quantity,
  low_stock_threshold
)
select
  'Wholesale Jerky',
  'Bulk jerky sold through direct inquiry and special wholesale orders',
  'jerky',
  75,
  true,
  'per_lb',
  array['Original']::text[],
  array[0.5, 1.0, 1.5, 2.0]::numeric[],
  50,
  5
where not exists (
  select 1 from products where name = 'Wholesale Jerky'
);
