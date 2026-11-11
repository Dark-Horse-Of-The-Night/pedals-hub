// Central domain model for Pedals Hub.
// Ownership state, mechanical grade, listing state and salvage state are kept
// as SEPARATE fields on purpose: a broken bike is never "ours" because it is broken.

export type Role = 'admin' | 'auditor' | 'mechanic' | 'student';

export type OwnershipStatus =
  | 'REGISTERED' // owner known via student registration
  | 'IN_USE' // re-check showed it moved / clearance denied: treat as owned, not abandoned
  | 'FLAGGED' // audited with abandonment signals, re-check / notice pending
  | 'NOTICE_ACTIVE' // physical notice placed, proposed claim window open
  | 'CLAIM_PENDING' // at least one owner claim submitted, disposal paused
  | 'DISPUTED' // competing or contested claims, escalated
  | 'OWNER_VERIFIED' // admin approved a claim; owner-controlled, never disposable
  | 'AWAITING_CLEARANCE' // window over without a valid claim; STILL not disposable
  | 'HELD' // admin put clearance on hold
  | 'CLEARED' // authorised admin explicitly cleared for disposition
  | 'TRANSFERRED'; // sold / handed over with receipt

export type Grade = 'A' | 'B' | 'C' | 'D';
export type SafetyStatus = 'UNCHECKED' | 'SAFE' | 'UNSAFE';
export type ListingStatus = 'NONE' | 'DRAFT' | 'LIVE' | 'RESERVED' | 'SOLD' | 'WITHDRAWN';
export type SalvageStatus = 'NONE' | 'REVIEW' | 'DISMANTLING' | 'PARTS_LOGGED' | 'RESIDUAL_PENDING' | 'COMPLETED';
export type Provenance = 'DEMO' | 'IMPORTED' | 'USER_ENTERED';

/** Columns of the team's field-audit sheet (ProjectPedals_Audit.xlsx, "Audit" tab). */
export interface AuditSignals {
  tagNo: string;
  inspectedAt: string | null; // ISO
  auditor: string | null; // initials only
  photoLink: string | null;
  lock: string | null; // Locked / Unlocked / Chained to stand / No lock
  rust: string | null; // None / Light / Moderate / Heavy
  dust: string | null; // None / Light / Heavy
  blockedIn: boolean | null;
  sticker: string | null; // Current / Old / None
  mainFault: string | null;
  auditorGrade: Grade | null;
  recheckAt: string | null;
  moved: boolean | null;
  tagIntact: boolean | null;
  notes: string | null;
  sourceRow?: number;
  sourceFile?: string;
}

export interface RepairItem {
  id: string;
  component: string;
  operation: string;
  marketPrice: number; // conservative regular-mechanic quote, used for R
}

export interface Cycle {
  id: string; // e.g. PP-0118 — printed under the permanent QR
  description: string;
  zone: string;
  bay: string;
  spot: string;
  ownerId: string | null; // pseudonymous demo ID, never shown on public QR page
  ownershipStatus: OwnershipStatus;
  preClaimStatus?: OwnershipStatus | null; // restored if a claim is rejected
  grade: Grade | null;
  gradedBy: string | null;
  gradedAt: string | null;
  faults: string[];
  repairItems: RepairItem[];
  safety: SafetyStatus;
  safetyNote: string | null;
  refurbishedValueV: number | null; // expected resale value AFTER repair (not MRP, not S)
  salePriceS: number | null; // as-is cycle price paid to Pedals
  listingStatus: ListingStatus;
  salvageStatus: SalvageStatus;
  noticeStart: string | null;
  noticeDeadline: string | null;
  reminderAt: string | null;
  physicalTagPlaced: boolean;
  lastVerified: string | null;
  selfReported: boolean; // condition came from the owner, not a mechanic
  audit: AuditSignals | null;
  tagIssuedAt: string;
  createdAt: string;
  updatedAt: string;
  provenance: Provenance;
}

export type ClaimStatus = 'SUBMITTED' | 'MORE_INFO' | 'APPROVED' | 'REJECTED' | 'DISPUTED';
export interface Claim {
  id: string;
  cycleId: string;
  claimantId: string;
  evidence: string[];
  description: string;
  submittedAt: string;
  status: ClaimStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

export type ClearanceDecision = 'APPROVED' | 'HELD' | 'DENIED';
export interface Clearance {
  id: string;
  cycleId: string;
  decision: ClearanceDecision;
  authority: string;
  reason: string;
  at: string;
}

export interface Listing {
  cycleId: string;
  priceS: number;
  draftedAt: string;
  draftedBy: string;
  approvedAt: string | null;
  approvedBy: string | null;
  reservedBy: string | null;
  reservedAt: string | null;
  buyerShopChoice: 'partner' | 'regular' | 'undecided' | null;
  soldAt: string | null;
  receiptNo: string | null;
}

export interface SalvagePart {
  id: string;
  part: string;
  condition: string;
  quantity: number;
  destination: string;
  loggedAt: string;
}
export interface SalvageRecord {
  cycleId: string;
  parts: SalvagePart[];
  residual: string | null;
  recyclerStatus: 'PENDING_PARTNER' | 'HANDED_TO_RECYCLER';
  evidence: string | null;
  authorisedBy: string | null;
  completedAt: string | null;
}

export interface SemesterConfirmation {
  id: string;
  cycleId: string;
  ownerId: string;
  term: string;
  respondedAt: string;
  stillOwned: boolean;
  locationChanged: boolean;
  newSpot: string | null;
  faults: string[];
  wantsExit: boolean;
}

export interface Reminder {
  id: string;
  kind: 'NOTICE_MIDWAY' | 'SEMESTER' | 'FOLLOW_UP';
  cycleId: string | null;
  at: string;
  by: string;
  note: string;
}

export type ExitStatus = 'SUBMITTED' | 'VERIFIED' | 'HANDOVER_SCHEDULED' | 'RECEIVED' | 'WITHDRAWN';
export interface ExitOffer {
  id: string;
  cycleId: string;
  ownerId: string;
  choice: 'DONATE' | 'SELL';
  expectedPrice: number | null;
  handoverPref: string;
  status: ExitStatus;
  submittedAt: string;
  handoverAt: string | null;
  receiptNo: string | null;
}

export interface RateCardItem {
  id: string;
  component: string;
  operation: string;
  marketPrice: number;
  partnerPrice: number | null; // null => derive from indicative discount
  source: string;
  verified: boolean;
  lastUpdated: string;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  actor: string;
  role: Role | 'system';
  entity: string;
  entityId: string;
  action: string;
  summary: string;
}

export interface Settings {
  term: string;
  noticeDays: number; // proposed, subject to approval
  thresholdPct: number; // team-proposed repair-viability cut-off
  discountPct: number; // indicative partner discount
  discountConfirmed: boolean;
  idPrefix: string;
  receiptFooter: string;
  datasetMode: 'DEMO' | 'IMPORTED';
  semesterStart: string;
  semesterEnd: string;
  pilotArea: string;
  costs: { label: string; basis: string; amount: string }[];
}

export interface Db {
  version: 1;
  seededAt: string;
  cycles: Cycle[];
  claims: Claim[];
  clearances: Clearance[];
  listings: Listing[];
  salvage: SalvageRecord[];
  confirmations: SemesterConfirmation[];
  reminders: Reminder[];
  exits: ExitOffer[];
  rateCard: RateCardItem[];
  log: AuditLogEntry[];
  settings: Settings;
}

export interface Actor {
  role: Role;
  name: string; // display, e.g. "Hostel office" or "S-21"
  studentId: string | null;
}
