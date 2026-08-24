CREATE TABLE public.resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company text NOT NULL DEFAULT '',
  job_title text NOT NULL DEFAULT '',
  job_description text NOT NULL DEFAULT '',
  ats_score integer,
  match_score integer,
  template_id text NOT NULL DEFAULT 'ats-classic',
  version integer NOT NULL DEFAULT 1,
  resume_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resume_versions_user_idx ON public.resume_versions(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_versions TO authenticated;
GRANT ALL ON public.resume_versions TO service_role;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own resume versions" ON public.resume_versions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company text NOT NULL DEFAULT '',
  job_title text NOT NULL DEFAULT '',
  job_description text NOT NULL DEFAULT '',
  applied_at date,
  resume_version_id uuid REFERENCES public.resume_versions(id) ON DELETE SET NULL,
  job_url text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  salary text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'SAVED' CHECK (status IN ('SAVED','APPLIED','ASSESSMENT','INTERVIEW','TECHNICAL_ROUND','HR_ROUND','OFFER','REJECTED','WITHDRAWN')),
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_applications_user_idx ON public.job_applications(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own applications" ON public.job_applications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.interview_preps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.job_applications(id) ON DELETE SET NULL,
  job_title text NOT NULL DEFAULT '',
  job_description text NOT NULL DEFAULT '',
  prep_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX interview_preps_user_idx ON public.interview_preps(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_preps TO authenticated;
GRANT ALL ON public.interview_preps TO service_role;
ALTER TABLE public.interview_preps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own interview preps" ON public.interview_preps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_user_idx ON public.analytics_events(user_id);
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users log their own events" ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read their own events" ON public.analytics_events FOR SELECT TO authenticated USING (auth.uid() = user_id);

UPDATE public.subscription_plans SET features = ARRAY[
  '1 job-specific resume',
  'Resume vs JD match analysis',
  'ATS score with transparent breakdown',
  'Skill & keyword gap analysis',
  'AI improvement suggestions',
  'PDF & DOCX download'
] WHERE plan_code = 'SINGLE_RESUME';

UPDATE public.subscription_plans SET features = ARRAY[
  'Multiple job-specific resumes',
  'Resume vs JD & ATS analysis',
  'Skill-gap analysis with learning plan',
  'AI improvement suggestions',
  'All templates + custom template builder',
  'Job application tracker',
  'Up to 10 AI generations per day'
] WHERE plan_code = 'JOB_PASS_7_DAYS';

UPDATE public.subscription_plans SET features = ARRAY[
  'Everything in 7-Day Job Pass',
  'Interview preparation questions',
  'LinkedIn profile optimization',
  'AI cover letters (short, professional, detailed)',
  'Learning roadmap with free resources',
  'Resume version history',
  'Up to 10 AI generations per day'
] WHERE plan_code = 'PRO_PASS_30_DAYS';