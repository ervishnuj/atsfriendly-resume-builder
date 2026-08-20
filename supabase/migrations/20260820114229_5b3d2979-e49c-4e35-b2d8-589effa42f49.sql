CREATE TABLE IF NOT EXISTS public.resume_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resume_templates_user_id_idx ON public.resume_templates(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_templates TO authenticated;
GRANT ALL ON public.resume_templates TO service_role;

ALTER TABLE public.resume_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own resume templates" ON public.resume_templates;
CREATE POLICY "Users manage their own resume templates"
  ON public.resume_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_resume_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_resume_templates_updated_at ON public.resume_templates;
CREATE TRIGGER update_resume_templates_updated_at
  BEFORE UPDATE ON public.resume_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_resume_templates_updated_at();