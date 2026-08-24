CREATE TABLE IF NOT EXISTS public.free_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now(),
  consumed_at timestamptz
);

GRANT SELECT ON public.free_entitlements TO authenticated;
GRANT ALL ON public.free_entitlements TO service_role;

ALTER TABLE public.free_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own free entitlement" ON public.free_entitlements;
CREATE POLICY "Read own free entitlement" ON public.free_entitlements
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR private.is_app_admin(auth.uid()));

-- Idempotent grant: every account gets exactly one free PDF entitlement.
CREATE OR REPLACE FUNCTION public.grant_free_entitlement(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH ins AS (
    INSERT INTO public.free_entitlements (user_id)
    VALUES (_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING 1
  )
  SELECT consumed_at IS NULL FROM public.free_entitlements WHERE user_id = _user_id;
$$;

-- Atomic single-use consumption; returns true only for the call that wins.
CREATE OR REPLACE FUNCTION public.consume_free_entitlement(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.free_entitlements (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.free_entitlements
     SET consumed_at = now()
   WHERE user_id = _user_id AND consumed_at IS NULL
  RETURNING user_id INTO _id;

  RETURN _id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_free_entitlement(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_free_entitlement(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_free_entitlement(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_free_entitlement(uuid) TO service_role;

-- Backfill existing accounts (idempotent).
INSERT INTO public.free_entitlements (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Accurate, non-misleading plan copy (5 AI generations/day).
UPDATE public.subscription_plans SET
  description = 'One job-specific AI resume with ATS analysis.',
  features = ARRAY[
    '1 AI-generated job-specific resume',
    '1 ATS analysis',
    'ATS optimization',
    'PDF download',
    'DOCX download',
    'One-time payment'
  ]
WHERE price = 39;

UPDATE public.subscription_plans SET
  description = 'Flexible access for an active 7-day job search.',
  features = ARRAY[
    'Valid for 7 days',
    'Up to 5 AI resume generations per day',
    'Up to 5 ATS analyses per day',
    'JD matching',
    'Skill Gap Analysis',
    'AI suggestions',
    'Unlimited edits',
    'PDF/DOCX export',
    'WhatsApp copy'
  ]
WHERE price = 149;

UPDATE public.subscription_plans SET
  description = 'Full access for a month of active job applications.',
  features = ARRAY[
    'Valid for 30 days',
    'Up to 5 AI resume generations per day',
    'Up to 10 ATS analyses per day',
    'JD matching',
    'Skill Gap Analysis',
    'AI suggestions',
    'AI Cover Letters',
    'Unlimited edits',
    'PDF/DOCX export',
    'Priority Support'
  ]
WHERE price = 399;

UPDATE public.subscription_plans SET description = 'Full premium access for 24 hours.' WHERE price = 100;
UPDATE public.subscription_plans SET description = 'Best value for an active job search.' WHERE price = 1000;
UPDATE public.subscription_plans SET description = 'A full year of ATS optimization, with up to 10 AI resumes per day.' WHERE price = 10000;