-- buyer_customer_id was an orphaned column: not created by any migration in
-- this repo, unreferenced by any application code, and NULL on every row.
-- Its foreign key to customers(id) created a second FK alongside
-- orders_customer_id_fkey, which broke every PostgREST embed of the form
-- `customers(...)` across the app (orders list, approve/reject, status
-- changes, retry-capture, delivery-date edits, boss dashboard, and the
-- Stripe webhook) with an ambiguous-relationship error. Dropping it restores
-- those queries without needing to disambiguate each one individually.
alter table orders drop column if exists buyer_customer_id;
