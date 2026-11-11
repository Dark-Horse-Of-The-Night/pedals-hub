// Pure policy logic. No I/O. Every gate the UI shows is enforced again in lib/ops.ts.
import type { AuditSignals, Claim, Cycle, Grade, RateCardItem, Settings } from './types';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export const DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------- money
export function repairCostR(c: Pick<Cycle, 'grade' | 'repairItems'>): number | null {
  if (c.repairItems.length > 0) return c.repairItems.reduce((s, i) => s + (Number(i.marketPrice) || 0), 0);
  if (c.grade === 'A') return 0;
  return null; // B/C/D without an itemised estimate: unknown, never assumed 0
}

export interface PartnerQuote {
  rp: number;
  confirmed: boolean; // true only if every item uses a verified partner price
}

/** Partner repair quote. Never used for the 40% decision (that uses the regular quote R). */
export function partnerQuote(
  c: Pick<Cycle, 'repairItems'>,
  settings: Pick<Settings, 'discountPct' | 'discountConfirmed'>,
  rateCard: RateCardItem[],
): PartnerQuote | null {
  if (c.repairItems.length === 0) return null;
  let rp = 0;
  let confirmed = true;
  for (const item of c.repairItems) {
    const rc = rateCard.find(
      (r) => r.component === item.component && r.operation === item.operation,
    );
    if (rc && rc.partnerPrice != null && rc.verified && rc.marketPrice === item.marketPrice) {
      rp += rc.partnerPrice;
    } else {
      rp += Math.round(item.marketPrice * (1 - settings.discountPct / 100));
      confirmed = confirmed && settings.discountConfirmed;
    }
  }
  return { rp, confirmed };
}

// ---------------------------------------------------------------- viability
export type Viability =
  | { kind: 'NEEDS_REVIEW'; pct: null; reason: string }
  | { kind: 'ELIGIBLE'; pct: number; reason: string }
  | { kind: 'NOT_VIABLE'; pct: number; reason: string };

/**
 * P = R / V × 100. Eligible on economics when P <= threshold (exactly 40% qualifies).
 * Missing / zero / negative V, or unknown R => needs price review. Never divides by zero.
 */
export function viability(r: number | null, v: number | null, thresholdPct: number): Viability {
  if (r == null || !Number.isFinite(r) || r < 0)
    return { kind: 'NEEDS_REVIEW', pct: null, reason: 'Repair estimate R missing' };
  if (v == null || !Number.isFinite(v) || v <= 0)
    return { kind: 'NEEDS_REVIEW', pct: null, reason: 'Refurbished value V missing' };
  const pct = Math.round(((r * 100) / v) * 10) / 10;
  // compare with integers to avoid float edge cases (800/2000 must be exactly 40)
  if (r * 100 <= thresholdPct * v)
    return { kind: 'ELIGIBLE', pct, reason: `R/V ${pct}% ≤ ${thresholdPct}%` };
  return { kind: 'NOT_VIABLE', pct, reason: `R/V ${pct}% > ${thresholdPct}%` };
}

// ---------------------------------------------------------------- routing
export type Route = 'LIST' | 'SALVAGE' | 'REVIEW';
export interface RouteDecision {
  route: Route;
  reasons: string[];
  viability: Viability | null;
}

/** Technical route only. Ownership clearance is checked separately (dispositionBlockers). */
export function technicalRoute(c: Cycle, settings: Pick<Settings, 'thresholdPct'>): RouteDecision {
  if (!c.grade) return { route: 'REVIEW', reasons: ['Not graded yet'], viability: null };
  if (c.safety === 'UNSAFE')
    return {
      route: 'SALVAGE',
      reasons: ['Safety veto: ' + (c.safetyNote || 'structural failure') + '. Formula cannot override.'],
      viability: c.grade === 'D' ? null : viability(repairCostR(c), c.refurbishedValueV, settings.thresholdPct),
    };
  if (c.grade === 'D') return { route: 'SALVAGE', reasons: ['Grade D: salvage safe parts, recycle rest'], viability: null };
  if (c.safety === 'UNCHECKED')
    return { route: 'REVIEW', reasons: ['Mechanic safety check pending'], viability: null };
  if (c.grade === 'A') return { route: 'LIST', reasons: ['Grade A, safety passed: ride-ready'], viability: null };
  const v = viability(repairCostR(c), c.refurbishedValueV, settings.thresholdPct);
  if (v.kind === 'ELIGIBLE') return { route: 'LIST', reasons: ['Eligible on economics: ' + v.reason], viability: v };
  if (v.kind === 'NOT_VIABLE') return { route: 'SALVAGE', reasons: ['Not viable: ' + v.reason], viability: v };
  return { route: 'REVIEW', reasons: ['Needs price review: ' + v.reason], viability: v };
}

export const ACTIVE_CLAIM: Claim['status'][] = ['SUBMITTED', 'MORE_INFO', 'DISPUTED'];
export function activeClaims(claims: Claim[], cycleId: string) {
  return claims.filter((c) => c.cycleId === cycleId && ACTIVE_CLAIM.includes(c.status));
}

