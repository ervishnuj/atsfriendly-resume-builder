CREATE TABLE public.learning_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  job_title text NOT NULL DEFAULT '',
  skill text NOT NULL,
  priority text NOT NULL DEFAULT 'Medium',
  why text NOT NULL DEFAULT '',
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_plans_skill_len CHECK (char_length(skill) BETWEEN 1 AND 120),
  CONSTRAINT learning_plans_milestones_array CHECK (jsonb_typeof(milestones) = 'array')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_plans TO authenticated;
GRANT ALL ON public.learning_plans TO service_role;
ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own learning plans" ON public.learning_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX learning_plans_user_skill ON public.learning_plans (user_id, lower(skill));
CREATE TRIGGER learning_plans_updated_at BEFORE UPDATE ON public.learning_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();