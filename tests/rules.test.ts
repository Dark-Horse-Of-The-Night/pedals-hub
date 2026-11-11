import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/lib/seed';
import { viability, technicalRoute, listingBlockers, partnerQuote, noticeProgress } from '@/lib/rules';
import * as ops from '@/lib/ops';
import type { Actor, Db } from '@/lib/types';
import { overview } from '@/lib/metrics';

const admin: Actor = { role: 'admin', name: 'Hostel office', studentId: null };
const auditor: Actor = { role: 'auditor', name: 'Volunteer V-02', studentId: null };
const student = (id: string): Actor => ({ role: 'student', name: 'Student ' + id, studentId: id });
const fresh = (): Db => buildSeed(Date.UTC(2026, 10, 11, 6, 0));
const cyc = (db: Db, id: string) => db.cycles.find((c) => c.id === id)!;

describe('40% viability rule', () => {
  it('R=800, V=2000 is exactly 40% and passes', () => {
    const v = viability(800, 2000, 40);
    expect(v.kind).toBe('ELIGIBLE');
    expect(v.pct).toBe(40);
  });
  it('R=900, V=2000 is 45% and fails', () => {
    const v = viability(900, 2000, 40);
    expect(v.kind).toBe('NOT_VIABLE');
    expect(v.pct).toBe(45);
  });
  it('missing or zero V needs review, never NaN/Infinity', () => {
    expect(viability(500, 0, 40)).toMatchObject({ kind: 'NEEDS_REVIEW', pct: null });
    expect(viability(500, null, 40)).toMatchObject({ kind: 'NEEDS_REVIEW', pct: null });
    expect(viability(null, 2000, 40)).toMatchObject({ kind: 'NEEDS_REVIEW', pct: null });
  });
  it('scenario B: 800 / 2500 = 32% eligible; scenario C: 1500 / 3000 = 50% salvage', () => {
    const db = fresh();
    expect(technicalRoute(cyc(db, 'PP-0118'), db.settings)).toMatchObject({ route: 'LIST' });
    expect(technicalRoute(cyc(db, 'PP-0118'), db.settings).viability?.pct).toBe(32);
    expect(technicalRoute(cyc(db, 'PP-0207'), db.settings)).toMatchObject({ route: 'SALVAGE' });
  });
  it('unsafe frame is blocked from listing even at 30%', () => {
    const db = fresh();
    const c = cyc(db, 'PP-0130');
    expect(technicalRoute(c, db.settings).viability?.pct).toBe(30);
    expect(technicalRoute(c, db.settings).route).toBe('SALVAGE');
    expect(listingBlockers(c, db.claims, db.settings).join(' ')).toMatch(/Safety veto/);
  });
  it('partner quote is indicative 20% below regular and does not change R', () => {
    const db = fresh();
    const q = partnerQuote(cyc(db, 'PP-0410'), db.settings, db.rateCard)!;
    expect(q.rp).toBe(400);
    expect(q.confirmed).toBe(false);
  });
});

describe('ownership due process', () => {
  it('7-day expiry only moves to AWAITING_CLEARANCE, never CLEARED', () => {
    const db = fresh();
    const c = cyc(db, 'PP-0221');
    ops.sweepExpiredNotices(db, Date.parse(c.noticeDeadline!) + 1000);
    expect(c.ownershipStatus).toBe('AWAITING_CLEARANCE');
    expect(listingBlockers(c, db.claims, db.settings).length).toBeGreaterThan(0);
  });
  it('a claim pauses disposal; clearance is refused while it is open', () => {
    const db = fresh();
    ops.submitClaim(db, student('S-77'), { id: 'PP-0118', evidence: ['Earlier photo of the cycle'], description: 'Blue hybrid, mine' });
    expect(cyc(db, 'PP-0118').ownershipStatus).toBe('CLAIM_PENDING');
    expect(() => ops.decideClearance(db, admin, { id: 'PP-0118', decision: 'APPROVED', reason: 'no claim seen' })).toThrow(/claim is open/);
    expect(() => ops.draftListing(db, admin, { id: 'PP-0118' })).toThrow(/Cannot list/);
  });
  it('approved claim returns the cycle to its owner and blocks sale', () => {
    const db = fresh();
    const claimId = db.claims.find((c) => c.cycleId === 'PP-0342')!.id;
    ops.reviewClaim(db, admin, { claimId, decision: 'APPROVE', note: 'Key verified at desk' });
    const c = cyc(db, 'PP-0342');
    expect(c.ownershipStatus).toBe('OWNER_VERIFIED');
    expect(c.ownerId).toBe('S-14');
    expect(() => ops.draftListing(db, admin, { id: 'PP-0342' })).toThrow();
  });
  it('only admins can issue clearance', () => {
    const db = fresh();
    expect(() => ops.decideClearance(db, auditor, { id: 'PP-0118', decision: 'APPROVED', reason: 'looks abandoned' })).toThrow(/admin/);
    expect(() => ops.decideClearance(db, student('S-21'), { id: 'PP-0118', decision: 'APPROVED', reason: 'looks abandoned' })).toThrow(/admin/);
  });
  it('a second claimant turns a claim into a dispute', () => {
    const db = fresh();
    ops.submitClaim(db, student('S-99'), { id: 'PP-0342', evidence: ['Purchase bill / receipt'], description: 'Red MTB I bought' });
    expect(cyc(db, 'PP-0342').ownershipStatus).toBe('DISPUTED');
  });
});

