DROP POLICY IF EXISTS "Service manages contact rate limits" ON public.contact_submission_limits;
CREATE POLICY "Service manages contact rate limits"
ON public.contact_submission_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);