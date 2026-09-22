CREATE OR REPLACE FUNCTION public.start_ai_generation(_user_id uuid, _request_id text, _kind text, _limit integer, _cooldown_seconds integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  UPDATE public.ai_generation_requests
     SET status = 'FAILED', completed_at = now()
   WHERE user_id = _user_id AND status = 'IN_PROGRESS'
     AND created_at < now() - interval '5 minutes';

  SELECT * INTO v_existing
    FROM public.ai_generation_requests
   WHERE user_id = _user_id AND request_id = _request_id;

  IF FOUND THEN
    IF v_existing.status = 'SUCCESS' AND v_existing.result IS NOT NULL THEN
      RETURN jsonb_build_object('allowed', false, 'code', 'DUPLICATE_RESULT',
        'result', v_existing.result, 'resetAt', v_reset);
    ELSIF v_existing.status = 'SUCCESS' AND v_existing.result IS NULL THEN
      UPDATE public.ai_generation_requests
         SET request_id = left(_request_id, 80) || ':deleted:' || id::text
       WHERE id = v_existing.id;
    ELSIF v_existing.status = 'IN_PROGRESS' THEN
      RETURN jsonb_build_object('allowed', false, 'code', 'DUPLICATE_IN_FLIGHT', 'resetAt', v_reset);
    END IF;
  END IF;

  SELECT count(*) INTO v_used
    FROM public.ai_generation_requests
   WHERE user_id = _user_id AND kind = _kind AND usage_date = v_today
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
        completed_at = NULL, result = NULL, result_deleted_at = NULL, result_expires_at = NULL;

  RETURN jsonb_build_object('allowed', true, 'code', 'OK', 'limit', _limit,
    'used', v_used + 1, 'remaining', greatest(_limit - v_used - 1, 0), 'resetAt', v_reset);
END;
$function$;