describe('end-to-end scenario B: clear → list → reserve → sell', () => {
  it('works and updates counts', () => {
    const db = fresh();
    const before = overview(db).reusable.length;
    ops.decideClearance(db, admin, { id: 'PP-0118', decision: 'APPROVED', reason: 'No claim after notice + reminder' });
    expect(overview(db).reusable.length).toBe(before + 1);
    ops.draftListing(db, auditor, { id: 'PP-0118' });
    ops.approveListing(db, admin, { id: 'PP-0118' });
    ops.reserveListing(db, student('S-40'), { id: 'PP-0118', shop: 'partner' });
    const receipt = ops.recordSale(db, admin, { id: 'PP-0118' });
    const c = cyc(db, 'PP-0118');
    expect(c.ownershipStatus).toBe('TRANSFERRED');
    expect(c.ownerId).toBe('S-40');
    expect(receipt).toBe('PPR-0002');
    expect(db.listings.find((l) => l.cycleId === 'PP-0118')!.priceS).toBe(700); // cycle only, never S + repair
  });
});

describe('salvage and prevention', () => {
  it('scenario C routes to salvage; brakes cannot be transplanted', () => {
    const db = fresh();
    ops.markSalvageReview(db, auditor, { id: 'PP-0207' });
    ops.authoriseSalvage(db, admin, { id: 'PP-0207', reason: 'R/V 50% above cut-off' });
    ops.logSalvagePart(db, auditor, { id: 'PP-0207', part: 'Front wheel', condition: 'Good', quantity: 1, destination: 'Spares shelf' });
    expect(() => ops.logSalvagePart(db, auditor, { id: 'PP-0207', part: 'Brakes', condition: 'worn', quantity: 1, destination: 'Spares shelf' })).toThrow(/never transplanted/);
    expect(cyc(db, 'PP-0207').salvageStatus).toBe('PARTS_LOGGED');
  });
  it('semester self-check updates last-verified and the adoption %', () => {
    const db = fresh();
    const before = overview(db).semester.pct;
    ops.semesterConfirm(db, student('S-21'), { cycleId: 'PP-0602', stillOwned: true, locationChanged: false, newSpot: null, faults: [], wantsExit: false });
    expect(overview(db).semester.pct).toBeGreaterThan(before);
    expect(cyc(db, 'PP-0602').ownershipStatus).toBe('REGISTERED'); // non-response never forfeits; response keeps owner
  });
  it('graduation offer reaches the admin exit queue', () => {
    const db = fresh();
    ops.submitExit(db, student('S-33'), { cycleId: 'PP-0612', choice: 'DONATE', expectedPrice: null, handoverPref: 'Hostel desk' });
    expect(overview(db).exitsOpen.map((e) => e.cycleId)).toContain('PP-0612');
  });
  it('notice progress maths', () => {
    const p = noticeProgress({ noticeStart: '2026-11-01T09:00:00Z', noticeDeadline: '2026-11-08T09:00:00Z' }, Date.parse('2026-11-04T10:00:00Z'))!;
    expect(p.total).toBe(7);
    expect(p.day).toBe(4);
    expect(p.ended).toBe(false);
  });
});
