ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;
ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_status_check CHECK (status IN (
  'SAVED','RESUME_GENERATED','READY_TO_APPLY','APPLIED','ASSESSMENT','INTERVIEW','INTERVIEW_SCHEDULED','INTERVIEW_COMPLETED','TECHNICAL_ROUND','HR_ROUND','OFFER','REJECTED','WITHDRAWN','NO_RESPONSE'));

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_platform text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS client_request_id text;

CREATE UNIQUE INDEX IF NOT EXISTS job_applications_user_request_uidx
  ON public.job_applications (user_id, client_request_id) WHERE client_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.track_job_application_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.status_history := jsonb_build_array(jsonb_build_object('status', NEW.status, 'at', now()));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_history := COALESCE(OLD.status_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('status', NEW.status, 'at', now()));
  ELSE
    NEW.status_history := OLD.status_history;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_job_application_status ON public.job_applications;
CREATE TRIGGER track_job_application_status
BEFORE INSERT OR UPDATE ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.track_job_application_status();