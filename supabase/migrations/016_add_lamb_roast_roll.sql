insert into products (
  name,
  description,
  category,
  price,
  sold_as,
  stock_quantity,
  low_stock_threshold
)
select
  'Lamb Roast Roll',
  'Smoked lamb roast roll, ready for carving and serving',
  'smoked',
  250,
  'per_piece',
  10,
  2
where not exists (
  select 1 from products where name = 'Lamb Roast Roll'
);
