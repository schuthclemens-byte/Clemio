

## Fix: Voice Profile Status Logic

### Problem
On `/voice-recordings`, Step 3 "Fertig – deine Stimme ist aktiv" is always rendered with active/highlighted styling, even when no voice exists. The step list is inside the `!myVoice` branch, so it always shows — creating a contradiction with the header that correctly says "Noch keine Stimme eingerichtet".

### Root Cause
Line 221 in `VoiceRecordingsPage.tsx` hardcodes `highlight: true` for the third step. There is no backend check — it's a static UI value.

### Plan

**1. VoiceRecordingsPage.tsx — also load `profiles.voice_path`**
- Add a `voicePath` state derived from `profiles.voice_path` query
- Define: `const isVoiceConfigured = Boolean(myVoice) || Boolean(voicePath);`
- Use `isVoiceConfigured` for:
  - **Header subtitle**: "Aktiv und bereit" vs "Noch keine Stimme eingerichtet"
  - **Step 3 highlight**: `highlight: isVoiceConfigured` instead of `highlight: true`
  - Step 3 styling when not configured: grey background, muted text, no Sparkles icon
  - **CTA button**: only show "Jetzt einrichten" when `!isVoiceConfigured`
- When voice exists (`isVoiceConfigured === true`), show the existing voice card (already works via `myVoice`)

**2. Step 3 conditional styling**
- When `isVoiceConfigured === false`: render with `bg-muted/50 border-border/30 opacity-60`, step badge in grey, no Sparkles
- When `isVoiceConfigured === true`: keep current gradient/highlight styling

**3. ProfilePage.tsx — already correct**
- Profile page already uses `voicePath` and `hasVoice` from backend. No changes needed — it's already consistent.

**4. After successful setup callback**
- In `onCloned` callback: reload data (`loadData()`) which re-fetches `voice_profiles` and `profiles.voice_path`, automatically updating `isVoiceConfigured`

### Files Changed
- `src/pages/VoiceRecordingsPage.tsx` — add `voicePath` fetch, make Step 3 highlight conditional

