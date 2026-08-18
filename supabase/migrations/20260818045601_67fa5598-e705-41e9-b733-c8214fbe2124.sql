CREATE TABLE IF NOT EXISTS public.ai_generation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_id text NOT NULL,
  kind text NOT NULL DEFAULT 'RESUME',
  status text NOT NULL DEFAULT 'IN_PROGRESS',
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS ai_generation_requests_daily_idx
  ON public.ai_generation_requests (user_id, kind, usage_date, status);

GRANT SELECT ON public.ai_generation_requests TO authenticated;
GRANT ALL ON public.ai_generation_requests TO service_role;

ALTER TABLE public.ai_generation_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI generation requests" ON public.ai_generation_requests;
CREATE POLICY "Users can view their own AI generation requests"
  ON public.ai_generation_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.start_ai_generation(
  _user_id uuid,
  _request_id text,
  _kind text,
  _limit integer,
  _cooldown_seconds integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date;
  v_reset timestamptz;
  v_used integer;
  v_existing public.ai_generation_requests%ROWTYPE;
  v_last timestamptz;
  v_wait integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || ':' || _kind, 0));

  v_today := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  v_reset := ((v_today + 1)::timestamp) AT TIME ZONE 'Asia/Kolkata';

  -- Release slots held by requests that never reported back.
  UPDATE public.ai_generation_requests
     SET status = 'FAILED', completed_at = now()
   WHERE user_id = _user_id
     AND status = 'IN_PROGRESS'
     AND created_at < now() - interval '5 minutes';

  SELECT * INTO v_existing
    FROM public.ai_generation_requests
   WHERE user_id = _user_id AND request_id = _request_id;

  IF FOUND THEN
    IF v_existing.status = 'SUCCESS' THEN
      RETURN jsonb_build_object('allowed', false, 'code', 'DUPLICATE_RESULT',
        'result', v_existing.result, 'resetAt', v_reset);
    ELSIF v_existing.status = 'IN_PROGRESS' THEN
      RETURN jsonb_build_object('allowed', false, 'code', 'DUPLICATE_IN_FLIGHT', 'resetAt', v_reset);
    END IF;
  END IF;

  SELECT count(*) INTO v_used
    FROM public.ai_generation_requests
   WHERE user_id = _user_id
     AND kind = _kind
     AND usage_date = v_today
     AND status IN ('IN_PROGRESS', 'SUCCESS');

  IF v_used >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'DAILY_LIMIT_REACHED',
      'limit', _limit, 'used', v_used, 'remaining', 0, 'resetAt', v_reset);
  END IF;

  SELECT max(created_at) INTO v_last
    FROM public.ai_generation_requests
   WHERE user_id = _user_id AND kind = _kind;

  IF v_last IS NOT NULL AND _cooldown_seconds > 0
     AND now() - v_last < make_interval(secs => _cooldown_seconds) THEN
    v_wait := ceil(_cooldown_seconds - extract(epoch FROM (now() - v_last)))::int;
    RETURN jsonb_build_object('allowed', false, 'code', 'RATE_LIMITED',
      'retryAfterSeconds', greatest(v_wait, 1), 'limit', _limit, 'used', v_used,
      'remaining', greatest(_limit - v_used, 0), 'resetAt', v_reset);
  END IF;

  INSERT INTO public.ai_generation_requests (user_id, request_id, kind, status, usage_date)
  VALUES (_user_id, _request_id, _kind, 'IN_PROGRESS', v_today)
  ON CONFLICT (user_id, request_id) DO UPDATE
    SET status = 'IN_PROGRESS', usage_date = v_today, created_at = now(),
        completed_at = NULL, result = NULL;

  RETURN jsonb_build_object('allowed', true, 'code', 'OK', 'limit', _limit,
    'used', v_used + 1, 'remaining', greatest(_limit - v_used - 1, 0), 'resetAt', v_reset);
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_ai_generation(
  _user_id uuid,
  _request_id text,
  _success boolean,
  _result jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ai_generation_requests
     SET status = CASE WHEN _success THEN 'SUCCESS' ELSE 'FAILED' END,
         result = CASE WHEN _success THEN _result ELSE NULL END,
         completed_at = now()
   WHERE user_id = _user_id AND request_id = _request_id;
$$;

CREATE OR REPLACE FUNCTION public.get_ai_usage(_user_id uuid, _kind text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'used', (SELECT count(*) FROM public.ai_generation_requests
              WHERE user_id = _user_id AND kind = _kind
                AND usage_date = (now() AT TIME ZONE 'Asia/Kolkata')::date
                AND status IN ('IN_PROGRESS','SUCCESS')),
    'resetAt', ((((now() AT TIME ZONE 'Asia/Kolkata')::date + 1)::timestamp) AT TIME ZONE 'Asia/Kolkata')
  );
$$;

REVOKE ALL ON FUNCTION public.start_ai_generation(uuid, text, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_ai_generation(uuid, text, boolean, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_ai_usage(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_ai_generation(uuid, text, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_ai_generation(uuid, text, boolean, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_ai_usage(uuid, text) TO service_role;