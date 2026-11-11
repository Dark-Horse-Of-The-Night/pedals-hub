# Importing the field audit

Source: the team workbook `ProjectPedals_Audit.xlsx`, tab **Audit** (headers on row 4). A CSV export of that tab works too.

## Steps

1. Fill one row per cycle. Use the sheet's dropdowns, keep the “e.g.” row and blank numbered rows as they are (they are skipped).
2. Admin role → **Import audit sheet** → choose the file → **Read & preview**. Nothing is saved yet.
3. Check the preview:
   * **Duplicate tag:** the same Tag No. appears twice; only the first row is imported.
   * **Missing Tag No. / Missing spot.**
   * **Unknown grade:** grades must be Ride-ready, Minor repair, Major repair or Scrap.
   * **Spot mentions a hostel (anonymity):** edit the sheet and re-upload.
4. **Commit.** This replaces the demo fixtures entirely. Synthetic and field records are never mixed. To return to the demo, use *Reset demo data*.

## Mapping

| Sheet column | Pedals Hub field |
| --- | --- |
| Tag No. (`T001`) | Cycle ID `PP-0001` (prefix from settings) + tag no. kept |
| Spot / bay | Spot; text before the first comma becomes the bay |
| Date + Time | Inspected at |
| Auditor | Auditor initials |
| Photo Drive link | Photo link (kept as text) |
| Lock, Rust, Dust, Blocked in, Hostel sticker | Abandonment signals |
| Main fault / parts missing | Faults list |
| Grade | Ride-ready → A, Minor repair → B, Major repair → C, Scrap → D |
| Moved? (Y/N) | Y → ownership *In use*; otherwise *Flagged* (a suspicion, not abandonment) |
| Tag still there? (Y/N) | Re-check result |
| Notes | Notes |

After import, every cycle starts at *Flagged* or *In use*. Notices, claims, clearance, prices and listings start empty: nothing is assumed beyond what the sheet records. Audit-derived counts (grade split, top faults) then appear on the overview and in the CSV export, ready for slide 2.
