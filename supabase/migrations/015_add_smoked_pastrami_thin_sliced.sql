insert into products (
  name,
  description,
  category,
  price,
  sold_as,
  weight_options,
  stock_quantity,
  low_stock_threshold
)
select
  'Smoked Pastrami Thin Sliced',
  'Thin-sliced smoked pastrami sold by the pound',
  'smoked',
  50,
  'per_lb',
  array[1, 2, 3, 4, 5]::numeric[],
  25,
  5
where not exists (
  select 1 from products where name = 'Smoked Pastrami Thin Sliced'
);
