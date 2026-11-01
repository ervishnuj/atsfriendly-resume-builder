ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$func$;

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  business_name text NOT NULL,
  contact_person text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('coaching_centre','browsing_centre','xerox_printing','job_consultancy','training_institute','other')),
  partner_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  daily_credit_limit integer NOT NULL DEFAULT 30 CHECK (daily_credit_limit > 0),
  selling_price numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage partners" ON public.partners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Partners read own row" ON public.partners FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER partners_updated BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.partner_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  price_inr numeric(10,2) NOT NULL CHECK (price_inr >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_packages TO authenticated;
GRANT ALL ON public.partner_packages TO service_role;
ALTER TABLE public.partner_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage packages" ON public.partner_packages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Authenticated read active packages" ON public.partner_packages FOR SELECT TO authenticated
  USING (active = true);
CREATE TRIGGER partner_packages_updated BEFORE UPDATE ON public.partner_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.partner_package_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.partner_packages(id) ON DELETE CASCADE,
  price_inr numeric(10,2) NOT NULL CHECK (price_inr >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, package_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_package_prices TO authenticated;
GRANT ALL ON public.partner_package_prices TO service_role;
ALTER TABLE public.partner_package_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage negotiated prices" ON public.partner_package_prices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Partners read own prices" ON public.partner_package_prices FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE TABLE public.partner_credit_wallets (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased integer NOT NULL DEFAULT 0,
  lifetime_consumed integer NOT NULL DEFAULT 0,
  avg_cost_per_credit numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_credit_wallets TO authenticated;
GRANT ALL ON public.partner_credit_wallets TO service_role;
ALTER TABLE public.partner_credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read wallets" ON public.partner_credit_wallets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Partners read own wallet" ON public.partner_credit_wallets FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE TABLE public.partner_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('purchase','consumption','release','adjustment')),
  credits integer NOT NULL,
  amount_inr numeric(10,2),
  idempotency_key text,
  sale_id uuid,
  invoice_id uuid,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, idempotency_key, kind)
);
GRANT SELECT ON public.partner_credit_transactions TO authenticated;
GRANT ALL ON public.partner_credit_transactions TO service_role;
ALTER TABLE public.partner_credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read transactions" ON public.partner_credit_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Partners read own transactions" ON public.partner_credit_transactions FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE TABLE public.partner_daily_usage (
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  PRIMARY KEY (partner_id, usage_date)
);
GRANT SELECT ON public.partner_daily_usage TO authenticated;
GRANT ALL ON public.partner_daily_usage TO service_role;
ALTER TABLE public.partner_daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read daily usage" ON public.partner_daily_usage FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Partners read own daily usage" ON public.partner_daily_usage FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE TABLE public.partner_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  client_request_id text NOT NULL UNIQUE,
  selling_price numeric(10,2) NOT NULL,
  wholesale_cost numeric(10,2) NOT NULL,
  gross_margin numeric(10,2) NOT NULL,
  owner_share numeric(10,2) NOT NULL,
  attribution_source text NOT NULL DEFAULT 'partner_code',
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','released')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_sales TO authenticated;
GRANT ALL ON public.partner_sales TO service_role;
ALTER TABLE public.partner_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sales" ON public.partner_sales FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Partners read own sales" ON public.partner_sales FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE TABLE public.partner_commission_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.partner_sales(id) ON DELETE CASCADE,
  owner_share numeric(10,2) NOT NULL,
  share_percent numeric(5,2) NOT NULL,
  settlement_month date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','settled','voided')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_id)
);
GRANT SELECT, UPDATE ON public.partner_commission_ledger TO authenticated;
GRANT ALL ON public.partner_commission_ledger TO service_role;
ALTER TABLE public.partner_commission_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read commissions" ON public.partner_commission_ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update commissions" ON public.partner_commission_ledger FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Partners read own commissions" ON public.partner_commission_ledger FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE SEQUENCE public.partner_invoice_number_seq START 1;
GRANT USAGE ON SEQUENCE public.partner_invoice_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.partner_invoice_number_seq TO service_role;

CREATE TABLE public.partner_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.partner_packages(id) ON DELETE SET NULL,
  package_name text NOT NULL,
  credits integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','cancelled')),
  payment_reference text,
  idempotency_key text UNIQUE,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.partner_invoices TO authenticated;
