insert into products (name, description, category, price, sold_as, pack_size, stock_quantity, low_stock_threshold)
select
  'Center Cut Rib Eye',
  'Thick-cut center rib eye with rich marbling and bold steakhouse flavor',
  'steaks',
  250,
  'per_piece',
  null,
  12,
  3
where not exists (
  select 1 from products where name = 'Center Cut Rib Eye'
);

insert into products (name, description, category, price, sold_as, pack_size, stock_quantity, low_stock_threshold)
select
  'Flat Iron Steak',
  'Tender flat iron steak with deep beefy flavor, perfect for grilling',
  'steaks',
  65,
  'per_piece',
  null,
  18,
  4
where not exists (
  select 1 from products where name = 'Flat Iron Steak'
);

insert into products (name, description, category, price, sold_as, pack_size, stock_quantity, low_stock_threshold)
select
  'Tomahawk Steak',
  'Large bone-in tomahawk steak for an impressive centerpiece',
  'steaks',
  200,
  'per_piece',
  null,
  10,
  2
where not exists (
  select 1 from products where name = 'Tomahawk Steak'
);
