-- Admin check: admin role OR the designated owner email
CREATE OR REPLACE FUNCTION private.is_app_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'::public.app_role
  ) OR EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = _user_id AND lower(u.email) = 'ervishnuj@gmail.com'
  );
$$;

-- PLANS
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL UNIQUE,
  price numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  duration_days integer NOT NULL,
  description text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (active OR private.is_app_admin(auth.uid()));
CREATE POLICY "Admins insert plans" ON public.subscription_plans
  FOR INSERT TO authenticated WITH CHECK (private.is_app_admin(auth.uid()));
CREATE POLICY "Admins update plans" ON public.subscription_plans
  FOR UPDATE TO authenticated USING (private.is_app_admin(auth.uid())) WITH CHECK (private.is_app_admin(auth.uid()));
CREATE POLICY "Admins delete plans" ON public.subscription_plans
  FOR DELETE TO authenticated USING (private.is_app_admin(auth.uid()));
CREATE TRIGGER subscription_plans_updated BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.subscription_plans (plan_name, price, currency, duration_days, description, sort_order) VALUES
  ('Daily', 100, 'INR', 1, 'Full premium access for 24 hours.', 1),
  ('Monthly', 1000, 'INR', 30, 'Best value for an active job search.', 2),
  ('Yearly', 10000, 'INR', 365, 'A full year of unlimited ATS optimization.', 3);

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  provider text NOT NULL DEFAULT 'manual_upi',
  gateway_order_id text,
  gateway_payment_id text,
  gateway_signature text,
  upi_reference text,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  payment_method text NOT NULL DEFAULT 'UPI',
  status text NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED','PENDING','SUCCESS','FAILED','REFUNDED')),
  admin_note text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_upi_reference_key ON public.payments (lower(upi_reference)) WHERE upi_reference IS NOT NULL;
CREATE UNIQUE INDEX payments_gateway_payment_id_key ON public.payments (gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;
CREATE INDEX payments_user_idx ON public.payments (user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own payments" ON public.payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.is_app_admin(auth.uid()));
CREATE POLICY "Create own pending payment" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND status IN ('CREATED','PENDING'));
CREATE POLICY "Admins update payments" ON public.payments
  FOR UPDATE TO authenticated USING (private.is_app_admin(auth.uid())) WITH CHECK (private.is_app_admin(auth.uid()));
CREATE POLICY "Admins delete payments" ON public.payments
  FOR DELETE TO authenticated USING (private.is_app_admin(auth.uid()));
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX subscriptions_payment_key ON public.subscriptions (payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX subscriptions_user_idx ON public.subscriptions (user_id, end_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.is_app_admin(auth.uid()));
CREATE POLICY "Admins insert subscriptions" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (private.is_app_admin(auth.uid()));
CREATE POLICY "Admins update subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated USING (private.is_app_admin(auth.uid())) WITH CHECK (private.is_app_admin(auth.uid()));
CREATE POLICY "Admins delete subscriptions" ON public.subscriptions
  FOR DELETE TO authenticated USING (private.is_app_admin(auth.uid()));
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- UPI CONFIG
CREATE TABLE public.upi_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  qr_image_path text,
  instructions text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX upi_configuration_single_active ON public.upi_configuration (active) WHERE active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upi_configuration TO authenticated;
GRANT ALL ON public.upi_configuration TO service_role;
ALTER TABLE public.upi_configuration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read active UPI config" ON public.upi_configuration
  FOR SELECT TO authenticated USING (active OR private.is_app_admin(auth.uid()));
CREATE POLICY "Admins insert UPI config" ON public.upi_configuration
  FOR INSERT TO authenticated WITH CHECK (private.is_app_admin(auth.uid()));
CREATE POLICY "Admins update UPI config" ON public.upi_configuration
  FOR UPDATE TO authenticated USING (private.is_app_admin(auth.uid())) WITH CHECK (private.is_app_admin(auth.uid()));
CREATE POLICY "Admins delete UPI config" ON public.upi_configuration
  FOR DELETE TO authenticated USING (private.is_app_admin(auth.uid()));
CREATE TRIGGER upi_configuration_updated BEFORE UPDATE ON public.upi_configuration
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Active subscription helper
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id AND status = 'ACTIVE' AND end_date > now()
  );
$$;
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO service_role;