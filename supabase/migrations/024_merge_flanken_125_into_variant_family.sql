update products
set
  name = 'Smoked Flanken Roast Boneless',
  description = 'Boneless smoked flanken roast with selectable cut options',
  category = 'smoked',
  subcategory = 'smoked_flanken_roast_boneless',
  sold_as = 'per_piece',
  size_label = '3 Bone Cut (Boneless)'
where category = 'smoked'
  and sold_as = 'per_piece'
  and price = 125
  and name = 'Smoked Flanken Roast Boneless';

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
  select 1
  from products
  where category = 'smoked'
    and subcategory = 'smoked_flanken_roast_boneless'
    and size_label = '3 Bone Cut (Boneless)'
    and price = 125
);
