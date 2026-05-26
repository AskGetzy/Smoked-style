insert into products (
  name,
  description,
  category,
  subcategory,
  price,
  sold_as,
  size_label,
  stock_quantity,
  low_stock_threshold
)
select
  'Smoked Flanken Roast Boneless',
  'Boneless smoked flanken roast with selectable cut options',
  'smoked',
  'smoked_flanken_roast_boneless',
  125,
  'per_piece',
  '3 Bone Cut (Boneless)',
  12,
  3
where not exists (
  select 1 from products
  where category = 'smoked'
    and subcategory = 'smoked_flanken_roast_boneless'
    and size_label = '3 Bone Cut (Boneless)'
);

insert into products (
  name,
  description,
  category,
  subcategory,
  price,
  sold_as,
  size_label,
  stock_quantity,
  low_stock_threshold
)
select
  'Smoked Flanken Roast Boneless',
  'Boneless smoked flanken roast with selectable cut options',
  'smoked',
  'smoked_flanken_roast_boneless',
  200,
  'per_piece',
  '3+5 Bone Cut (Boneless)',
  10,
  2
where not exists (
  select 1 from products
  where category = 'smoked'
    and subcategory = 'smoked_flanken_roast_boneless'
    and size_label = '3+5 Bone Cut (Boneless)'
);

insert into products (
  name,
  description,
  category,
  subcategory,
  price,
  sold_as,
  size_label,
  stock_quantity,
  low_stock_threshold
)
select
  'Smoked Flanken Roast Boneless',
  'Boneless smoked flanken roast with selectable cut options',
  'smoked',
  'smoked_flanken_roast_boneless',
  100,
  'per_piece',
  '5 Bone Cut (Boneless)',
  12,
  3
where not exists (
  select 1 from products
  where category = 'smoked'
    and subcategory = 'smoked_flanken_roast_boneless'
    and size_label = '5 Bone Cut (Boneless)'
);
