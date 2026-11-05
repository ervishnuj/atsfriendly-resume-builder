REVOKE EXECUTE ON FUNCTION public.partner_consume_credit(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_release_credit(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_record_purchase(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_partner_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_consume_credit(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.partner_release_credit(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.partner_record_purchase(uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_partner_usage(uuid) TO authenticated, service_role;