GRANT ALL ON public.partner_invoices TO service_role;
ALTER TABLE public.partner_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read invoices" ON public.partner_invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update invoices" ON public.partner_invoices FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Partners read own invoices" ON public.partner_invoices FOR SELECT TO authenticated
  USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE TABLE public.business_tax_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  gst_registered boolean NOT NULL DEFAULT false,
  gstin text,
  gst_collection_enabled boolean NOT NULL DEFAULT false,
  business_name text NOT NULL DEFAULT 'TheResumeRocket',
  business_contact text NOT NULL DEFAULT '',
  business_address text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.business_tax_settings TO authenticated;
GRANT ALL ON public.business_tax_settings TO service_role;
ALTER TABLE public.business_tax_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read tax settings" ON public.business_tax_settings FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admins update tax settings" ON public.business_tax_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER business_tax_settings_updated BEFORE UPDATE ON public.business_tax_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.partner_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  owner_share_percent numeric(5,2) NOT NULL DEFAULT 10 CHECK (owner_share_percent >= 0 AND owner_share_percent <= 100),
  min_selling_price numeric(10,2) NOT NULL DEFAULT 39,
  max_selling_price numeric(10,2) NOT NULL DEFAULT 99,
  estimated_generation_cost numeric(10,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partner_settings TO authenticated;
GRANT ALL ON public.partner_settings TO service_role;
ALTER TABLE public.partner_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read partner settings" ON public.partner_settings FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Admins update partner settings" ON public.partner_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER partner_settings_updated BEFORE UPDATE ON public.partner_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.partner_consume_credit(_partner_id uuid, _request_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_partner public.partners%ROWTYPE;
  v_wallet public.partner_credit_wallets%ROWTYPE;
  v_today date;
  v_used integer;
  v_existing public.partner_credit_transactions%ROWTYPE;
  v_share_pct numeric(5,2);
  v_margin numeric(10,2);
  v_share numeric(10,2);
  v_sale_id uuid;
BEGIN
  IF _request_id IS NULL OR length(_request_id) < 8 OR length(_request_id) > 120 THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'INVALID_REQUEST');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_partner_id::text, 7));
  v_today := (now() AT TIME ZONE 'Asia/Kolkata')::date;

  SELECT * INTO v_existing FROM public.partner_credit_transactions
   WHERE partner_id = _partner_id AND idempotency_key = _request_id AND kind = 'consumption';
  IF FOUND THEN
    RETURN jsonb_build_object('allowed', true, 'code', 'DUPLICATE', 'saleId', v_existing.sale_id);
  END IF;

  SELECT * INTO v_partner FROM public.partners WHERE id = _partner_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'NOT_FOUND');
  END IF;
  IF v_partner.status <> 'active' THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'PARTNER_INACTIVE');
  END IF;
  IF v_partner.selling_price IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'PRICE_NOT_SET');
  END IF;

  SELECT * INTO v_wallet FROM public.partner_credit_wallets WHERE partner_id = _partner_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < 1 THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'NO_CREDITS');
  END IF;

  INSERT INTO public.partner_daily_usage (partner_id, usage_date, used)
  VALUES (_partner_id, v_today, 0)
  ON CONFLICT (partner_id, usage_date) DO NOTHING;
  SELECT used INTO v_used FROM public.partner_daily_usage
   WHERE partner_id = _partner_id AND usage_date = v_today FOR UPDATE;
  IF v_used >= v_partner.daily_credit_limit THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'DAILY_LIMIT_REACHED',
      'limit', v_partner.daily_credit_limit, 'used', v_used, 'remaining', 0);
  END IF;

  SELECT owner_share_percent INTO v_share_pct FROM public.partner_settings WHERE id = true;
  v_share_pct := COALESCE(v_share_pct, 10);
  v_margin := v_partner.selling_price - v_wallet.avg_cost_per_credit;
  v_share := round(v_margin * v_share_pct / 100, 2);

  INSERT INTO public.partner_sales (partner_id, client_request_id, selling_price, wholesale_cost, gross_margin, owner_share)
  VALUES (_partner_id, _request_id, v_partner.selling_price, v_wallet.avg_cost_per_credit, v_margin, v_share)
  RETURNING id INTO v_sale_id;

  INSERT INTO public.partner_credit_transactions (partner_id, kind, credits, idempotency_key, sale_id)
  VALUES (_partner_id, 'consumption', -1, _request_id, v_sale_id);

  UPDATE public.partner_credit_wallets
     SET balance = balance - 1,
         lifetime_consumed = lifetime_consumed + 1,
         updated_at = now()
   WHERE partner_id = _partner_id;

  UPDATE public.partner_daily_usage
     SET used = used + 1
   WHERE partner_id = _partner_id AND usage_date = v_today;

  INSERT INTO public.partner_commission_ledger (partner_id, sale_id, owner_share, share_percent, settlement_month)
  VALUES (_partner_id, v_sale_id, v_share, v_share_pct, date_trunc('month', v_today)::date);

  RETURN jsonb_build_object('allowed', true, 'code', 'OK', 'saleId', v_sale_id,
    'limit', v_partner.daily_credit_limit, 'used', v_used + 1,
    'remaining', v_partner.daily_credit_limit - v_used - 1,
    'balance', v_wallet.balance - 1);
