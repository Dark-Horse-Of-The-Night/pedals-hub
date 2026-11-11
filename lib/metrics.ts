// Every dashboard number is derived here from the same records. No pasted constants.
import type { Cycle, Db } from './types';
import { activeClaims, noticeProgress, repairCostR, technicalRoute } from './rules';
import type { Tone } from './labels';

export interface QueueItem {
  key: string;
  cycleId: string;
  tag: string;
  tone: Tone;
  title: string;
  detail: string;
  href: string;
  cta: string;
  priority: number;
}

const OWNER_KNOWN = ['REGISTERED', 'OWNER_VERIFIED', 'IN_USE'];

export function semesterStats(db: Db) {
  const term = db.settings.term;
  const invited = db.cycles.filter((c) => c.ownerId && OWNER_KNOWN.includes(c.ownershipStatus));
  const confirmedIds = new Set(db.confirmations.filter((x) => x.term === term && x.stillOwned).map((x) => x.cycleId));
  // A claim approval or new registration inside the window also counts as verified this term.
  for (const c of invited) if (c.lastVerified && Date.parse(c.lastVerified) >= Date.parse(db.settings.semesterStart)) confirmedIds.add(c.id);
  const confirmed = invited.filter((c) => confirmedIds.has(c.id));
  const pending = invited.filter((c) => !confirmedIds.has(c.id));
  const notMine = db.confirmations.filter((x) => x.term === term && !x.stillOwned).length;
  const wantsExit = db.confirmations.filter((x) => x.term === term && x.wantsExit).length;
  const pct = invited.length ? Math.round((confirmed.length / invited.length) * 100) : 0;
  return { term, invited, confirmed, pending, pct, notMine, wantsExit, start: db.settings.semesterStart, end: db.settings.semesterEnd };
}

export function reusableStock(db: Db) {
  return db.cycles.filter(
    (c) => c.ownershipStatus === 'CLEARED' && c.salvageStatus === 'NONE' && technicalRoute(c, db.settings).route === 'LIST' && c.listingStatus !== 'SOLD',
  );
}
export function salvageStock(db: Db) {
  return db.cycles.filter(
    (c) =>
      (c.salvageStatus !== 'NONE' && c.salvageStatus !== 'COMPLETED') ||
      (c.ownershipStatus === 'CLEARED' && c.salvageStatus === 'NONE' && ['NONE', 'WITHDRAWN'].includes(c.listingStatus) && technicalRoute(c, db.settings).route === 'SALVAGE'),
  );
}

export function overview(db: Db, now = Date.now()) {
  const cs = db.cycles;
  const count = (f: (c: Cycle) => boolean) => cs.filter(f).length;
  const st = (s: Cycle['ownershipStatus']) => count((c) => c.ownershipStatus === s);

  const notices = st('NOTICE_ACTIVE');
  const claimsPending = st('CLAIM_PENDING');
  const disputes = st('DISPUTED');
  const reusable = reusableStock(db);
  const salvage = salvageStock(db);

  const grades = {
    A: count((c) => c.grade === 'A'),
    B: count((c) => c.grade === 'B'),
    C: count((c) => c.grade === 'C'),
    D: count((c) => c.grade === 'D'),
    none: count((c) => !c.grade),
    selfReported: count((c) => !!c.grade && c.selfReported),
  };

  const pipeline = [
    { key: 'FLAGGED', label: 'Flagged · re-check', count: st('FLAGGED'), tone: 'slate' as Tone },
    { key: 'NOTICE_ACTIVE', label: `Notice · ${db.settings.noticeDays}-day window`, count: notices, tone: 'blue' as Tone },
    { key: 'CLAIM', label: 'Claim or dispute', count: claimsPending + disputes, tone: 'amber' as Tone },
    { key: 'AWAITING_CLEARANCE', label: 'Awaiting clearance', count: st('AWAITING_CLEARANCE') + st('HELD'), tone: 'red' as Tone },
    { key: 'CLEARED', label: 'Cleared by admin', count: st('CLEARED'), tone: 'teal' as Tone },
    { key: 'TRANSFERRED', label: 'Sold / handed over', count: st('TRANSFERRED'), tone: 'slate' as Tone },
  ];
  const ownerKnown = count((c) => OWNER_KNOWN.includes(c.ownershipStatus));

  const market = {
    draft: count((c) => c.listingStatus === 'DRAFT'),
    live: count((c) => c.listingStatus === 'LIVE'),
    reserved: count((c) => c.listingStatus === 'RESERVED'),
    sold: count((c) => c.listingStatus === 'SOLD'),
  };

  return {
    total: cs.length,
    provenance: {
      demo: count((c) => c.provenance === 'DEMO'),
      imported: count((c) => c.provenance === 'IMPORTED'),
      user: count((c) => c.provenance === 'USER_ENTERED'),
    },
    notices,
    claimsPending,
    disputes,
    inClaim: notices + claimsPending + disputes,
    awaiting: st('AWAITING_CLEARANCE'),
    held: st('HELD'),
    reusable,
    salvage,
    grades,
    pipeline,
    ownerKnown,
    registered: st('REGISTERED'),
    verified: st('OWNER_VERIFIED'),
    market,
    semester: semesterStats(db),
    exitsOpen: db.exits.filter((e) => !['RECEIVED', 'WITHDRAWN'].includes(e.status)),
    queue: actionQueue(db, now),
    recent: [...db.log].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6),
  };
}

