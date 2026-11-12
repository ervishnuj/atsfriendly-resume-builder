CREATE INDEX IF NOT EXISTS resume_versions_user_created_idx ON public.resume_versions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS job_applications_user_updated_idx ON public.job_applications (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS interview_preps_user_created_idx ON public.interview_preps (user_id, created_at DESC);