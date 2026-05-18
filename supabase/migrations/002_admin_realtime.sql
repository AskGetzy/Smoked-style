-- Supabase Realtime only sends row changes that the connected user can read through RLS.
-- Admin order auto-refresh requires the admin Auth user email to exist in public.admin_users.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where lower(email) = lower(auth.email())
  );
$$;

grant execute on function public.is_admin() to authenticated;

create policy "orders_admin_read"
  on public.orders
  for select
  to authenticated
  using (public.is_admin());

create policy "customers_admin_read"
  on public.customers
  for select
  to authenticated
  using (public.is_admin());

create policy "order_items_admin_read"
  on public.order_items
  for select
  to authenticated
  using (public.is_admin());

-- Also enable this in the Supabase dashboard under Database > Replication
-- if this migration is not applied through the Supabase CLI.
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object or undefined_object then null;
end $$;
