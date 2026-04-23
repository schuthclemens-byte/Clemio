

## Beschreibungstext für „Hoher Kontrast" korrigieren

### Das Problem
Der Beschreibungstext lautet aktuell „Stärkere Farben für mehr Klarheit" — das stimmt nicht mehr. Der überarbeitete High-Contrast-Modus macht Farben **dunkler/satter** (nicht leuchtender), fügt **schwarze Borders**, dickere Trennlinien und stärkeren Text-Kontrast hinzu. Der Text verspricht das Falsche.

### Was geändert wird
Nur die `highContrastDesc`-Zeile in den 6 Sprachdateien (`de`, `en`, `es`, `fr`, `tr`, `ar`). Keine Logik, kein CSS, keine Komponenten.

### Neue Texte

| Sprache | Neu |
|---|---|
| DE | „Klarere Kanten und kräftigerer Text für bessere Lesbarkeit" |
| EN | „Sharper edges and bolder text for easier reading" |
| ES | „Bordes más nítidos y texto más marcado para leer mejor" |
| FR | „Bords plus nets et texte plus marqué pour mieux lire" |
| TR | „Daha net kenarlar ve belirgin yazı, daha rahat okuma" |
| AR | „حواف أوضح ونصّ أبرز لقراءة أسهل" |

### Warum so formuliert
Beschreibt **was wirklich passiert**: schärfere Kanten (Borders + Divider), kräftigerer Text (höherer Schwarz-Anteil), Ziel = bessere Lesbarkeit. Keine Lüge mehr über „stärkere Farben".

### Nicht geändert
Label „Hoher Kontrast" bleibt — der ist korrekt. Auch CSS und Logik unverändert.

### STATUS
- Umfang: 6 Zeilen in 6 Dateien.
- Risiko: null.
- i18n-Sync: bleibt 6/6.

