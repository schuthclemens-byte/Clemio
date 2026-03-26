
CREATE TABLE public.contact_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_user_id uuid NOT NULL,
  first_name text,
  last_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, contact_user_id)
);

ALTER TABLE public.contact_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own aliases"
  ON public.contact_aliases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own aliases"
  ON public.contact_aliases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own aliases"
  ON public.contact_aliases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own aliases"
  ON public.contact_aliases FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
