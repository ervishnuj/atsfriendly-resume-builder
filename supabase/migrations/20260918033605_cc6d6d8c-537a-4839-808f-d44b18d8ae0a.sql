ALTER TABLE public.resume_versions
  ADD COLUMN IF NOT EXISTS encrypted_resume_payload text,
  ADD COLUMN IF NOT EXISTS encrypted_job_description text;

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS encrypted_job_description text;

ALTER TABLE public.interview_preps
  ADD COLUMN IF NOT EXISTS encrypted_job_description text;

ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS result_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS result_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS ai_generation_requests_result_expiry_idx
  ON public.ai_generation_requests (result_expires_at)
  WHERE result IS NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_job_application_resume_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.resume_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.resume_versions WHERE id = NEW.resume_version_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Referenced resume version must belong to the application owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_job_application_resume_owner ON public.job_applications;
CREATE TRIGGER validate_job_application_resume_owner
BEFORE INSERT OR UPDATE OF user_id, resume_version_id ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.validate_job_application_resume_owner();

CREATE OR REPLACE FUNCTION public.validate_interview_prep_application_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.application_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.job_applications WHERE id = NEW.application_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Referenced application must belong to the interview preparation owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_interview_prep_application_owner ON public.interview_preps;
CREATE TRIGGER validate_interview_prep_application_owner
BEFORE INSERT OR UPDATE OF user_id, application_id ON public.interview_preps
FOR EACH ROW EXECUTE FUNCTION public.validate_interview_prep_application_owner();

CREATE TABLE IF NOT EXISTS public.contact_submission_limits (
  key_hash text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  window_count integer NOT NULL DEFAULT 0,
  day_started_on date NOT NULL DEFAULT CURRENT_DATE,
  day_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.contact_submission_limits TO service_role;
ALTER TABLE public.contact_submission_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_contact_submission(
  _key_hash text, _window_seconds integer, _window_limit integer, _daily_limit integer
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.contact_submission_limits%ROWTYPE;
BEGIN
  IF length(_key_hash) <> 64 OR _window_seconds < 60 OR _window_limit < 1 OR _daily_limit < 1 THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_key_hash, 0));
  INSERT INTO public.contact_submission_limits (key_hash, window_count, day_count)
  VALUES (_key_hash, 0, 0) ON CONFLICT (key_hash) DO NOTHING;
  SELECT * INTO v_row FROM public.contact_submission_limits WHERE key_hash = _key_hash FOR UPDATE;
  IF v_row.window_started_at < now() - make_interval(secs => _window_seconds) THEN
    v_row.window_started_at := now(); v_row.window_count := 0;
  END IF;
  IF v_row.day_started_on < CURRENT_DATE THEN v_row.day_started_on := CURRENT_DATE; v_row.day_count := 0; END IF;
  IF v_row.window_count >= _window_limit OR v_row.day_count >= _daily_limit THEN RETURN false; END IF;
  UPDATE public.contact_submission_limits
     SET window_started_at = v_row.window_started_at,
         window_count = v_row.window_count + 1,
         day_started_on = v_row.day_started_on,
         day_count = v_row.day_count + 1,
         updated_at = now()
   WHERE key_hash = _key_hash;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_contact_submission(text, integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_contact_submission(text, integer, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.clear_expired_ai_results(_retention_days integer)
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count bigint;
BEGIN
  IF _retention_days < 1 THEN RAISE EXCEPTION 'Retention period must be positive'; END IF;
  UPDATE public.ai_generation_requests
     SET result = NULL, result_deleted_at = now()
   WHERE result IS NOT NULL AND status = 'SUCCESS'
     AND completed_at < now() - make_interval(days => _retention_days);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.clear_expired_ai_results(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_expired_ai_results(integer) TO service_role;

ALTER TABLE public.payments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.delete_user_account(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  UPDATE public.contact_messages SET user_id = NULL WHERE user_id = _user_id;
  UPDATE public.subscriptions SET user_id = NULL WHERE user_id = _user_id;
  UPDATE public.payments SET user_id = NULL WHERE user_id = _user_id;
  UPDATE public.transactions SET user_id = NULL WHERE user_id = _user_id;
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO service_role;

COMMENT ON COLUMN public.app_users.daily_usage_count IS 'DEPRECATED: authoritative AI usage is stored in ai_generation_requests';
COMMENT ON COLUMN public.app_users.last_reset_date IS 'DEPRECATED: authoritative AI usage resets by IST usage_date in ai_generation_requests';
COMMENT ON COLUMN public.app_users.subscription_expires_at IS 'DEPRECATED: active entitlements are stored in subscriptions';
COMMENT ON TABLE public.transactions IS 'DEPRECATED compatibility table; current payment history uses payments and subscriptions';
COMMENT ON FUNCTION public.consume_daily_quota(uuid, integer) IS 'DEPRECATED compatibility function; use start_ai_generation';
COMMENT ON FUNCTION public.has_active_subscription(uuid) IS 'DEPRECATED compatibility function; current access logic uses subscriptions through server authorization';