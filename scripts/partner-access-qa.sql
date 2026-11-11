-- Run as a privileged test connection. All fixtures are rolled back.
-- No auth users, roles, permissions, payments, or AI requests are changed.
BEGIN;
INSERT INTO public.partners (id,user_id,business_name,email,partner_code,status) VALUES
 ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','QA isolation A','qa-isolation-a@example.invalid','QA-ISOLATION-A','active'),
 ('a0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','QA isolation B','qa-isolation-b@example.invalid','QA-ISOLATION-B','active'),
 ('a0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000003','QA isolation suspended','qa-isolation-s@example.invalid','QA-ISOLATION-S','suspended');
INSERT INTO public.partner_packages(id,name,credits,price_inr,active) VALUES
 ('c0000000-0000-4000-8000-000000000001','QA isolation package',30,750,false);
INSERT INTO public.partner_credit_wallets(partner_id,balance) SELECT id,17 FROM public.partners WHERE partner_code LIKE 'QA-ISOLATION-%';
INSERT INTO public.partner_daily_usage(partner_id,usage_date,used) SELECT id,current_date,2 FROM public.partners WHERE partner_code LIKE 'QA-ISOLATION-%';
INSERT INTO public.partner_credit_transactions(partner_id,kind,credits,note) SELECT id,'adjustment',17,'QA isolation only' FROM public.partners WHERE partner_code LIKE 'QA-ISOLATION-%';
INSERT INTO public.partner_package_prices(partner_id,package_id,price_inr) SELECT id,'c0000000-0000-4000-8000-000000000001',700 FROM public.partners WHERE partner_code LIKE 'QA-ISOLATION-%';
INSERT INTO public.partner_invoices(partner_id,invoice_number,package_name,credits,unit_price,subtotal,total) SELECT id,partner_code,'QA isolation package',30,25,750,750 FROM public.partners WHERE partner_code LIKE 'QA-ISOLATION-%';
INSERT INTO public.partner_sales(partner_id,client_request_id,selling_price,wholesale_cost,gross_margin,owner_share) SELECT id,partner_code,39,25,14,1.4 FROM public.partners WHERE partner_code LIKE 'QA-ISOLATION-%';
INSERT INTO public.partner_commission_ledger(partner_id,sale_id,owner_share,share_percent,settlement_month) SELECT partner_id,id,1.4,10,date_trunc('month',current_date)::date FROM public.partner_sales WHERE client_request_id LIKE 'QA-ISOLATION-%';
SET LOCAL ROLE authenticated;
DO $$
DECLARE identity_number integer; table_name text; visible_count integer; foreign_count integer; expected integer; own_partner uuid;
BEGIN
 FOR identity_number IN 1..4 LOOP
  PERFORM set_config('request.jwt.claim.sub','b0000000-0000-4000-8000-' || lpad(identity_number::text,12,'0'),true);
  PERFORM set_config('request.jwt.claims',json_build_object('sub','b0000000-0000-4000-8000-' || lpad(identity_number::text,12,'0'),'role','authenticated')::text,true);
  own_partner := ('a0000000-0000-4000-8000-' || lpad(identity_number::text,12,'0'))::uuid;
  expected := CASE WHEN identity_number IN (1,2) THEN 1 ELSE 0 END;
  FOREACH table_name IN ARRAY ARRAY['partner_credit_wallets','partner_daily_usage','partner_invoices','partner_credit_transactions','partner_sales','partner_package_prices','partner_commission_ledger'] LOOP
   EXECUTE format('SELECT count(*), count(*) FILTER (WHERE partner_id <> $1) FROM public.%I',table_name) INTO visible_count,foreign_count USING own_partner;
   IF visible_count <> expected OR foreign_count <> 0 THEN
    RAISE EXCEPTION 'Isolation failed: identity %, table %, visible %, foreign %, expected %',identity_number,table_name,visible_count,foreign_count,expected;
   END IF;
  END LOOP;
  IF has_function_privilege(current_user,'public.get_partner_usage(uuid)','EXECUTE') THEN
   RAISE EXCEPTION 'Authenticated identity can invoke privileged usage function';
  END IF;
  BEGIN
   PERFORM public.get_partner_usage('a0000000-0000-4000-8000-000000000002');
   RAISE EXCEPTION 'Usage RPC was not denied';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
 END LOOP;
 RAISE NOTICE 'PASS: 28 live RLS isolation checks and 4 direct usage RPC denials';
END $$;
RESET ROLE;
ROLLBACK;