DROP POLICY IF EXISTS "Authenticated read tax settings" ON public.business_tax_settings;
CREATE POLICY "Admins read tax settings" ON public.business_tax_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Authenticated read partner settings" ON public.partner_settings;
CREATE POLICY "Admins read partner settings" ON public.partner_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));