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
  'Smoked Rib Eye Boneless',
  'Smoked boneless rib eye roast, ready for carving and serving',
  'smoked',
  500,
  'per_piece',
  8,
  2
where not exists (
  select 1 from products where name = 'Smoked Rib Eye Boneless'
);
