-- Remove overly permissive SELECT policy on tts-cache bucket
DROP POLICY IF EXISTS "Authenticated users can download cached TTS audio" ON storage.objects;