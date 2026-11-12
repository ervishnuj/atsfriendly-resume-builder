-- Two-account (A/B) user data isolation check. All fixtures are rolled back.
BEGIN;
INSERT INTO auth.users (id, aud, role, email, instance_id) VALUES
 ('d0000000-0000-4000-8000-00000000000a','authenticated','authenticated','qa-user-a@example.invalid','00000000-0000-0000-0000-000000000000'),
 ('d0000000-0000-4000-8000-00000000000b','authenticated','authenticated','qa-user-b@example.invalid','00000000-0000-0000-0000-000000000000')
 ON CONFLICT DO NOTHING;
SET LOCAL ROLE authenticated;


DO $$
DECLARE a uuid := 'd0000000-0000-4000-8000-00000000000a'; b uuid := 'd0000000-0000-4000-8000-00000000000b';
 rv_a uuid; rv_b uuid; ja uuid; lp uuid; ip uuid; n int; t text; checks int := 0;
BEGIN
 -- User A creates records
 PERFORM set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
 INSERT INTO public.profiles(user_id) VALUES (a) ON CONFLICT (user_id) DO NOTHING;
 INSERT INTO public.resume_versions(user_id,company,job_title,job_description,template_id,version,resume_json) VALUES (a,'QA','QA','QA','classic',1,'{}') RETURNING id INTO rv_a;
 INSERT INTO public.job_applications(user_id,company,job_title,job_description,job_url,location,salary,status,notes,resume_version_id) VALUES (a,'QA','QA','','','','','APPLIED','',rv_a) RETURNING id INTO ja;
 INSERT INTO public.learning_plans(user_id,job_title,skill,priority,why,milestones) VALUES (a,'QA','qa-skill','high','qa','[]') RETURNING id INTO lp;
 INSERT INTO public.interview_preps(user_id,job_title,job_description,prep_json) VALUES (a,'QA','QA','{}') RETURNING id INTO ip;

 -- Second profile for same user must be impossible
 BEGIN INSERT INTO public.profiles(user_id) VALUES (a); RAISE EXCEPTION 'FAIL duplicate profile';
 EXCEPTION WHEN unique_violation THEN checks := checks+1; END;

 -- User B
 PERFORM set_config('request.jwt.claims', json_build_object('sub',b,'role','authenticated')::text, true);
 FOREACH t IN ARRAY ARRAY['profiles','resume_versions','job_applications','learning_plans','interview_preps','ai_generation_requests','payments','subscriptions','transactions','free_entitlements','app_users','resume_templates','analytics_events'] LOOP
  EXECUTE format('SELECT count(*) FROM public.%I WHERE user_id = $1', t) INTO n USING a;
  IF t = 'app_users' THEN EXECUTE 'SELECT count(*) FROM public.app_users WHERE id=$1' INTO n USING a; END IF;
  IF n <> 0 THEN RAISE EXCEPTION 'FAIL B reads A in %', t; END IF; checks := checks+1;
 END LOOP;
 UPDATE public.resume_versions SET company='hacked' WHERE id=rv_a; GET DIAGNOSTICS n = ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL B updates A resume'; END IF; checks:=checks+1;
 DELETE FROM public.job_applications WHERE id=ja; GET DIAGNOSTICS n = ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL B deletes A app'; END IF; checks:=checks+1;
 UPDATE public.learning_plans SET why='x' WHERE id=lp; GET DIAGNOSTICS n = ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL B updates A plan'; END IF; checks:=checks+1;
 DELETE FROM public.interview_preps WHERE id=ip; GET DIAGNOSTICS n = ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL B deletes A prep'; END IF; checks:=checks+1;
 UPDATE public.profiles SET encrypted_skills='x' WHERE user_id=a; GET DIAGNOSTICS n = ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'FAIL B updates A profile'; END IF; checks:=checks+1;
 BEGIN INSERT INTO public.resume_versions(user_id,company,job_title,job_description,template_id,version,resume_json) VALUES (a,'QA','QA','QA','classic',1,'{}'); RAISE EXCEPTION 'FAIL B inserts as A';
 EXCEPTION WHEN insufficient_privilege THEN checks:=checks+1; END;
 BEGIN INSERT INTO public.payments(user_id,plan_id,provider,amount,currency,payment_method,status) SELECT b,id,'upi',1,'INR','upi','SUCCESS' FROM public.subscription_plans LIMIT 1; RAISE EXCEPTION 'FAIL B self-verifies payment';
 EXCEPTION WHEN insufficient_privilege OR check_violation THEN checks:=checks+1; END;
 BEGIN INSERT INTO public.subscriptions(user_id,plan_id,start_date,end_date,status) SELECT b,id,now(),now()+interval '30 days','ACTIVE' FROM public.subscription_plans LIMIT 1; RAISE EXCEPTION 'FAIL B grants subscription';
 EXCEPTION WHEN insufficient_privilege THEN checks:=checks+1; END;
 -- B creates own resume, then tries to move it to A or link to A's application
 INSERT INTO public.resume_versions(user_id,company,job_title,job_description,template_id,version,resume_json) VALUES (b,'QA','QA','QA','classic',1,'{}') RETURNING id INTO rv_b; checks:=checks+1;
 BEGIN UPDATE public.resume_versions SET user_id=a WHERE id=rv_b; RAISE EXCEPTION 'FAIL B transfers ownership';
 EXCEPTION WHEN insufficient_privilege THEN checks:=checks+1; END;
 BEGIN INSERT INTO public.job_applications(user_id,company,job_title,job_description,job_url,location,salary,status,notes,resume_version_id) VALUES (b,'QA','QA','','','','','APPLIED','',rv_a); RAISE EXCEPTION 'FAIL B links A resume';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE 'FAIL%' THEN RAISE; END IF; checks:=checks+1; END;

 -- A's data unchanged
 PERFORM set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
 SELECT count(*) INTO n FROM public.resume_versions WHERE user_id=a AND company='QA'; IF n<>1 THEN RAISE EXCEPTION 'FAIL A data changed'; END IF;
 SELECT count(*) INTO n FROM public.job_applications WHERE id=ja; IF n<>1 THEN RAISE EXCEPTION 'FAIL A app missing'; END IF;
 SELECT count(*) INTO n FROM public.resume_versions WHERE id=rv_b; IF n<>0 THEN RAISE EXCEPTION 'FAIL A reads B'; END IF;
 checks := checks+3;
 RAISE EXCEPTION 'PASS: % user isolation checks', checks;
END $$;
RESET ROLE;
ROLLBACK;
