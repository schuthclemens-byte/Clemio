

## Fix: TTS-Audio sofort bereit beim Seitenaufruf

### Problem
Die TTS-Version wird zwar im Hintergrund geladen, aber wenn der Nutzer tippt bevor sie fertig ist, wird die deutsche Fallback-MP3 abgespielt — auch wenn das Handy auf Englisch steht.

### Lösung: Globaler TTS-Cache auf Modulebene

Die TTS-Audiodatei wird **sofort beim Laden der Seite** (Modulebene, nicht erst beim Mount) gefetcht. Da die Edge Function ~1-2 Sekunden braucht und der Nutzer die Seite erst sehen, lesen und den Tap-Overlay verarbeiten muss, ist das Audio in 99% der Fälle bereits fertig wenn der Nutzer interagiert.

**Ablauf:**
1. Beim Modulimport: Sprache aus `navigator.language` lesen und TTS sofort fetchen (globaler Cache)
2. Wenn Komponente mountet: Prüfen ob Cache für aktuelle Sprache schon gefüllt ist
3. Beim Abspielen: Cache nutzen wenn vorhanden, sonst deutsche MP3 als Fallback

### Technische Änderungen

| Datei | Änderung |
|---|---|
| `src/components/landing/HeroSection.tsx` | Globalen `Map<string, HTMLAudioElement>` Cache anlegen. TTS-Fetch **sofort auf Modulebene** starten (liest `navigator.language`). `fetchOnboardingAudio()` prüft Cache zuerst. Kein Warten, kein Spinner — was da ist wird gespielt. Wenn TTS rechtzeitig fertig → richtige Sprache. Wenn nicht → deutscher Fallback (besser als nichts). Bei Sprachwechsel im I18n-Context: neuen Fetch starten falls nicht im Cache. |

Kein Warten, kein Loading-State, keine Verzögerung. Die TTS wird einfach so früh wie möglich im Hintergrund vorbereitet.

