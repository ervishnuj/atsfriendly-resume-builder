GRANT ALL ON public.analytics_events TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON public.app_error_log TO service_role;