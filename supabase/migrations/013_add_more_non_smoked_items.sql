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
  'Minute Roast',
  'Tender minute roast prepared for quick roasting and easy serving',
  'non_smoked',
  75,
  'per_piece',
  18,
  4
where not exists (
  select 1 from products where name = 'Minute Roast'
);

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
  '9x13 Pulled Beef Gnocchi',
  'Pulled beef gnocchi prepared in a 9x13 pan for family-style serving',
  'non_smoked',
  150,
  'per_pan',
  12,
  3
where not exists (
  select 1 from products where name = '9x13 Pulled Beef Gnocchi'
);