export function actionQueue(db: Db, now = Date.now()): QueueItem[] {
  const q: QueueItem[] = [];
  const settings = db.settings;
  for (const cl of db.claims.filter((x) => x.status === 'SUBMITTED' || x.status === 'MORE_INFO')) {
    const c = db.cycles.find((x) => x.id === cl.cycleId);
    if (!c || c.ownershipStatus === 'DISPUTED') continue;
    q.push({ key: 'claim-' + cl.id, cycleId: cl.cycleId, tag: 'Claim', tone: 'amber', title: `${cl.cycleId} · owner evidence ${cl.status === 'MORE_INFO' ? 'awaiting more info' : 'submitted'}`, detail: `${cl.evidence.length} evidence item(s) · ${c.spot} · disposal paused`, href: `/admin/claims?claim=${cl.id}`, cta: 'Review', priority: 1 });
  }
  for (const c of db.cycles) {
    const np = noticeProgress(c, now);
    switch (c.ownershipStatus) {
      case 'DISPUTED':
        q.push({ key: 'disp-' + c.id, cycleId: c.id, tag: 'Dispute', tone: 'red', title: `${c.id} · ${activeClaims(db.claims, c.id).length} competing claimants`, detail: 'Authorised officer must rule', href: `/admin/claims?cycle=${c.id}`, cta: 'Resolve', priority: 2 });
        break;
      case 'AWAITING_CLEARANCE':
        q.push({ key: 'clr-' + c.id, cycleId: c.id, tag: 'Clearance', tone: 'red', title: `${c.id} · window ended, no claim`, detail: 'Expiry alone does not clear · sign-off needed', href: `/admin/cycles/${c.id}`, cta: 'Decide', priority: 3 });
        break;
      case 'NOTICE_ACTIVE':
        if (np && !c.reminderAt && np.day >= Math.ceil(np.total / 2))
          q.push({ key: 'rem-' + c.id, cycleId: c.id, tag: 'Notice', tone: 'blue', title: `${c.id} · ${np.daysLeft <= 1 ? 'window ends within a day' : `${np.daysLeft} days left`}`, detail: 'Mid-way reminder not logged', href: `/admin/claims?tab=notices`, cta: 'Log reminder', priority: 4 });
        break;
      case 'FLAGGED':
        q.push(
          c.audit?.recheckAt
            ? { key: 'not-' + c.id, cycleId: c.id, tag: 'Notice', tone: 'blue', title: `${c.id} · re-check done, not moved`, detail: 'Place physical notice to open the claim window', href: `/admin/cycles/${c.id}`, cta: 'Place notice', priority: 6 }
            : { key: 'rck-' + c.id, cycleId: c.id, tag: 'Re-check', tone: 'slate', title: `${c.id} · 2-day re-check due`, detail: 'Moved? Tag still there?', href: `/admin/cycles/${c.id}`, cta: 'Record', priority: 7 },
        );
        break;
      case 'CLEARED': {
        if (c.salvageStatus !== 'NONE' || !['NONE', 'WITHDRAWN'].includes(c.listingStatus)) break;
        const r = technicalRoute(c, settings);
        if (r.route === 'SALVAGE') {
          const veto = c.safety === 'UNSAFE' && c.grade !== 'D';
          q.push({ key: 'slv-' + c.id, cycleId: c.id, tag: veto ? 'Safety veto' : r.viability?.pct != null ? `R/V ${Math.round(r.viability.pct)}%` : 'Grade D', tone: veto ? 'red' : 'slate', title: `${c.id} · ${veto ? (c.safetyNote ?? 'unsafe') : 'route to salvage'}`, detail: veto ? `Listing blocked whatever the R/V` : `Cleared · above ${settings.thresholdPct}% cut-off or salvage grade`, href: `/admin/cycles/${c.id}`, cta: 'Route', priority: 5 });
        } else if (r.route === 'LIST') {
          q.push({ key: 'lst-' + c.id, cycleId: c.id, tag: 'Reuse', tone: 'teal', title: `${c.id} · eligible, not listed`, detail: c.salePriceS ? `S ₹${c.salePriceS} set · draft the listing` : 'Set an as-is sale price S', href: `/admin/cycles/${c.id}`, cta: 'List', priority: 6 });
        } else {
          q.push({ key: 'grd-' + c.id, cycleId: c.id, tag: 'Grade', tone: 'amber', title: `${c.id} · cleared, needs review`, detail: r.reasons.join('; '), href: `/admin/cycles/${c.id}`, cta: 'Review', priority: 6 });
        }
        break;
      }
    }
    if (c.listingStatus === 'DRAFT')
      q.push({ key: 'apl-' + c.id, cycleId: c.id, tag: 'Listing', tone: 'teal', title: `${c.id} · draft at ₹${c.salePriceS}`, detail: 'Admin approval needed before students see it', href: `/admin/marketplace`, cta: 'Approve', priority: 5 });
    if (c.listingStatus === 'RESERVED')
      q.push({ key: 'res-' + c.id, cycleId: c.id, tag: 'Handover', tone: 'amber', title: `${c.id} · reserved`, detail: 'Record handover + receipt at the desk', href: `/admin/marketplace`, cta: 'Hand over', priority: 6 });
    if (c.salvageStatus === 'REVIEW')
      q.push({ key: 'sva-' + c.id, cycleId: c.id, tag: 'Salvage', tone: 'slate', title: `${c.id} · in salvage review`, detail: 'Authorise dismantling', href: `/admin/salvage`, cta: 'Authorise', priority: 6 });
  }
  for (const e of db.exits.filter((x) => x.status === 'SUBMITTED'))
    q.push({ key: 'ex-' + e.id, cycleId: e.cycleId, tag: 'Exit', tone: 'blue', title: `${e.cycleId} · ${e.choice === 'DONATE' ? 'donate' : 'sell'} offer from final-year owner`, detail: e.handoverPref, href: `/admin/exit`, cta: 'Verify', priority: 5 });
  return q.sort((a, b) => a.priority - b.priority || a.cycleId.localeCompare(b.cycleId));
}

