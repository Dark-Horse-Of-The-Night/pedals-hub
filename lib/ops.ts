// Domain operations: every state transition goes through here and is validated
// server-side (not just disabled buttons). Each one writes an audit-log entry.
import { z } from 'zod';
import type { Actor, Claim, Cycle, Db, Grade, OwnershipStatus, RepairItem, Role } from './types';
import {
  ACTIVE_CLAIM,
  DomainError,
  NON_REUSABLE_PARTS,
  activeClaims,
  canBeClaimed,
  dispositionBlockers,
  listingBlockers,
  nextCycleId,
  salvageBlockers,
} from './rules';

const DAYMS = 24 * 60 * 60 * 1000;
const nowIso = () => new Date().toISOString();

function requireRole(a: Actor, roles: Role[], what: string) {
  if (!roles.includes(a.role))
    throw new DomainError(`Not allowed: ${what} needs the ${roles.join(' or ')} role (you are ${a.role}).`);
}
function getCycle(db: Db, id: string): Cycle {
  const c = db.cycles.find((x) => x.id.toUpperCase() === id.trim().toUpperCase());
  if (!c) throw new DomainError(`No cycle with ID ${id}`);
  return c;
}
let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}${(++seq).toString(36)}`;

export function log(db: Db, a: Actor | 'system', entityId: string, action: string, summary: string, entity = 'cycle') {
  db.log.push({
    id: uid('L'),
    at: nowIso(),
    actor: a === 'system' ? 'System' : a.name,
    role: a === 'system' ? 'system' : a.role,
    entity,
    entityId,
    action,
    summary,
  });
}
function touch(c: Cycle) {
  c.updatedAt = nowIso();
}
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new DomainError(r.error.issues.map((i) => (i.path.length ? i.path.join('.') + ': ' : '') + i.message).join('; '));
  return r.data;
}
const reason = z.string().trim().min(5, 'Give a reason (at least 5 characters)');

/** Notice windows that have ended move to AWAITING_CLEARANCE — never to sale or scrap. */
export function sweepExpiredNotices(db: Db, now = Date.now()): boolean {
  let changed = false;
  for (const c of db.cycles) {
    if (c.ownershipStatus === 'NOTICE_ACTIVE' && c.noticeDeadline && Date.parse(c.noticeDeadline) <= now) {
      c.ownershipStatus = 'AWAITING_CLEARANCE';
      touch(c);
      log(db, 'system', c.id, 'WINDOW_CLOSED', 'Claim window closed with no claim. Status → awaiting clearance. Expiry alone does not authorise resale or recycling.');
      changed = true;
    }
  }
  return changed;
}

// ============================================================ RECOVER
export function recordRecheck(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin', 'auditor'], 'Recording a re-check');
  const p = parse(z.object({ id: z.string(), moved: z.boolean(), tagIntact: z.boolean() }), input);
  const c = getCycle(db, p.id);
  if (c.ownershipStatus !== 'FLAGGED') throw new DomainError('Re-check applies to flagged cycles only.');
  if (!c.audit) throw new DomainError('No audit record to re-check.');
  c.audit.recheckAt = nowIso();
  c.audit.moved = p.moved;
  c.audit.tagIntact = p.tagIntact;
  if (p.moved) c.ownershipStatus = 'IN_USE';
  touch(c);
  log(db, a, c.id, 'RECHECKED', `Re-check: ${p.moved ? 'MOVED → treated as in use, no notice' : 'not moved'}; tag ${p.tagIntact ? 'intact' : 'missing (re-tag)'}`);
}

export function startNotice(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin', 'auditor'], 'Placing a notice');
  const p = parse(z.object({ id: z.string(), physicalTagPlaced: z.literal(true, { message: 'Confirm the physical notice is on the cycle' }), channels: z.array(z.string()).min(1, 'Pick at least one channel') }), input);
  const c = getCycle(db, p.id);
  if (c.ownershipStatus !== 'FLAGGED') throw new DomainError('Only flagged cycles can receive an owner notice.');
  if (!c.audit?.recheckAt) throw new DomainError('Do the 2+ day re-check first (was it moved? tag intact?).');
  if (c.audit.moved) throw new DomainError('Cycle moved on re-check: it is in use, no notice.');
  const start = Date.now();
  c.noticeStart = new Date(start).toISOString();
  c.noticeDeadline = new Date(start + db.settings.noticeDays * DAYMS).toISOString();
  c.physicalTagPlaced = true;
  c.reminderAt = null;
  c.ownershipStatus = 'NOTICE_ACTIVE';
  touch(c);
  log(db, a, c.id, 'NOTICE_PLACED', `Notice placed (${p.channels.join(', ')}); proposed ${db.settings.noticeDays}-day claim window opened`);
}

export function logNoticeReminder(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin', 'auditor'], 'Logging a reminder');
  const p = parse(z.object({ id: z.string() }), input);
  const c = getCycle(db, p.id);
  if (!['NOTICE_ACTIVE', 'CLAIM_PENDING'].includes(c.ownershipStatus)) throw new DomainError('No open claim window on this cycle.');
  c.reminderAt = nowIso();
  db.reminders.push({ id: uid('RM'), kind: 'NOTICE_MIDWAY', cycleId: c.id, at: c.reminderAt, by: a.name, note: 'Mid-way reminder (manual / demo, nothing sent)' });
  touch(c);
  log(db, a, c.id, 'REMINDER_LOGGED', 'Mid-way reminder logged (manual, not an automated message)');
}

export function submitClaim(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['student'], 'Submitting an ownership claim');
  const p = parse(
    z.object({ id: z.string(), evidence: z.array(z.string()).min(1, 'Choose at least one kind of evidence'), description: z.string().trim().min(5, 'Describe the cycle (colour, marks, lock)') }),
    input,
  );
  const c = getCycle(db, p.id);
  if (!canBeClaimed(c)) throw new DomainError('This cycle is not open to ownership claims.');
  const open = activeClaims(db.claims, c.id);
  if (open.some((x) => x.claimantId === a.studentId)) throw new DomainError('You already have an open claim on this cycle.');
  const claim: Claim = {
    id: uid('CM'),
    cycleId: c.id,
    claimantId: a.studentId!,
    evidence: p.evidence,
    description: p.description,
    submittedAt: nowIso(),
    status: 'SUBMITTED',
    reviewNote: null,
    reviewedAt: null,
    reviewedBy: null,
  };
  db.claims.push(claim);
  if (!['CLAIM_PENDING', 'DISPUTED'].includes(c.ownershipStatus)) c.preClaimStatus = c.ownershipStatus;
  if (open.length > 0) {
    for (const o of [...open, claim]) o.status = 'DISPUTED';
    c.ownershipStatus = 'DISPUTED';
    log(db, a, c.id, 'CLAIM_DISPUTED', 'A competing claim was submitted: cycle marked disputed for the authorised officer');
  } else {
    c.ownershipStatus = 'CLAIM_PENDING';
  }
  if (['DRAFT', 'LIVE', 'RESERVED'].includes(c.listingStatus)) {
    c.listingStatus = 'WITHDRAWN';
    const l = db.listings.find((x) => x.cycleId === c.id);
    if (l) { l.reservedBy = null; l.reservedAt = null; }
    log(db, 'system', c.id, 'LISTING_PAUSED', 'Listing withdrawn automatically because an owner claim arrived');
  }
  if (c.salvageStatus === 'REVIEW') {
    c.salvageStatus = 'NONE';
    log(db, 'system', c.id, 'SALVAGE_PAUSED', 'Salvage review stopped because an owner claim arrived');
  }
  touch(c);
  log(db, a, c.id, 'CLAIM_SUBMITTED', `Owner claim submitted (${p.evidence.join(', ')}). Disposal paused`);
  return claim.id;
}

function fallbackStatus(c: Cycle): OwnershipStatus {
  const prev = c.preClaimStatus;
  if (prev === 'CLEARED' || prev === 'HELD') return prev;
  if (c.noticeDeadline && Date.parse(c.noticeDeadline) > Date.now()) return 'NOTICE_ACTIVE';
  if (c.noticeDeadline) return 'AWAITING_CLEARANCE';
  return prev ?? 'FLAGGED';
}

export function reviewClaim(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin'], 'Deciding an ownership claim');
  const p = parse(z.object({ claimId: z.string(), decision: z.enum(['APPROVE', 'MORE_INFO', 'REJECT', 'DISPUTE']), note: reason }), input);
  const claim = db.claims.find((x) => x.id === p.claimId);
  if (!claim) throw new DomainError('Claim not found.');
  if (!ACTIVE_CLAIM.includes(claim.status)) throw new DomainError('This claim is already closed.');
  const c = getCycle(db, claim.cycleId);
  claim.reviewNote = p.note;
  claim.reviewedAt = nowIso();
  claim.reviewedBy = a.name;
  if (p.decision === 'APPROVE') {
    claim.status = 'APPROVED';
    for (const o of activeClaims(db.claims, c.id)) {
      o.status = 'REJECTED';
      o.reviewNote = 'Another claimant was verified as owner';
      o.reviewedAt = claim.reviewedAt;
      o.reviewedBy = a.name;
    }
    c.ownershipStatus = 'OWNER_VERIFIED';
    c.ownerId = claim.claimantId;
    c.lastVerified = nowIso();
    c.preClaimStatus = null;
    if (c.listingStatus !== 'SOLD' && c.listingStatus !== 'NONE') c.listingStatus = 'WITHDRAWN';
    log(db, a, c.id, 'CLAIM_APPROVED', `Claim approved for ${claim.claimantId}: owner verified, removed from every disposal queue. Note: ${p.note}`);
  } else if (p.decision === 'MORE_INFO') {
    claim.status = 'MORE_INFO';
    log(db, a, c.id, 'CLAIM_MORE_INFO', `Asked ${claim.claimantId} for more evidence: ${p.note}`);
  } else if (p.decision === 'DISPUTE') {
    for (const o of activeClaims(db.claims, c.id)) o.status = 'DISPUTED';
    claim.status = 'DISPUTED';
    c.ownershipStatus = 'DISPUTED';
    log(db, a, c.id, 'CLAIM_DISPUTED', `Escalated to authorised officer: ${p.note}`);
  } else {
    claim.status = 'REJECTED';
    const still = activeClaims(db.claims, c.id);
    if (still.length === 0) {
      c.ownershipStatus = fallbackStatus(c);
      c.preClaimStatus = null;
    } else if (still.length === 1 && c.ownershipStatus === 'DISPUTED') {
      still[0].status = 'SUBMITTED';
      c.ownershipStatus = 'CLAIM_PENDING';
    }
    log(db, a, c.id, 'CLAIM_REJECTED', `Claim by ${claim.claimantId} not approved: ${p.note}. Status → ${c.ownershipStatus}`);
  }
  touch(c);
}

export function decideClearance(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin'], 'Issuing disposal clearance');
  const p = parse(z.object({ id: z.string(), decision: z.enum(['APPROVED', 'HELD', 'DENIED']), reason }), input);
  const c = getCycle(db, p.id);
  if (c.ownershipStatus === 'NOTICE_ACTIVE') throw new DomainError('The claim window is still open. Clearance can only be considered after it closes.');
  if (activeClaims(db.claims, c.id).length > 0) throw new DomainError('An owner claim is open. Resolve it before any clearance decision.');
  if (!['AWAITING_CLEARANCE', 'HELD'].includes(c.ownershipStatus))
    throw new DomainError(`Clearance applies only to cycles awaiting clearance or on hold (this one is ${c.ownershipStatus}).`);
  if (p.decision === 'APPROVED' && c.noticeDeadline && Date.parse(c.noticeDeadline) > Date.now())
    throw new DomainError('Notice deadline has not passed.');
  db.clearances.push({ id: uid('CL'), cycleId: c.id, decision: p.decision, authority: a.name, reason: p.reason, at: nowIso() });
  c.ownershipStatus = p.decision === 'APPROVED' ? 'CLEARED' : p.decision === 'HELD' ? 'HELD' : 'IN_USE';
  touch(c);
  log(db, a, c.id, 'CLEARANCE_' + p.decision, `Clearance ${p.decision.toLowerCase()} by ${a.name}: ${p.reason}`);
}

// ============================================================ TECHNICAL REVIEW
const repairItemSchema = z.object({
  id: z.string().optional(),
  component: z.string().min(1),
  operation: z.string().min(1),
  marketPrice: z.coerce.number().int().min(0).max(100000),
});
export function saveTechnicalReview(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin', 'auditor', 'mechanic'], 'Grading a cycle');
  const p = parse(
    z.object({
      id: z.string(),
      grade: z.enum(['A', 'B', 'C', 'D']),
      faults: z.array(z.string()),
      repairItems: z.array(repairItemSchema),
      safety: z.enum(['UNCHECKED', 'SAFE', 'UNSAFE']),
      safetyNote: z.string().trim().nullable(),
      refurbishedValueV: z.coerce.number().int().min(0).max(200000).nullable(),
      salePriceS: z.coerce.number().int().min(0).max(200000).nullable(),
    }),
    input,
  );
  const c = getCycle(db, p.id);
  if (c.ownershipStatus === 'TRANSFERRED') throw new DomainError('Cycle already transferred.');
  if (['LIVE', 'RESERVED', 'SOLD'].includes(c.listingStatus)) throw new DomainError('Withdraw the listing before changing the review.');
  if (c.salvageStatus !== 'NONE' && c.salvageStatus !== 'REVIEW') throw new DomainError('Cycle is already being dismantled.');
  if (p.safety === 'UNSAFE' && !p.safetyNote) throw new DomainError('Record why the cycle is unsafe.');
  if ((p.grade === 'B' || p.grade === 'C') && p.repairItems.length === 0 && p.faults.length > 0)
    throw new DomainError('Add itemised repairs so R can be calculated.');
  c.grade = p.grade as Grade;
  c.faults = p.faults;
  c.repairItems = p.repairItems.map((i, n) => ({ ...i, id: i.id || `RI-${c.id}-${n + 1}` })) as RepairItem[];
  c.safety = p.safety;
  c.safetyNote = p.safetyNote || null;
  c.refurbishedValueV = p.refurbishedValueV || null;
  c.salePriceS = p.salePriceS || null;
  c.gradedBy = a.name;
  c.gradedAt = nowIso();
  c.selfReported = false;
  if (c.listingStatus === 'DRAFT') c.listingStatus = 'WITHDRAWN';
  if (c.salvageStatus === 'REVIEW') c.salvageStatus = 'NONE';
  touch(c);
  const r = c.repairItems.reduce((s, i) => s + i.marketPrice, 0);
  log(db, a, c.id, 'GRADED', `Grade ${p.grade}, safety ${p.safety.toLowerCase()}, R ₹${r}, V ${p.refurbishedValueV ? '₹' + p.refurbishedValueV : '—'}, S ${p.salePriceS ? '₹' + p.salePriceS : '—'}`);
}

// ============================================================ MARKETPLACE
function listingFor(db: Db, id: string) {
  return db.listings.find((l) => l.cycleId === id);
}
export function draftListing(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin', 'auditor'], 'Drafting a listing');
  const { id } = parse(z.object({ id: z.string() }), input);
  const c = getCycle(db, id);
  const blockers = listingBlockers(c, db.claims, db.settings);
  if (blockers.length) throw new DomainError('Cannot list: ' + blockers.join('; '));
  db.listings = db.listings.filter((l) => l.cycleId !== c.id);
  db.listings.push({ cycleId: c.id, priceS: c.salePriceS!, draftedAt: nowIso(), draftedBy: a.name, approvedAt: null, approvedBy: null, reservedBy: null, reservedAt: null, buyerShopChoice: null, soldAt: null, receiptNo: null });
  c.listingStatus = 'DRAFT';
  touch(c);
  log(db, a, c.id, 'LISTING_DRAFTED', `Draft listing at ₹${c.salePriceS} (cycle only)`);
}
export function approveListing(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin'], 'Approving a listing');
  const { id } = parse(z.object({ id: z.string() }), input);
  const c = getCycle(db, id);
  if (c.listingStatus !== 'DRAFT') throw new DomainError('Only draft listings can be approved.');
  const blockers = listingBlockers({ ...c, listingStatus: 'NONE' }, db.claims, db.settings);
  if (blockers.length) throw new DomainError('Cannot approve: ' + blockers.join('; '));
  const l = listingFor(db, c.id)!;
  l.approvedAt = nowIso();
  l.approvedBy = a.name;
  l.priceS = c.salePriceS!;
  c.listingStatus = 'LIVE';
  touch(c);
  log(db, a, c.id, 'LISTING_APPROVED', `Listing approved and live at ₹${l.priceS} (cycle only)`);
}
export function withdrawListing(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin'], 'Withdrawing a listing');
  const p = parse(z.object({ id: z.string(), reason }), input);
  const c = getCycle(db, p.id);
  if (!['DRAFT', 'LIVE', 'RESERVED'].includes(c.listingStatus)) throw new DomainError('Nothing to withdraw.');
  const l = listingFor(db, c.id);
  if (l) { l.reservedBy = null; l.reservedAt = null; }
  c.listingStatus = 'WITHDRAWN';
  touch(c);
  log(db, a, c.id, 'LISTING_WITHDRAWN', 'Listing withdrawn: ' + p.reason);
}
export function reserveListing(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['student'], 'Reserving a cycle');
  const p = parse(z.object({ id: z.string(), shop: z.enum(['partner', 'regular', 'undecided']) }), input);
  const c = getCycle(db, p.id);
  if (c.listingStatus !== 'LIVE') throw new DomainError('This cycle is not available.');
  const mine = db.listings.find((l) => l.reservedBy === a.studentId && db.cycles.find((x) => x.id === l.cycleId)?.listingStatus === 'RESERVED');
  if (mine) throw new DomainError(`You already hold a reservation (${mine.cycleId}).`);
  const l = listingFor(db, c.id)!;
  l.reservedBy = a.studentId;
  l.reservedAt = nowIso();
  l.buyerShopChoice = p.shop;
  c.listingStatus = 'RESERVED';
  touch(c);
  log(db, a, c.id, 'RESERVED', `Reserved at ₹${l.priceS} (cycle only). Repair plan: ${p.shop === 'partner' ? 'partner shop' : p.shop === 'regular' ? 'own mechanic' : 'undecided'}; paid to mechanic directly`);
}
export function cancelReservation(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin'], 'Releasing a reservation');
  const { id } = parse(z.object({ id: z.string() }), input);
  const c = getCycle(db, id);
  if (c.listingStatus !== 'RESERVED') throw new DomainError('Not reserved.');
  const l = listingFor(db, c.id)!;
  const who = l.reservedBy;
  l.reservedBy = null;
  l.reservedAt = null;
  c.listingStatus = 'LIVE';
  touch(c);
  log(db, a, c.id, 'RESERVATION_RELEASED', `Reservation by ${who} released; listing live again`);
}
function nextNo(prefix: string, existing: (string | null)[]) {
  let max = 0;
  for (const e of existing) {
    const m = e?.match(/(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}
export function recordSale(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin'], 'Recording a sale / handover');
  const { id } = parse(z.object({ id: z.string() }), input);
  const c = getCycle(db, id);
  if (c.listingStatus !== 'RESERVED') throw new DomainError('Only a reserved cycle can be handed over.');
  const blockers = dispositionBlockers(c, db.claims);
  if (blockers.length) throw new DomainError('Cannot hand over: ' + blockers.join('; '));
  const l = listingFor(db, c.id)!;
  l.soldAt = nowIso();
  l.receiptNo = nextNo('PPR', db.listings.map((x) => x.receiptNo));
  c.listingStatus = 'SOLD';
  c.ownershipStatus = 'TRANSFERRED';
  c.ownerId = l.reservedBy;
  c.spot = 'Handed over';
  touch(c);
  log(db, a, c.id, 'SOLD', `Handover recorded to ${l.reservedBy}, receipt ${l.receiptNo}: ₹${l.priceS} for the cycle only (demo, no real payment)`);
  return l.receiptNo;
}

// ============================================================ SALVAGE
function salvageFor(db: Db, id: string) {
  const s = db.salvage.find((x) => x.cycleId === id);
  if (!s) throw new DomainError('No salvage record.');
  return s;
}
export function markSalvageReview(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin', 'auditor'], 'Routing to salvage review');
  const { id } = parse(z.object({ id: z.string() }), input);
  const c = getCycle(db, id);
  const blockers = salvageBlockers(c, db.claims, db.settings);
  if (blockers.length) throw new DomainError('Cannot route to salvage: ' + blockers.join('; '));
  c.salvageStatus = 'REVIEW';
  db.salvage = db.salvage.filter((s) => s.cycleId !== c.id);
  db.salvage.push({ cycleId: c.id, parts: [], residual: null, recyclerStatus: 'PENDING_PARTNER', evidence: null, authorisedBy: null, completedAt: null });
  touch(c);
  log(db, a, c.id, 'SALVAGE_REVIEW', 'Routed to salvage review (awaiting admin authorisation to dismantle)');
}
export function authoriseSalvage(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin'], 'Authorising dismantling');
  const p = parse(z.object({ id: z.string(), reason }), input);
  const c = getCycle(db, p.id);
  if (c.salvageStatus !== 'REVIEW') throw new DomainError('Cycle is not in salvage review.');
  const blockers = dispositionBlockers(c, db.claims);
  if (blockers.length) throw new DomainError('Cannot authorise: ' + blockers.join('; '));
  salvageFor(db, c.id).authorisedBy = a.name;
  c.salvageStatus = 'DISMANTLING';
  touch(c);
  log(db, a, c.id, 'SALVAGE_AUTHORISED', 'Dismantling authorised: ' + p.reason);
}
export function logSalvagePart(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin', 'auditor', 'mechanic'], 'Logging a recovered part');
  const p = parse(z.object({ id: z.string(), part: z.string().trim().min(2), condition: z.string().trim().min(2), quantity: z.coerce.number().int().min(1).max(20), destination: z.string().trim().min(2) }), input);
  const c = getCycle(db, p.id);
  if (!['DISMANTLING', 'PARTS_LOGGED'].includes(c.salvageStatus)) throw new DomainError('Parts can only be logged after dismantling is authorised.');
  const unsafe = NON_REUSABLE_PARTS.some((n) => p.part.toLowerCase().includes(n.toLowerCase().split(' ')[0]));
  if (unsafe && !p.destination.toLowerCase().includes('recycl'))
    throw new DomainError('Brakes and frame/fork parts are never transplanted: set destination to recycling.');
  salvageFor(db, c.id).parts.push({ id: uid('SP'), part: p.part, condition: p.condition, quantity: p.quantity, destination: p.destination, loggedAt: nowIso() });
  c.salvageStatus = 'PARTS_LOGGED';
  touch(c);
  log(db, a, c.id, 'PART_LOGGED', `${p.quantity} × ${p.part} (${p.condition}) → ${p.destination}`);
}
export function setResidual(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin', 'auditor'], 'Recording residual material');
  const p = parse(z.object({ id: z.string(), residual: z.string().trim().min(3) }), input);
  const c = getCycle(db, p.id);
  if (!['DISMANTLING', 'PARTS_LOGGED'].includes(c.salvageStatus)) throw new DomainError('Dismantle and log parts first.');
  salvageFor(db, c.id).residual = p.residual;
  c.salvageStatus = 'RESIDUAL_PENDING';
  touch(c);
  log(db, a, c.id, 'RESIDUAL_PENDING', `Residual awaiting authorised recycler (partner not yet confirmed): ${p.residual}`);
}
export function completeSalvage(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin'], 'Closing a salvage record');
  const p = parse(z.object({ id: z.string(), evidence: z.string().trim().min(5, 'Record the handover evidence (receipt no., photo link)') }), input);
  const c = getCycle(db, p.id);
  if (c.salvageStatus !== 'RESIDUAL_PENDING') throw new DomainError('Residual material must be recorded first.');
  const s = salvageFor(db, c.id);
  s.evidence = p.evidence;
  s.completedAt = nowIso();
  s.recyclerStatus = 'HANDED_TO_RECYCLER';
  c.salvageStatus = 'COMPLETED';
  touch(c);
  log(db, a, c.id, 'SALVAGE_COMPLETED', 'Residual handed to recycler with evidence: ' + p.evidence);
}

// ============================================================ PREVENT
export function registerCycle(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['student'], 'Registering a cycle');
  const p = parse(
    z.object({
      description: z.string().trim().min(3, 'Describe the cycle (colour, type)'),
      zone: z.string().trim().min(2),
      bay: z.string().trim().min(1),
      spot: z.string().trim().min(2, 'Where exactly is it parked?'),
      condition: z.enum(['ok', 'minor', 'major']),
      faults: z.array(z.string()),
      ack: z.literal(true, { message: 'Confirm this cycle is yours' }),
    }),
    input,
  );
  const id = nextCycleId(db.cycles.map((c) => c.id), db.settings.idPrefix);
  const now = nowIso();
  db.cycles.push({
    id,
    description: p.description,
    zone: p.zone,
    bay: p.bay,
    spot: p.spot,
    ownerId: a.studentId,
    ownershipStatus: 'REGISTERED',
    preClaimStatus: null,
    grade: p.condition === 'ok' ? 'A' : p.condition === 'minor' ? 'B' : 'C',
    gradedBy: 'Owner self-report',
    gradedAt: now,
    faults: p.faults,
    repairItems: [],
    safety: 'UNCHECKED',
    safetyNote: null,
    refurbishedValueV: null,
    salePriceS: null,
    listingStatus: 'NONE',
    salvageStatus: 'NONE',
    noticeStart: null,
    noticeDeadline: null,
    reminderAt: null,
    physicalTagPlaced: false,
    lastVerified: now,
    selfReported: true,
    audit: null,
    tagIssuedAt: now,
    createdAt: now,
    updatedAt: now,
    provenance: 'USER_ENTERED',
  });
  log(db, a, id, 'REGISTERED', `Registered by owner; permanent QR ${id} issued (self-reported condition, not a mechanic check)`);
  return id;
}

export function semesterConfirm(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['student'], 'Semester self-check');
  const p = parse(
    z.object({
      cycleId: z.string(),
      stillOwned: z.boolean(),
      locationChanged: z.boolean(),
      newSpot: z.string().trim().nullable(),
      faults: z.array(z.string()),
      wantsExit: z.boolean(),
    }),
    input,
  );
  const c = getCycle(db, p.cycleId);
  if (c.ownerId !== a.studentId) throw new DomainError('You can only confirm a cycle registered to you.');
  if (p.locationChanged && !p.newSpot) throw new DomainError('Enter the new parking spot.');
  const term = db.settings.term;
  db.confirmations = db.confirmations.filter((x) => !(x.cycleId === c.id && x.term === term));
  const now = nowIso();
  db.confirmations.push({ ...p, id: uid('SC'), cycleId: c.id, ownerId: a.studentId!, term, respondedAt: now, newSpot: p.newSpot || null });
  if (p.stillOwned) {
    c.lastVerified = now;
    if (p.locationChanged && p.newSpot) c.spot = p.newSpot;
    if (c.selfReported) c.faults = p.faults;
  } else {
    db.reminders.push({ id: uid('RM'), kind: 'FOLLOW_UP', cycleId: c.id, at: now, by: 'System', note: 'Owner says no longer theirs: manual follow-up (not a seizure)' });
  }
  touch(c);
  log(db, a, c.id, 'SEMESTER_CONFIRMED', p.stillOwned ? `Self-check: still mine${p.locationChanged ? ', moved to ' + p.newSpot : ', same spot'}${p.faults.length ? ', faults: ' + p.faults.join(', ') : ''}` : 'Self-check: owner reports it is no longer theirs → manual follow-up');
}

export function logSemesterReminder(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin', 'auditor'], 'Logging a semester reminder');
  const p = parse(z.object({ cycleId: z.string().nullable(), note: z.string().trim().min(3) }), input);
  db.reminders.push({ id: uid('RM'), kind: p.cycleId ? 'FOLLOW_UP' : 'SEMESTER', cycleId: p.cycleId, at: nowIso(), by: a.name, note: p.note + ' (demo log only, nothing sent)' });
  log(db, a, p.cycleId ?? 'semester', p.cycleId ? 'FOLLOW_UP_LOGGED' : 'SEMESTER_REMINDER', p.note, p.cycleId ? 'cycle' : 'semester');
}

export function submitExit(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['student'], 'Offering a cycle at graduation');
  const p = parse(
    z.object({ cycleId: z.string(), choice: z.enum(['DONATE', 'SELL']), expectedPrice: z.coerce.number().int().min(0).max(100000).nullable(), handoverPref: z.string().trim().min(3) }),
    input,
  );
  const c = getCycle(db, p.cycleId);
  if (c.ownerId !== a.studentId) throw new DomainError('Only the registered owner can offer this cycle.');
  if (!['REGISTERED', 'OWNER_VERIFIED', 'IN_USE'].includes(c.ownershipStatus)) throw new DomainError('This cycle cannot be offered right now.');
  if (db.exits.some((e) => e.cycleId === c.id && !['RECEIVED', 'WITHDRAWN'].includes(e.status))) throw new DomainError('An offer for this cycle is already open.');
  const id = uid('EX');
  db.exits.push({ id, cycleId: c.id, ownerId: a.studentId!, choice: p.choice, expectedPrice: p.choice === 'SELL' ? p.expectedPrice : null, handoverPref: p.handoverPref, status: 'SUBMITTED', submittedAt: nowIso(), handoverAt: null, receiptNo: null });
  log(db, a, c.id, 'EXIT_OFFER', `Final-year owner offered to ${p.choice === 'DONATE' ? 'DONATE' : `SELL (asking ₹${p.expectedPrice ?? '—'})`}`);
  return id;
}

export function advanceExit(db: Db, a: Actor, input: unknown) {
  const p = parse(z.object({ id: z.string(), step: z.enum(['VERIFY', 'SCHEDULE', 'RECEIVE', 'WITHDRAW']), when: z.string().optional() }), input);
  const e = db.exits.find((x) => x.id === p.id);
  if (!e) throw new DomainError('Offer not found.');
  const c = getCycle(db, e.cycleId);
  if (p.step === 'WITHDRAW') {
    if (a.role === 'student' ? a.studentId !== e.ownerId : a.role !== 'admin') throw new DomainError('Not allowed to withdraw this offer.');
    if (e.status === 'RECEIVED') throw new DomainError('Already received.');
    e.status = 'WITHDRAWN';
    log(db, a, c.id, 'EXIT_WITHDRAWN', 'Exit offer withdrawn');
    return;
  }
  requireRole(a, ['admin'], 'Processing an exit handover');
  if (p.step === 'VERIFY') {
    if (e.status !== 'SUBMITTED') throw new DomainError('Offer is not awaiting verification.');
    if (c.ownerId !== e.ownerId) throw new DomainError('Offer owner does not match the registry.');
    e.status = 'VERIFIED';
    log(db, a, c.id, 'EXIT_VERIFIED', `Voluntary offer by registered owner ${e.ownerId} verified`);
  } else if (p.step === 'SCHEDULE') {
    if (e.status !== 'VERIFIED') throw new DomainError('Verify the owner first.');
    if (!p.when) throw new DomainError('Pick a handover date.');
    e.handoverAt = new Date(p.when).toISOString();
    e.status = 'HANDOVER_SCHEDULED';
    log(db, a, c.id, 'EXIT_SCHEDULED', `Handover scheduled at hostel desk for ${p.when}`);
  } else {
    if (e.status !== 'HANDOVER_SCHEDULED') throw new DomainError('Schedule the handover first.');
    e.status = 'RECEIVED';
    e.receiptNo = nextNo('PPH', db.exits.map((x) => x.receiptNo));
    db.clearances.push({ id: uid('CL'), cycleId: c.id, decision: 'APPROVED', authority: a.name, reason: `Voluntary ${e.choice === 'DONATE' ? 'donation' : 'sale offer'} by registered owner ${e.ownerId}; custody receipt ${e.receiptNo}`, at: nowIso() });
    c.ownershipStatus = 'CLEARED';
    c.ownerId = null;
    c.spot = 'Storage bay (received at exit)';
    c.safety = 'UNCHECKED';
    if (e.choice === 'SELL' && e.expectedPrice) c.salePriceS = e.expectedPrice;
    touch(c);
    log(db, a, c.id, 'EXIT_RECEIVED', `Cycle received with custody receipt ${e.receiptNo}; cleared by voluntary handover. Needs mechanic grading before any listing`);
  }
}

// ============================================================ RATE CARD + SETTINGS
export function upsertRateCard(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin', 'mechanic'], 'Editing the rate card');
  const p = parse(
    z.object({
      id: z.string().optional(),
      component: z.string().trim().min(2),
      operation: z.string().trim().min(2),
      marketPrice: z.coerce.number().int().min(0).max(100000),
      partnerPrice: z.coerce.number().int().min(0).max(100000).nullable(),
      source: z.string().trim().min(3, 'Record where the price came from'),
      verified: z.boolean(),
    }),
    input,
  );
  if (p.verified && !/quote|receipt|written|bill|signed/i.test(p.source))
    throw new DomainError('Mark a price “confirmed” only with a written quote/receipt as the source.');
  const existing = p.id ? db.rateCard.find((r) => r.id === p.id) : undefined;
  if (existing) Object.assign(existing, { ...p, id: existing.id, lastUpdated: nowIso() });
  else db.rateCard.push({ ...p, id: nextNo('RC', db.rateCard.map((r) => r.id)), lastUpdated: nowIso() });
  log(db, a, existing?.id ?? 'rate-card', 'RATE_CARD', `${p.component} · ${p.operation}: ₹${p.marketPrice} regular, ${p.partnerPrice != null ? '₹' + p.partnerPrice : 'indicative'} partner (${p.verified ? 'confirmed' : 'unverified'})`, 'rateCard');
}

export function updateSettings(db: Db, a: Actor, input: unknown) {
  requireRole(a, ['admin'], 'Changing programme settings');
  const p = parse(
    z.object({
      term: z.string().trim().min(3),
      noticeDays: z.coerce.number().int().min(1).max(60),
      thresholdPct: z.coerce.number().min(1).max(100),
      discountPct: z.coerce.number().min(0).max(80),
      discountConfirmed: z.boolean(),
      idPrefix: z.string().trim().min(1).max(6),
      receiptFooter: z.string().trim().min(3),
      semesterStart: z.string(),
      semesterEnd: z.string(),
    }),
    input,
  );
  Object.assign(db.settings, p, {
    semesterStart: new Date(p.semesterStart).toISOString(),
    semesterEnd: new Date(p.semesterEnd).toISOString(),
  });
  log(db, a, 'settings', 'SETTINGS', `Policy updated: notice ${p.noticeDays} d, cut-off ${p.thresholdPct}%, partner discount ${p.discountPct}% (${p.discountConfirmed ? 'confirmed' : 'indicative'})`, 'settings');
}
