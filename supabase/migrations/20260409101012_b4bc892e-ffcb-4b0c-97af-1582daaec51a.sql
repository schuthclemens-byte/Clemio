-- Unique index for voice_consents to prevent duplicate requests at DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_voice_consents_pair 
ON public.voice_consents (voice_owner_id, granted_to_user_id);