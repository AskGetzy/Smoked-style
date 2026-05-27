alter table customers
  add column if not exists saved_address_1 text,
  add column if not exists saved_delivery_area_id_1 uuid references delivery_areas(id),
  add column if not exists saved_address_1_label text not null default 'Address 1',
  add column if not exists saved_address_2 text,
  add column if not exists saved_delivery_area_id_2 uuid references delivery_areas(id),
  add column if not exists saved_address_2_label text not null default 'Address 2';
