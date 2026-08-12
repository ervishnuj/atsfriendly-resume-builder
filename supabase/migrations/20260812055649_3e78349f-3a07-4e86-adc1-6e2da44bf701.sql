ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS plan_code text,
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'PASS',
  ADD COLUMN IF NOT EXISTS pdf_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS highlight boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_plan_code_key ON public.subscription_plans (plan_code) WHERE plan_code IS NOT NULL;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS credits_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_used integer NOT NULL DEFAULT 0;

-- Atomic, race-safe one-time PDF credit consumption for the calling user.
CREATE OR REPLACE FUNCTION public.consume_pdf_credit(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
BEGIN
  UPDATE public.subscriptions s
     SET credits_used = s.credits_used + 1,
         updated_at = now()
   WHERE s.id = (
     SELECT s2.id FROM public.subscriptions s2
      WHERE s2.user_id = _user_id
        AND s2.status = 'ACTIVE'
        AND s2.end_date > now()
        AND s2.credits_total > 0
        AND s2.credits_used < s2.credits_total
      ORDER BY s2.end_date ASC
      LIMIT 1
      FOR UPDATE
   )
  RETURNING s.id INTO _id;
  RETURN _id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_pdf_credit(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_pdf_credit(uuid) TO service_role;