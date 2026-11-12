ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'OPEN';
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS admin_note text;
ALTER TABLE public.contact_messages ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_status_check CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED'));
CREATE INDEX IF NOT EXISTS contact_messages_status_created_idx ON public.contact_messages (status, created_at DESC);

CREATE TABLE public.app_error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  service text NOT NULL,
  code text,
  request_id text,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.app_error_log TO authenticated;
GRANT ALL ON public.app_error_log TO service_role;
ALTER TABLE public.app_error_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read error log" ON public.app_error_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update error log" ON public.app_error_log FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX app_error_log_created_idx ON public.app_error_log (created_at DESC);
CREATE INDEX analytics_events_event_created_idx ON public.analytics_events (event, created_at DESC);