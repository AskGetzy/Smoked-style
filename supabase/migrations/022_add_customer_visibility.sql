alter table products
add column if not exists is_customer_visible boolean not null default true;