/** Why disposal (listing/salvage/transfer) is not allowed yet. Empty array = allowed by ownership. */
export function dispositionBlockers(c: Cycle, claims: Claim[]): string[] {
  const out: string[] = [];
  if (activeClaims(claims, c.id).length > 0) out.push('An owner claim is open: disposal paused');
  if (c.ownershipStatus !== 'CLEARED') {
    const map: Partial<Record<Cycle['ownershipStatus'], string>> = {
      AWAITING_CLEARANCE: 'Claim window over, but written admin clearance not yet given',
      NOTICE_ACTIVE: 'Claim window still open',
      FLAGGED: 'Re-check and notice not done',
      CLAIM_PENDING: 'Owner claim under review',
      DISPUTED: 'Ownership disputed',
      OWNER_VERIFIED: 'Owner verified: cycle belongs to its owner',
      REGISTERED: 'Registered to an owner',
      IN_USE: 'Treated as owned / in use',
      HELD: 'Clearance on hold',
      TRANSFERRED: 'Already transferred',
    };
    out.push(map[c.ownershipStatus] ?? 'Not cleared');
  }
  return out;
}

export function listingBlockers(c: Cycle, claims: Claim[], settings: Settings): string[] {
  const out = dispositionBlockers(c, claims);
  const r = technicalRoute(c, settings);
  if (r.route !== 'LIST') out.push(...r.reasons);
  if (!['NONE', 'WITHDRAWN'].includes(c.listingStatus)) out.push('Already has a listing');
  if (c.salvageStatus !== 'NONE') out.push('In salvage pipeline');
  if (!c.salePriceS || c.salePriceS <= 0) out.push('Set an as-is sale price S');
  return out;
}

export function salvageBlockers(c: Cycle, claims: Claim[], settings: Settings): string[] {
  const out = dispositionBlockers(c, claims);
  const r = technicalRoute(c, settings);
  if (r.route !== 'SALVAGE') out.push('Technical route is not salvage (' + r.reasons.join('; ') + ')');
  if (!['NONE', 'WITHDRAWN'].includes(c.listingStatus)) out.push('Has an active listing');
  if (c.salvageStatus !== 'NONE') out.push('Already in salvage pipeline');
  return out;
}

export function canBeClaimed(c: Cycle): boolean {
  if (['FLAGGED', 'NOTICE_ACTIVE', 'CLAIM_PENDING', 'DISPUTED', 'AWAITING_CLEARANCE', 'HELD'].includes(c.ownershipStatus))
    return true;
  if (c.ownershipStatus === 'CLEARED')
    return c.listingStatus !== 'SOLD' && !['DISMANTLING', 'PARTS_LOGGED', 'RESIDUAL_PENDING', 'COMPLETED'].includes(c.salvageStatus);
  return false;
}

// ---------------------------------------------------------------- notices
export function noticeProgress(c: Pick<Cycle, 'noticeStart' | 'noticeDeadline'>, now: number) {
  if (!c.noticeStart || !c.noticeDeadline) return null;
  const start = Date.parse(c.noticeStart);
  const end = Date.parse(c.noticeDeadline);
  const total = Math.max(1, Math.round((end - start) / DAY));
  const elapsed = Math.min(total, Math.max(0, Math.floor((now - start) / DAY) + 1));
  const msLeft = end - now;
  return {
    day: elapsed,
    total,
    ended: msLeft <= 0,
    daysLeft: Math.max(0, Math.ceil(msLeft / DAY)),
    pct: Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)),
  };
}

// ---------------------------------------------------------------- audit signals
export function abandonmentSignals(a: AuditSignals | null) {
  if (!a) return { count: 0, of: 5, list: [] as string[] };
  const list: string[] = [];
  if (a.dust === 'Heavy') list.push('Heavy dust');
  if (a.rust === 'Heavy' || a.rust === 'Moderate') list.push(a.rust + ' rust');
  if (a.blockedIn) list.push('Blocked in');
  if (a.sticker === 'Old' || a.sticker === 'None') list.push((a.sticker === 'None' ? 'No' : 'Old') + ' hostel sticker');
  if (a.moved === false) list.push('Not moved on re-check');
  return { count: list.length, of: 5, list };
}

export function mapGrade(label: string | null | undefined): Grade | null {
  if (!label) return null;
  const s = String(label).trim().toLowerCase();
  if (s.startsWith('ride')) return 'A';
  if (s.startsWith('minor')) return 'B';
  if (s.startsWith('major')) return 'C';
  if (s.startsWith('scrap') || s.startsWith('salvage')) return 'D';
  if (['a', 'b', 'c', 'd'].includes(s)) return s.toUpperCase() as Grade;
  return null;
}

export function nextCycleId(existing: string[], prefix: string): string {
  let max = 0;
  for (const id of existing) {
    const m = id.match(/(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return prefix + String(max + 1).padStart(4, '0');
}

// Parts that must never be transplanted (handoff B4: no failed brakes or damaged structure)
export const NON_REUSABLE_PARTS = ['Brakes', 'Frame / fork'];
