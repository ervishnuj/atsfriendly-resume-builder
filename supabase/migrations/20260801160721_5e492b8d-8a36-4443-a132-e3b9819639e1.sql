-- 1. Move SECURITY DEFINER helper out of the exposed API schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Repoint policies to the private helper
DROP POLICY IF EXISTS "Read own account" ON public.app_users;
CREATE POLICY "Read own account" ON public.app_users
  FOR SELECT TO authenticated
  USING ((auth.uid() = id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Read own transactions" ON public.transactions;
CREATE POLICY "Read own transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage settings" ON public.app_settings;
CREATE POLICY "Admins manage settings" ON public.app_settings
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 2. Explicit write policies: only admins may write; regular users are denied by default
CREATE POLICY "Admins insert accounts" ON public.app_users
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update accounts" ON public.app_users
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete accounts" ON public.app_users
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins insert transactions" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update transactions" ON public.transactions
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete transactions" ON public.transactions
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Race-safe daily quota consumption (single atomic conditional UPDATE)
CREATE OR REPLACE FUNCTION public.consume_daily_quota(_user_id uuid, _daily_limit integer)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH updated AS (
    UPDATE public.app_users
       SET daily_usage_count = CASE WHEN last_reset_date < CURRENT_DATE THEN 1
                                    ELSE daily_usage_count + 1 END,
           last_reset_date = CURRENT_DATE,
           updated_at = now()
     WHERE id = _user_id
       AND (
         is_unlimited
         OR (subscription_expires_at IS NOT NULL AND subscription_expires_at > now())
         OR last_reset_date < CURRENT_DATE
         OR daily_usage_count < _daily_limit
       )
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$$;

REVOKE ALL ON FUNCTION public.consume_daily_quota(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_daily_quota(uuid, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_daily_quota(uuid, integer) TO service_role;