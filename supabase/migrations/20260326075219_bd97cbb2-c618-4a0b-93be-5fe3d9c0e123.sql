
ALTER TABLE public.profiles
  ADD COLUMN first_name text,
  ADD COLUMN last_name text;

-- Migrate existing display_name into first_name
UPDATE public.profiles
SET first_name = split_part(display_name, ' ', 1),
    last_name = CASE
      WHEN position(' ' in display_name) > 0
      THEN substring(display_name from position(' ' in display_name) + 1)
      ELSE NULL
    END
WHERE display_name IS NOT NULL;
