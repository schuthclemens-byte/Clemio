
# Plan: Chat-Verwaltung & Medien-Teilen

## 1. Datenbank (Migration)

**Erweitere `conversations`-Tabelle:**
- Neue Spalte `deleted_at TIMESTAMPTZ NULL` (Soft-Delete = Papierkorb)
- Index auf `deleted_at` für schnelle Cron-Abfragen

**Auto-Löschung nach 30 Tagen:**
- Aktiviere `pg_cron` + `pg_net` Extensions
- Cron-Job (täglich 03:00 UTC): hart löscht alle Conversations mit `deleted_at < now() - interval '30 days'`
- Trigger löscht Storage-Dateien (Bilder/Audio aus dem `stimmen`-Bucket) per Edge Function

**Sicherheit:**
- RLS bleibt unverändert (nur Creator/Mitglied)
- Bestehende `is_archived` wird beibehalten

## 2. Chat-Liste (`ChatListPage.tsx`)

**Drei-Punkte-Menü oben rechts** (neben "+" Neuer Chat):
- 🗂️ Archivierte Chats (öffnet `/archived`)
- 🗑️ Papierkorb (öffnet `/trash`)
- ✓ Auswählen (aktiviert Mehrfachauswahl-Modus)

**Mehrfachauswahl-Modus:**
- Header wechselt: "X ausgewählt" + Aktionen (Archivieren / In Papierkorb / Alle abwählen / Schließen)
- Tap auf Chat = Auswahl statt Öffnen
- "Alle auswählen" Button im Header
- Checkboxen erscheinen links neben jedem Chat-Avatar

**Filter:** ChatListPage zeigt nur `is_archived = false AND deleted_at IS NULL`

## 3. Neue Seiten

**`/archived` — ArchivedChatsPage:**
- Liste aller `is_archived = true AND deleted_at IS NULL`
- Mehrfachauswahl (gleicher Modus)
- Aktionen: Wiederherstellen / In Papierkorb verschieben

**`/trash` — TrashPage:**
- Liste aller `deleted_at IS NOT NULL`
- Hinweis-Banner: "Wird in X Tagen automatisch gelöscht"
- Mehrfachauswahl
- Aktionen: Wiederherstellen / Endgültig löschen / **Papierkorb leeren**

## 4. Verhalten ändern

- **Swipe „Löschen"** → setzt `deleted_at = now()` (statt Hard-Delete)
- **Swipe „Archivieren"** → bleibt `is_archived = true`
- Toast mit "Rückgängig"-Button (10 Sekunden)

## 5. Medien teilen (Web Share API)

**In `MediaPreview.tsx` (Fullscreen-Viewer) + Audio/Video-Bubbles:**

Neuer Button neben „Download":
- 📤 Teilen-Icon (iOS/Android Standard)
- Nutzt `navigator.share({ files: [...] })` — öffnet das System-Share-Sheet (iOS „Teilen"-Symbol mit allen Apps, Android Share-Intent)
- Fallback wenn nicht unterstützt: nur Download (wie bisher)
- Funktioniert sowohl im Browser als auch in der Capacitor-App nativ

Wird auf Bilder, Videos und Sprachnachrichten angewendet.

## Technische Details

```text
ChatListPage Header:
┌──────────────────────────────┐
│ Chats              [+] [⋮]   │
└──────────────────────────────┘
                         │
                         ├─ Auswählen
                         ├─ Archivierte Chats
                         └─ Papierkorb

Mehrfachauswahl-Modus:
┌──────────────────────────────┐
│ [×] 3 ausgewählt   [📦] [🗑] │
└──────────────────────────────┘
```

**Web Share API Beispiel:**
```ts
const blob = await fetch(url).then(r => r.blob());
const file = new File([blob], 'clemio.jpg', { type: blob.type });
if (navigator.canShare?.({ files: [file] })) {
  await navigator.share({ files: [file] });
}
```

**Cron-Job SQL** (per Insert-Tool, nicht Migration):
```sql
SELECT cron.schedule('purge-trashed-chats', '0 3 * * *', $$
  DELETE FROM conversations WHERE deleted_at < now() - interval '30 days';
$$);
```

## Reihenfolge
1. Migration: `deleted_at` + Cron-Job
2. ChatListPage: 3-Punkte-Menü + Multi-Select
3. ArchivedChatsPage + TrashPage (Reuse von ChatListItem)
4. Swipe-Verhalten anpassen (Soft-Delete)
5. MediaPreview: Teilen-Button mit Web Share API
