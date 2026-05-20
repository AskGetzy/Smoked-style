-- Allow authenticated admin users to manage inventory from the admin panel.
create policy "products_admin_update"
  on public.products
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "stock_history_admin_insert"
  on public.stock_history
  for insert
  to authenticated
  with check (public.is_admin());

create policy "stock_history_admin_read"
  on public.stock_history
  for select
  to authenticated
  using (public.is_admin());
