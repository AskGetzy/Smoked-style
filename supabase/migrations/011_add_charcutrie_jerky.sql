insert into products (
  name,
  description,
  category,
  price,
  sold_as,
  flavors,
  weight_options,
  stock_quantity,
  low_stock_threshold
)
select
  'Charcutrie',
  'House-crafted charcutrie sliced fresh and sold by the pound',
  'jerky',
  100,
  'per_lb',
  array['Original']::text[],
  array[0.5, 1.0, 1.5, 2.0]::numeric[],
  50,
  5
where not exists (
  select 1 from products where name = 'Charcutrie'
);