export function impact(db: Db) {
  const sold = db.listings.filter((l) => l.soldAt);
  const proceeds = sold.reduce((s, l) => s + l.priceS, 0);
  const parts = db.salvage.flatMap((s) => s.parts);
  const reusedParts = parts.filter((p) => !/recycl/i.test(p.destination)).reduce((s, p) => s + p.quantity, 0);
  const clearedIds = new Set(db.clearances.filter((c) => c.decision === 'APPROVED').map((c) => c.cycleId));
  const resolvedClaims = db.claims.filter((c) => ['APPROVED', 'REJECTED'].includes(c.status));
  const returned = db.claims.filter((c) => c.status === 'APPROVED').length;
  const baysFreed = db.cycles.filter((c) => (c.ownershipStatus === 'CLEARED' || c.ownershipStatus === 'TRANSFERRED') && !/^Bay /.test(c.spot)).length;
  const turnover = sold
    .map((l) => {
      const cl = db.clearances.find((c) => c.cycleId === l.cycleId && c.decision === 'APPROVED');
      return cl ? (Date.parse(l.soldAt!) - Date.parse(cl.at)) / 86400000 : null;
    })
    .filter((x): x is number => x != null);
  const sem = semesterStats(db);
  const qrRegistered = db.cycles.filter((c) => c.provenance === 'USER_ENTERED' || c.ownerId).length;
  const partnerSavings = db.listings
    .filter((l) => l.buyerShopChoice === 'partner')
    .map((l) => {
      const c = db.cycles.find((x) => x.id === l.cycleId)!;
      const r = repairCostR(c) ?? 0;
      return Math.round(r * (db.settings.discountPct / 100));
    })
    .reduce((s, x) => s + x, 0);
  return {
    verifiedRecords: db.cycles.filter((c) => c.audit?.recheckAt || c.lastVerified).length,
    clearedTotal: clearedIds.size,
    soldCount: sold.length,
    proceeds,
    reusedParts,
    partsTotal: parts.reduce((s, p) => s + p.quantity, 0),
    residualPending: db.salvage.filter((s) => s.residual && !s.completedAt).length,
    resolvedClaims: resolvedClaims.length,
    returned,
    openDisputes: db.cycles.filter((c) => c.ownershipStatus === 'DISPUTED').length,
    baysFreed,
    avgTurnoverDays: turnover.length ? Math.round((turnover.reduce((a, b) => a + b, 0) / turnover.length) * 10) / 10 : null,
    semesterPct: sem.pct,
    semester: sem,
    remindersLogged: db.reminders.length,
    qrRegistered,
    partnerSavings,
    exitsReceived: db.exits.filter((e) => e.status === 'RECEIVED').length,
  };
}
