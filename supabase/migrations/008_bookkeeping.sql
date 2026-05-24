-- Bookkeeping tables (owner-managed via API service role)

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  category text NOT NULL,
  description text,
  amount numeric NOT NULL,
  receipt_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role text,
  pay_type text NOT NULL,
  rate numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  hours_worked numeric,
  amount_paid numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE lower(email) = lower(auth.email())
      AND role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

CREATE POLICY "expenses_owner_all" ON expenses
  FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE POLICY "staff_members_owner_all" ON staff_members
  FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

CREATE POLICY "payroll_entries_owner_all" ON payroll_entries
  FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());
