# Pedals Hub · Recover · Reuse · Prevent

Working prototype for **Project Pedals – Reviving Campus Cycles** (Sahyog 2026-27, Mid Prep): an operations dashboard for the hostel office, Pedals volunteers and a partner mechanic, plus a mobile-first student web app. Both run on the same records.

> **Demo data.** The app starts with **22 synthetic fixture cycles**, labelled “DEMO DATA · not the field audit” on every screen. The audit workbook supplied so far (`ProjectPedals_Audit.xlsx`) is the empty template, so no real audit figures are shown anywhere. Import the filled sheet at **/admin/import** to switch to field data (see `docs/DATA_IMPORT.md`).

Visual design: Claude Design canvas *Pedals Hub Dashboard* (admin overview, cycle review, claims desk, student home, listing detail). The app implements that design.

## Run it

Requires Node 20+ (tested on Node 22).

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. The database file `data/db.json` is created and seeded on first request.

| URL | What |
| --- | --- |
| `/` | Demo launcher with the five scenarios |
| `/admin` | Operations Centre (desktop, tested at 1440 and 1920 px wide) |
| `/app` | Student web app (mobile-first, tested at 375–390 px) |
| `/app/c/PP-0342` | What a QR tag opens (public: ID, bay, status only) |

Other commands:

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run build && npm start
```

### Demo roles (no real login)

* **Admin area:** top-right selector switches between *Admin · hostel office*, *Auditor · Pedals volunteer* and *Mechanic · partner shop*. The server enforces every permission: only admin can clear, decide claims, approve listings, record sales or authorise dismantling.
* **Student app:** top bar switches the demo student: `S-21` returning owner, `S-14` claimant, `S-33` graduating owner, `S-40` budget buyer.
* **Reset:** *Policy settings → Reset demo data*. This regenerates all 22 fixtures with dates relative to now, so recordings can be repeated. Deleting `data/db.json` does the same.

## What works (real, persisted, validated server-side)

**Recover**
* Inventory with search, filters (grade, ownership, listing, needs-action), sort and CSV export.
* Cycle record with permanent QR, the six audit signals, 2-day re-check, a notice that opens the proposed 7-day window, mid-way reminder log and a timeline of every state change.
* Claims desk: notice / claim / dispute / awaiting-clearance board, evidence comparison, approve / ask for more / dispute / reject, each with a logged note. A claim pauses any listing or salvage automatically. A second claimant turns a claim into a dispute.
* **Clearance gate:** when the window ends the cycle moves to *awaiting clearance*, never to sale or scrap. Only an admin decision (approve / hold / deny, with a reason) unlocks disposal.

**Reuse**
* Technical review: A–D grade, fault checklist, itemised repairs from the rate card (R), V, S, safety veto, and a live R/V meter. Exactly 40% passes; a missing V means *needs review* (no NaN). An unsafe frame blocks listing whatever the ratio.
* Marketplace: draft → admin approval → live → student reservation (with mechanic choice) → handover + numbered receipt. Cycle price S is always shown apart from the regular quote Rm and the indicative partner quote Rp. Pedals never charges for repairs.
* Repairs & partners: editable rate card with source and *confirmed / unverified* status. The ~20% discount stays labelled *proposed* until confirmed. Also a referral log and an indicative buyer saving.
* Salvage: route → admin authorisation → parts ledger (brakes and frame/fork can only go to recycling) → residual awaiting recycler → close with evidence. Recycler marked *pending partner confirmation*.

**Prevent**
* Student registration issues one permanent QR (self-report is labelled as not a mechanic check).
* Semester self-check (about a minute) updates last-verified and the adoption %. Non-response goes to a follow-up queue, never to forfeiture.
* Graduation exit: donate or sell offer → owner verified → desk handover scheduled → received with custody receipt → cycle cleared by voluntary handover, then graded like any other.
* Impact & reports: due-process, reuse and adoption KPIs, recorded money (demo), cost lines, full audit log + CSV.
* Printable QR tags and a semester QR standee (`/admin/tags`).

**Data**
* Import of the team audit sheet (.xlsx *Audit* tab or CSV): preview, de-duplication by Tag No., per-row issues (missing tag, unknown grade, a hostel name in the spot text) and a commit that **replaces** the demo fixtures, so the two are never mixed.

## Simulated or planned, not real

| Item | Status |
| --- | --- |
| Authentication / IITG SSO | Simulated demo roles only |
| Notices, reminders, SMS/WhatsApp/email | Logged only, nothing is sent |
| Payments | None. Reservations and receipts are records, not transactions |
| Photo upload | Placeholder (audit photo links are kept as text) |
| Camera QR scanning | Works where the browser supports `BarcodeDetector`; manual ID entry always works |
| OneStop / registration / hostel-clearance integration | Future work, needs approval |
| Recycler partnership, scrap value, CO₂ | Not claimed |

## Layout

```
app/
  admin/…            Operations Centre pages (overview, inventory, cycles/[id], claims, review,
                     marketplace, repairs, salvage, semester, exit, impact, tags, import, settings, export)
  app/…              Student web app (home, scan, c/[id], claim, register, cycles, semester, exit, my-cycle)
  actions.ts         Server actions (role from cookie → domain op → audit log → redirect + flash)
lib/
  types.ts           Domain model: ownership, grade, listing and salvage are separate fields
  rules.ts           Pure policy: R/V viability, routing, blockers, notice maths
  ops.ts             Every state transition, validated with zod, role-checked, logged
  metrics.ts         All dashboard numbers, derived from records
  seed.ts            Synthetic fixtures (scenarios A–E)
  importer.ts        Audit-sheet import
  store.ts           JSON-file persistence with serialised writes
components/          UI kit, review editor, listing card, QR
tests/               Vitest: policy rules, scenarios, importer (incl. the real template)
docs/                DEMO_SCRIPT, OPERATOR_SOP, DATA_IMPORT, ASSUMPTIONS
```

Stack: Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · zod · qrcode · lucide-react · read-excel-file · Vitest. The SQLite option in the brief was replaced by a single JSON file (`data/db.json`): zero native dependencies on Windows, readable, and reset by deleting it.

## Still needed from the team

1. The filled ~160-row audit sheet, plus confirmation that its spot text is safe to show (no hostel names).
2. Written repair quotes (campus shop + one more) and, if any, a signed partner discount.
3. The institute's clearance policy: notice length, signatory, custody and fund rules.
4. A recycling partner.
5. Real photos for the deck, with anonymity checked.
6. Timing data from the pilot (self-check duration, staff minutes per cycle).

## Competition integrity

* No hostel name, emblem or identifier appears in the code, fixtures or screenshots. Locations are neutral (“North Parking Zone · Bay A”).
* Record the bonus demo video as a **genuine screen capture** of this running app (see `docs/DEMO_SCRIPT.md`). AI-generated video is penalised by the PS.
