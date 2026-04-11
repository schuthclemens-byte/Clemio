

## Fehlende Übersetzungen für die Landingpage

### Problem
Die Landing-Seiten-Texte (Hero, Promo, Positioning, Trust, Voice Rules, Premium, Age) sind nur in **Deutsch** und **Englisch** vorhanden. Für **Französisch, Türkisch, Arabisch und Spanisch** fehlen ~30 Keys — der Fallback zeigt dann die deutschen Texte an, obwohl das Handy z.B. auf Französisch oder Türkisch steht.

### Lösung
Die fehlenden Landing-Keys in allen 4 Sprachdateien ergänzen.

### Fehlende Keys (pro Sprache ~30 Einträge)

```
heroListenTitle, heroDemoText, heroAutoPlay, tapToStart, heroSubtitleNew, heroCTA,
promoHeadline, promoDesc, promoFeat1-4, promoCTA,
posLine1, posLine2,
trustTitle, trustPoint1-4,
voiceRulesTitle, voiceRule1-4,
premTitle, premFeat1-4, premPrice, premExtra,
ageText, ageCheckbox,
startTitle, startDemoText, startSubtitle, startCTA
```

### Änderungen

| Datei | Änderung |
|---|---|
| `src/i18n/fr.ts` | ~30 fehlende `landing.*` Keys auf Französisch ergänzen |
| `src/i18n/tr.ts` | ~30 fehlende `landing.*` Keys auf Türkisch ergänzen |
| `src/i18n/ar.ts` | ~30 fehlende `landing.*` Keys auf Arabisch ergänzen |
| `src/i18n/es.ts` | ~30 fehlende `landing.*` Keys auf Spanisch ergänzen |

Keine DB-Änderungen. Keine Edge-Function-Änderungen.

