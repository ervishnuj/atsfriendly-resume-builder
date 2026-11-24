CREATE OR REPLACE FUNCTION public.partner_record_purchase(_partner_id uuid, _package_id uuid, _payment_reference text, _idempotency_key text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_package public.partner_packages%ROWTYPE;
  v_price numeric(10,2);
  v_invoice_id uuid;
  v_number text;
  v_existing public.partner_invoices%ROWTYPE;
BEGIN
  IF _idempotency_key IS NULL OR length(_idempotency_key) < 8 OR length(_idempotency_key) > 120 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_REQUEST');
  END IF;

  SELECT * INTO v_existing FROM public.partner_invoices WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN
    IF v_existing.partner_id <> _partner_id THEN
      RETURN jsonb_build_object('ok', false, 'code', 'INVALID_REQUEST');
    END IF;
    RETURN jsonb_build_object('ok', true, 'code', 'DUPLICATE', 'invoiceId', v_existing.id, 'invoiceNumber', v_existing.invoice_number);
  END IF;

  SELECT * INTO v_package FROM public.partner_packages WHERE id = _package_id AND active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PACKAGE_NOT_FOUND');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = _partner_id AND status = 'active') THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PARTNER_INACTIVE');
  END IF;

  SELECT p.price_inr INTO v_price FROM public.partner_package_prices p
   WHERE p.partner_id = _partner_id AND p.package_id = _package_id;
  v_price := COALESCE(v_price, v_package.price_inr);

  v_number := 'INV-' || lpad(nextval('public.partner_invoice_number_seq')::text, 6, '0');

  INSERT INTO public.partner_invoices (invoice_number, partner_id, package_id, package_name, credits, unit_price, subtotal, total, payment_reference, idempotency_key)
  VALUES (v_number, _partner_id, _package_id, v_package.name, v_package.credits, round(v_price / v_package.credits, 2), v_price, v_price, _payment_reference, _idempotency_key)
  RETURNING id INTO v_invoice_id;

  RETURN jsonb_build_object('ok', true, 'code', 'OK', 'invoiceId', v_invoice_id, 'invoiceNumber', v_number, 'total', v_price);
END;
$function$;