import type { ClaimStatus, ExitStatus, Grade, ListingStatus, OwnershipStatus, SalvageStatus } from './types';

export type Tone = 'blue' | 'teal' | 'amber' | 'red' | 'slate' | 'navy';

export const OWNERSHIP: Record<OwnershipStatus, { label: string; tone: Tone; public: string }> = {
  REGISTERED: { label: 'Registered owner', tone: 'teal', public: 'Registered to an owner' },
  IN_USE: { label: 'In use / owned', tone: 'teal', public: 'In use' },
  FLAGGED: { label: 'Flagged · re-check', tone: 'slate', public: 'Under routine check' },
  NOTICE_ACTIVE: { label: 'Notice · claim window', tone: 'blue', public: 'Owner notice active: claim it if it is yours' },
  CLAIM_PENDING: { label: 'Claim in review', tone: 'amber', public: 'An owner claim is being reviewed' },
  DISPUTED: { label: 'Disputed', tone: 'red', public: 'Ownership under review by the hostel office' },
  OWNER_VERIFIED: { label: 'Owner verified', tone: 'teal', public: 'Returned to its verified owner' },
  AWAITING_CLEARANCE: { label: 'Awaiting clearance', tone: 'red', public: 'Notice period over: hostel office reviewing' },
  HELD: { label: 'Clearance on hold', tone: 'slate', public: 'Held by the hostel office' },
  CLEARED: { label: 'Cleared by admin', tone: 'navy', public: 'Cleared by the hostel office' },
  TRANSFERRED: { label: 'Transferred', tone: 'slate', public: 'Handed over to a new owner' },
};

export const GRADE: Record<Grade, { label: string; short: string; tone: Tone; hint: string }> = {
  A: { label: 'A · Ride-ready', short: 'Ride-ready', tone: 'teal', hint: 'Nothing to fix; clean and inflate at most' },
  B: { label: 'B · Minor repair', short: 'Minor repair', tone: 'blue', hint: '1–2 small fixes: tyre, chain, brake, bell, stand' },
  C: { label: 'C · Major repair', short: 'Major repair', tone: 'amber', hint: 'Main part broken, 3+ fixes, or heavy rust' },
  D: { label: 'D · Salvage', short: 'Salvage', tone: 'red', hint: 'Bent/cracked frame or fork, or 4+ main parts' },
};

export const LISTING: Record<ListingStatus, { label: string; tone: Tone }> = {
  NONE: { label: 'Not listed', tone: 'slate' },
  DRAFT: { label: 'Draft listing', tone: 'blue' },
  LIVE: { label: 'Live', tone: 'teal' },
  RESERVED: { label: 'Reserved', tone: 'amber' },
  SOLD: { label: 'Sold', tone: 'slate' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'slate' },
};

export const SALVAGE: Record<SalvageStatus, { label: string; tone: Tone }> = {
  NONE: { label: '—', tone: 'slate' },
  REVIEW: { label: 'Salvage review', tone: 'amber' },
  DISMANTLING: { label: 'Authorised · dismantling', tone: 'blue' },
  PARTS_LOGGED: { label: 'Parts recovered', tone: 'teal' },
  RESIDUAL_PENDING: { label: 'Residual recycling pending', tone: 'amber' },
  COMPLETED: { label: 'Completed with evidence', tone: 'slate' },
};

export const CLAIM: Record<ClaimStatus, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Under review', tone: 'amber' },
  MORE_INFO: { label: 'More information needed', tone: 'blue' },
  APPROVED: { label: 'Approved', tone: 'teal' },
  REJECTED: { label: 'Not approved', tone: 'slate' },
  DISPUTED: { label: 'Disputed', tone: 'red' },
};

export const EXIT: Record<ExitStatus, { label: string; tone: Tone }> = {
  SUBMITTED: { label: 'Submitted', tone: 'amber' },
  VERIFIED: { label: 'Owner verified', tone: 'blue' },
  HANDOVER_SCHEDULED: { label: 'Handover scheduled', tone: 'blue' },
  RECEIVED: { label: 'Received · receipt issued', tone: 'teal' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'slate' },
};

export const FAULT_OPTIONS = [
  'Tyres / tubes',
  'Wheels / rims',
  'Chain',
  'Gears',
  'Brakes',
  'Frame / fork',
  'Handlebar',
  'Seat',
  'Pedals / cranks',
  'Stand / mudguard / bell',
  'Lock / key',
];

export const EVIDENCE_OPTIONS = [
  'Earlier photo of the cycle',
  'Unique mark / sticker',
  'Key or lock combination',
  'Purchase bill / receipt',
];

export const ROLE_LABEL = {
  admin: 'Admin · hostel office',
  auditor: 'Auditor · Pedals volunteer',
  mechanic: 'Mechanic · partner shop',
  student: 'Student',
} as const;

export const STUDENTS = [
  { id: 'S-21', persona: 'Returning owner', note: 'owns PP-0602, semester check due' },
  { id: 'S-14', persona: 'Claimant', note: 'claimed PP-0342' },
  { id: 'S-33', persona: 'Graduating owner', note: 'owns PP-0612, leaving campus' },
  { id: 'S-40', persona: 'Budget buyer', note: 'first-year, no cycle yet' },
];
