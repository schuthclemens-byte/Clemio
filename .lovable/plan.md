

# Clemio-KI auf kostenlosen Google Gemini API-Key umstellen

## Schritte

### 1. API-Key als Secret speichern
- `GEMINI_API_KEY` über das Secret-Tool hinzufügen
- Der User gibt seinen Key ein

### 2. Edge Function `clemio-ki/index.ts` anpassen
Nur der API-Aufruf ändert sich:

- **Alt:** `https://ai.gateway.lovable.dev/v1/chat/completions` mit `LOVABLE_API_KEY`
- **Neu:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=GEMINI_API_KEY`
- Request-Body an Google-Format anpassen (`contents` statt `messages`, `systemInstruction` statt `system`-Role)
- Response-Parsing anpassen (`candidates[0].content.parts[0].text` statt `choices[0].message.content`)

### Was gleich bleibt
- Alle Prompts, Modi (Standard/Strategie/Refine)
- Usage-Tracking und Tageslimits
- Auth-Check und Premium-Logik
- Frontend — keine Änderung nötig

### Betroffene Datei
- `supabase/functions/clemio-ki/index.ts`

