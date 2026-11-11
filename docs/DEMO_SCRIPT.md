# Pedals Hub: 2:30 demo walkthrough

**Story in one line:** a cycle is found → its owner gets a fair chance → only an admin can clear it → it's priced honestly and resold → owners keep it from happening again.

Record the **real running app** with normal screen-recording software (OBS, `Win+Alt+R`, macOS `Cmd+Shift+5`) and a real team member's voice. No AI video, avatars or AI voices: the PS deducts 50% for that.

---

## Before you hit record (5 minutes)

1. Run `npm run dev` and open Chrome.
2. **Tab 1, admin:** `localhost:3000/admin`, full screen (`F11`), zoom 100%. Role = *Admin · hostel office*.
3. **Tab 2, student:** `localhost:3000/app`, with DevTools device toolbar on (*iPhone 12 Pro*), so it looks like a phone. Switch tabs with `Ctrl+Tab`.
4. **Policy settings → Reset demo data** (click OK). Do this before every take.
5. Copy this to the clipboard (you'll paste it in scene 3): `Key verified at hostel desk; marks match audit photo.`
6. Two clicks open an **OK** confirm box: *Approve claim* and *Approve clearance*. Just click OK.
7. Rehearse once without recording. Talk while you click; don't wait for pages.

---

## Outline (7 scenes)

| # | Time | Theme | Screen | Key point the jury must hear |
| --- | --- | --- | --- | --- |
| 1 | 0:00–0:15 | Hook | Admin overview | Real ~160 audit; this is labelled demo data; live counts + action queue |
| 2 | 0:15–0:30 | Identify | Student: tag page | One permanent QR, no app download, owner privacy |
| 3 | 0:30–0:50 | Verify | Admin: claims desk | A claim pauses sale; officer approves → owner gets it back |
| 4 | 0:50–1:20 | Clear + grade | Admin: PP-0118 | Day 7 ≠ forfeiture; written clearance; 40% R/V rule + safety veto |
| 5 | 1:20–1:45 | Reuse | Marketplace → student buys | Pay Pedals for the cycle only; repairs are the buyer's choice |
| 6 | 1:45–2:10 | Prevent | Student: semester check + exit | 1-minute re-check; no reply = follow-up; graduation donate/sell |
| 7 | 2:10–2:30 | Close | Admin overview | Everything updated + logged; Recover · Reuse · Prevent |

---

## Full script (clicks + what to say)

### Scene 1 · Hook (0:00–0:15) · Tab 1, `/admin`
**Do:** Point the cursor at the DEMO pill, then the five numbers, then *Needs action now*.

> “This is Pedals Hub, the system behind Project Pedals. Our team audited about 160 cycles on foot; what you see here is clearly labelled demo data. Every number is counted live from the records, and this queue tells the hostel office exactly what needs a decision today.”

### Scene 2 · Identify (0:15–0:30) · Tab 2, student app
**Do:** Top bar → pick **S-14 · Claimant**. Type `0342` in the box → **Open**.

> “Every cycle gets one permanent QR tag. Scanning it opens a web page, with no app download. It shows only the ID, bay and status, never the owner. This cycle was flagged, and this student has claimed it with a photo and the lock key.”

### Scene 3 · Verify ownership (0:30–0:50) · Tab 1
**Do:** Sidebar **Claims & clearance** → PP-0342 is open on the right → paste the note → **Approve claim · return to owner** → OK.

> “In the claims desk the officer compares the claim with our audit record. A claim automatically pauses any sale. Approve, and the cycle goes back to its owner and out of every disposal queue.”

### Scene 4 · Clear and grade (0:50–1:20) · Tab 1
**Do:** **Overview** → in *Needs action* click **Decide** on PP-0118. Point at the red banner → **Approve clearance** → OK. Scroll down to the R/V meter.

> “PP-0118's seven-day notice ended with no claim. That alone does nothing: only a written admin clearance unlocks it. Now the mechanic's grading: Grade B, three itemised repairs. ₹800 of repairs against ₹2,500 after repair is 32%, under our proposed 40% line, and the frame is safe, so it can be listed. A cycle at 50% goes to salvage instead, and a cracked frame is blocked whatever the numbers say.”

### Scene 5 · Reuse (1:20–1:45)
**Do (Tab 1):** **Move to draft listing** → sidebar **Marketplace** → **Approve & publish**.
**Do (Tab 2):** Top bar → **S-40 · Budget buyer** → **Buy a cycle** → **PP-0118** → **Reserve for ₹700**.

> “Listings need admin approval. The buyer pays Pedals only ₹700, for the cycle. Repairs are their choice: ₹800 at any mechanic or ₹640 at our partner shop, whose discount is still a proposal. Reserve, and the hostel desk hands it over with a receipt.”

### Scene 6 · Prevent (1:45–2:10) · Tab 2
**Do:** Top bar → **S-21** → yellow **Verify** card → **Confirm**. Top bar → **S-33** → **Leaving IITG?** → **Send to hostel office**.

> “Now prevention. After every break, owners confirm their cycle in under a minute with the same tag; no reply means a follow-up, never removal. And graduating students can donate or sell before check-out instead of leaving the bike behind.”

### Scene 7 · Close (2:10–2:30) · Tab 1
**Do:** Click **Overview**. Point at the changed numbers, the semester % and the graduation offer.

> “Back on the dashboard, every action has updated the counts, and each step is timestamped in the audit log. Recover, reuse, prevent: one routine the hostel office can actually run.”

---

## If you run long
Cut in this order:
1. In scene 4, drop the sentence about 50% and the cracked frame.
2. In scene 6, drop the graduation offer. Keep the semester check.
3. In scene 2, skip the student tab and say the line over the claims desk.

## Words to avoid
* “We found 160 abandoned bikes.” Say **audited about 160**.
* “The app sells bikes after 7 days.” Say **after written clearance**.
* “Our partner gives 20% off.” Say **proposed ~20%**.
* Never say or show a hostel name.

## Screenshots for the deck (after a fresh reset)
* Admin overview: `/admin`
* Cycle review + clearance: `/admin/cycles/PP-0118`
* Slide 7 student screens (390 px wide): `/app/scan`, `/app/register`, `/app/c/PP-0215`, `/app/semester` as S-21
* Listing: `/app/cycles/PP-0410` (₹800 / ₹500 / ₹400, same as the deck example)

Label each one “Prototype · illustrative data”.
