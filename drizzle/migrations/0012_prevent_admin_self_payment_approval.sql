DROP POLICY IF EXISTS "Admins update payments" ON public.payments;

CREATE POLICY "Admins update payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (private.is_app_admin(auth.uid()))
  WITH CHECK (
    private.is_app_admin(auth.uid())
    AND (status <> 'SUCCESS' OR user_id IS DISTINCT FROM auth.uid())
  );