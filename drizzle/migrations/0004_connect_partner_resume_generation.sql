CREATE OR REPLACE FUNCTION public.start_partner_resume_generation(_user_id uuid, _partner_id uuid, _request_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.partners%ROWTYPE; r jsonb; available integer; held integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || ':RESUME', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(_partner_id::text, 7));
  SELECT * INTO p FROM public.partners WHERE id = _partner_id AND user_id = _user_id;
  IF NOT FOUND OR p.status <> 'active' THEN RETURN jsonb_build_object('allowed', false, 'code', 'PARTNER_INACTIVE'); END IF;
  IF p.selling_price IS NULL THEN RETURN jsonb_build_object('allowed', false, 'code', 'PRICE_NOT_SET'); END IF;
  r := public.start_ai_generation(_user_id, _request_id, 'RESUME', p.daily_credit_limit, 30);
  IF NOT COALESCE((r->>'allowed')::boolean, false) THEN RETURN r; END IF;
  SELECT COALESCE(balance, 0) INTO available FROM public.partner_credit_wallets WHERE partner_id = _partner_id FOR UPDATE;
  SELECT count(*) INTO held FROM public.ai_generation_requests WHERE user_id = _user_id AND kind = 'RESUME' AND status = 'IN_PROGRESS';
  IF COALESCE(available, 0) < held THEN
    PERFORM public.finish_ai_generation(_user_id, _request_id, false, NULL);
    RETURN jsonb_build_object('allowed', false, 'code', 'NO_CREDITS');
  END IF;
  RETURN r || jsonb_build_object('balance', available, 'availableCredits', available - held);
END;
$$;
REVOKE ALL ON FUNCTION public.start_partner_resume_generation(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_partner_resume_generation(uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.finish_partner_resume_generation(_user_id uuid, _partner_id uuid, _request_id text, _success boolean, _result jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE req public.ai_generation_requests%ROWTYPE; charged jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text || ':RESUME', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(_partner_id::text, 7));
  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = _partner_id AND user_id = _user_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PARTNER_INACTIVE');
  END IF;
  SELECT * INTO req FROM public.ai_generation_requests WHERE user_id = _user_id AND request_id = _request_id AND kind = 'RESUME' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'code', 'INVALID_REQUEST'); END IF;
  IF req.status = 'SUCCESS' THEN RETURN jsonb_build_object('ok', true, 'code', 'DUPLICATE'); END IF;
  IF NOT _success THEN
    IF req.status = 'IN_PROGRESS' THEN PERFORM public.finish_ai_generation(_user_id, _request_id, false, NULL); END IF;
    RETURN jsonb_build_object('ok', true, 'code', 'RELEASED');
  END IF;
  IF req.status <> 'IN_PROGRESS' OR req.created_at < now() - interval '5 minutes' OR _result IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'RESERVATION_EXPIRED');
  END IF;
  charged := public.partner_consume_credit(_partner_id, _request_id);
  IF NOT COALESCE((charged->>'allowed')::boolean, false) THEN
    PERFORM public.finish_ai_generation(_user_id, _request_id, false, NULL);
    RETURN charged || jsonb_build_object('ok', false);
  END IF;
  PERFORM public.finish_ai_generation(_user_id, _request_id, true, _result);
  RETURN charged || jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.finish_partner_resume_generation(uuid, uuid, text, boolean, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_partner_resume_generation(uuid, uuid, text, boolean, jsonb) TO service_role;
COMMENT ON FUNCTION public.start_partner_resume_generation(uuid, uuid, text) IS 'Reserves prepaid availability through existing in-progress AI rows; no money moves before success. Uses existing 30-second cooldown and five-minute stale recovery.';
COMMENT ON FUNCTION public.finish_partner_resume_generation(uuid, uuid, text, boolean, jsonb) IS 'Atomically charges exactly one partner credit and stores a successful resume. Failures release reservations without creating sales or commission entries.';