
CREATE TABLE public.clemio_ki_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.clemio_ki_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage"
ON public.clemio_ki_usage FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
ON public.clemio_ki_usage FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_clemio_ki_usage_user_date ON public.clemio_ki_usage (user_id, used_at);
