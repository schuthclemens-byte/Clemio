ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS audio_transcript text,
  ADD COLUMN IF NOT EXISTS audio_transcript_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS audio_transcript_language text,
  ADD COLUMN IF NOT EXISTS audio_transcript_provider text DEFAULT 'self_hosted_faster_whisper',
  ADD COLUMN IF NOT EXISTS audio_transcript_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS audio_duration_seconds integer;

CREATE OR REPLACE FUNCTION public.validate_audio_transcript_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.audio_transcript_status IS NULL THEN
    NEW.audio_transcript_status := 'none';
  END IF;
  IF NEW.audio_transcript_status NOT IN ('none','processing','completed','failed') THEN
    RAISE EXCEPTION 'invalid audio_transcript_status: %', NEW.audio_transcript_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_audio_transcript_status ON public.messages;
CREATE TRIGGER trg_validate_audio_transcript_status
BEFORE INSERT OR UPDATE OF audio_transcript_status ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.validate_audio_transcript_status();