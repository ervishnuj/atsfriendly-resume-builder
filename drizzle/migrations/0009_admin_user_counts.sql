CREATE OR REPLACE FUNCTION public.admin_user_counts(_since timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM auth.users),
    'new', (SELECT count(*) FROM auth.users WHERE created_at >= _since));
$$;
REVOKE ALL ON FUNCTION public.admin_user_counts(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_counts(timestamptz) TO service_role;