END;
$func$;

CREATE OR REPLACE FUNCTION public.partner_release_credit(_partner_id uuid, _request_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_txn public.partner_credit_transactions%ROWTYPE;
  v_today date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(_partner_id::text, 7));
  v_today := (now() AT TIME ZONE 'Asia/Kolkata')::date;

  SELECT * INTO v_txn FROM public.partner_credit_transactions
   WHERE partner_id = _partner_id AND idempotency_key = _request_id AND kind = 'consumption';
  IF NOT FOUND THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.partner_credit_transactions
              WHERE partner_id = _partner_id AND idempotency_key = _request_id AND kind = 'release') THEN
    RETURN true;
  END IF;

  INSERT INTO public.partner_credit_transactions (partner_id, kind, credits, idempotency_key, sale_id)
  VALUES (_partner_id, 'release', 1, _request_id, v_txn.sale_id);

  UPDATE public.partner_credit_wallets
     SET balance = balance + 1,
         lifetime_consumed = greatest(lifetime_consumed - 1, 0),
         updated_at = now()
   WHERE partner_id = _partner_id;

  UPDATE public.partner_daily_usage
     SET used = greatest(used - 1, 0)
   WHERE partner_id = _partner_id AND usage_date = v_today;

  UPDATE public.partner_sales SET status = 'released' WHERE id = v_txn.sale_id;
  UPDATE public.partner_commission_ledger SET status = 'voided' WHERE sale_id = v_txn.sale_id;

  RETURN true;
END;
$func$;

CREATE OR REPLACE FUNCTION public.partner_record_purchase(_partner_id uuid, _package_id uuid, _payment_reference text, _idempotency_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
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
$func$;

CREATE OR REPLACE FUNCTION public.partner_verify_invoice(_invoice_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  v_invoice public.partner_invoices%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can verify partner invoices';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(_invoice_id::text, 9));

  SELECT * INTO v_invoice FROM public.partner_invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND OR v_invoice.payment_status <> 'pending' THEN
    RETURN false;
  END IF;

  UPDATE public.partner_invoices
     SET payment_status = 'paid', paid_at = now()
   WHERE id = _invoice_id;

  INSERT INTO public.partner_credit_wallets (partner_id, balance, lifetime_purchased, avg_cost_per_credit)
  VALUES (v_invoice.partner_id, v_invoice.credits, v_invoice.credits, v_invoice.unit_price)
  ON CONFLICT (partner_id) DO UPDATE
    SET balance = public.partner_credit_wallets.balance + v_invoice.credits,
        lifetime_purchased = public.partner_credit_wallets.lifetime_purchased + v_invoice.credits,
        avg_cost_per_credit = v_invoice.unit_price,
        updated_at = now();

  INSERT INTO public.partner_credit_transactions (partner_id, kind, credits, amount_inr, idempotency_key, invoice_id)
  VALUES (v_invoice.partner_id, 'purchase', v_invoice.credits, v_invoice.total, 'invoice:' || _invoice_id::text, _invoice_id)
  ON CONFLICT (partner_id, idempotency_key, kind) DO NOTHING;

  RETURN true;
END;
$func$;

CREATE OR REPLACE FUNCTION public.get_partner_usage(_partner_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $func$
  SELECT jsonb_build_object(
    'used', COALESCE((SELECT used FROM public.partner_daily_usage
              WHERE partner_id = _partner_id
                AND usage_date = (now() AT TIME ZONE 'Asia/Kolkata')::date), 0),
    'limit', (SELECT daily_credit_limit FROM public.partners WHERE id = _partner_id),
    'balance', COALESCE((SELECT balance FROM public.partner_credit_wallets WHERE partner_id = _partner_id), 0)
  );
$func$;