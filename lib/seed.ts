// SYNTHETIC DEMO FIXTURES — NOT THE FIELD AUDIT.
// The team's real ~160-cycle audit must be imported via /admin/import.
// Dates are generated relative to the moment of reset so the 7-day windows stay meaningful.
import type { AuditLogEntry, AuditSignals, Cycle, Db, Grade, RateCardItem, RepairItem } from './types';

const DAYMS = 24 * 60 * 60 * 1000;

export function buildSeed(nowMs = Date.now()): Db {
  const at = (daysAgo: number, hour = 10, min = 0) => {
    const d = new Date(nowMs - daysAgo * DAYMS);
    d.setHours(hour, min, 0, 0);
    return d.toISOString();
  };

  const rateCard: RateCardItem[] = [
    ['Tyres / tubes', 'Replace tyre + tube', 350],
    ['Tyres / tubes', 'Replace tube only', 150],
    ['Chain', 'Replace chain', 250],
    ['Chain', 'Clean + lubricate', 80],
    ['Brakes', 'Replace brake pads', 100],
    ['Brakes', 'Replace cable + adjust', 200],
    ['Wheels / rims', 'True / replace rim', 600],
    ['Gears', 'Tune / replace derailleur', 400],
    ['Seat', 'Replace seat', 250],
    ['Pedals / cranks', 'Replace pedal pair', 200],
    ['Handlebar', 'Replace grips / straighten', 150],
    ['Stand / mudguard / bell', 'Replace stand', 150],
    ['Lock / key', 'Cut lock (only after clearance)', 100],
  ].map(([component, operation, price], i) => ({
    id: 'RC-' + String(i + 1).padStart(2, '0'),
    component: component as string,
    operation: operation as string,
    marketPrice: price as number,
    partnerPrice: null,
    source: 'Illustrative placeholder: replace with written shop quote',
    verified: false,
    lastUpdated: at(10),
  }));

  let itemSeq = 0;
  const items = (...ops: string[]): RepairItem[] =>
    ops.map((op) => {
      const rc = rateCard.find((r) => r.operation === op)!;
      return { id: 'RI-' + ++itemSeq, component: rc.component, operation: rc.operation, marketPrice: rc.marketPrice };
    });

  const audit = (
    tag: string,
    daysAgo: number,
    who: string,
    s: Partial<AuditSignals> & { grade?: Grade | null },
  ): AuditSignals => ({
    tagNo: tag,
    inspectedAt: at(daysAgo, 7, 20),
    auditor: who,
    photoLink: 'Team Drive photo (demo placeholder)',
    lock: s.lock ?? 'Locked',
    rust: s.rust ?? 'Light',
    dust: s.dust ?? 'Light',
    blockedIn: s.blockedIn ?? false,
    sticker: s.sticker ?? 'Old',
    mainFault: s.mainFault ?? 'None',
    auditorGrade: s.grade ?? null,
    recheckAt: s.recheckAt === undefined ? at(daysAgo - 2, 8, 0) : s.recheckAt,
    moved: s.moved === undefined ? false : s.moved,
    tagIntact: s.tagIntact === undefined ? true : s.tagIntact,
    notes: s.notes ?? null,
  });

  const base = (id: string, p: Partial<Cycle>): Cycle => ({
    id,
    description: 'Single-speed hybrid',
    zone: 'North Parking Zone',
    bay: 'Bay A',
    spot: 'Bay A, row 1',
    ownerId: null,
    ownershipStatus: 'FLAGGED',
    grade: null,
    gradedBy: null,
    gradedAt: null,
    faults: [],
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
    lastVerified: null,
    selfReported: false,
    audit: null,
    tagIssuedAt: at(20),
    createdAt: at(20),
    updatedAt: at(1),
    provenance: 'DEMO',
    ...p,
  });

  const notice = (startDaysAgo: number, reminderDaysAgo: number | null = null) => ({
    noticeStart: at(startDaysAgo, 9, 0),
    noticeDeadline: at(startDaysAgo - 7, 9, 0),
    reminderAt: reminderDaysAgo == null ? null : at(reminderDaysAgo, 18, 0),
    physicalTagPlaced: true,
  });
  const graded = (g: Grade, by = 'M-01', daysAgo = 3) => ({ grade: g, gradedBy: by, gradedAt: at(daysAgo, 12, 20) });

  const cycles: Cycle[] = [
    // ---------- registered owners (prevent loop)
    base('PP-0101', { description: 'Black city cycle, basket', zone: 'North Parking Zone', bay: 'Bay A', spot: 'Bay A, row 2', ownerId: 'S-05', ownershipStatus: 'REGISTERED', ...graded('A', 'Owner self-report', 40), safety: 'UNCHECKED', selfReported: true, lastVerified: at(4, 19, 10), tagIssuedAt: at(60), createdAt: at(60) }),
    base('PP-0102', { description: 'Grey MTB, front suspension', bay: 'Bay A', spot: 'Bay A, row 4', ownerId: 'S-09', ownershipStatus: 'REGISTERED', ...graded('B', 'Owner self-report', 60), faults: ['Brakes'], selfReported: true, lastVerified: at(140), tagIssuedAt: at(140), createdAt: at(140) }),
    base('PP-0601', { description: 'Green hybrid, rear rack', zone: 'South Parking Zone', bay: 'Bay D', spot: 'Bay D, row 1', ownerId: 'S-11', ownershipStatus: 'REGISTERED', ...graded('A', 'Owner self-report', 90), selfReported: true, lastVerified: at(3, 8, 45), tagIssuedAt: at(120), createdAt: at(120) }),
    base('PP-0602', { description: 'Blue single-speed, white saddle', zone: 'South Parking Zone', bay: 'Bay D', spot: 'Bay D, row 2', ownerId: 'S-21', ownershipStatus: 'REGISTERED', ...graded('B', 'Owner self-report', 130), faults: ['Chain'], selfReported: true, lastVerified: at(132), tagIssuedAt: at(132), createdAt: at(132) }),
    base('PP-0610', { description: 'Red ladies cycle, basket', zone: 'South Parking Zone', bay: 'Bay C', spot: 'Bay C, row 1', ownerId: 'S-30', ownershipStatus: 'REGISTERED', ...graded('A', 'Owner self-report', 100), selfReported: true, lastVerified: at(2, 21, 5), tagIssuedAt: at(300), createdAt: at(300) }),
    base('PP-0612', { description: 'Black geared MTB', zone: 'South Parking Zone', bay: 'Bay C', spot: 'Bay C, row 3', ownerId: 'S-33', ownershipStatus: 'REGISTERED', ...graded('A', 'Owner self-report', 200), selfReported: true, lastVerified: at(135), tagIssuedAt: at(400), createdAt: at(400) }),

    // ---------- recover: flagged / notice / claims
    base('PP-0305', { description: 'Rusted single-speed, no saddle', bay: 'Bay B', spot: 'Bay B, row 5, last on right', ...graded('D', 'V-02', 2), faults: ['Frame / fork', 'Seat', 'Wheels / rims'], audit: audit('T305', 2, 'V-02', { lock: 'No lock', rust: 'Heavy', dust: 'Heavy', blockedIn: true, sticker: 'None', mainFault: 'Several main parts', grade: 'D', recheckAt: null, moved: null, tagIntact: null, notes: 'Bent fork, seat missing, rear rim buckled' }), tagIssuedAt: at(2), createdAt: at(2) }),
    base('PP-0311', { description: 'Silver hybrid', bay: 'Bay B', spot: 'Bay B, row 2, 3rd from left', audit: audit('T311', 4, 'V-05', { lock: 'Locked', rust: 'Moderate', dust: 'Heavy', blockedIn: true, sticker: 'Old', mainFault: 'Tyres / tubes', grade: null, notes: 'Grade not recorded on the day' }), tagIssuedAt: at(4), createdAt: at(4) }),
    base('PP-0215', { description: 'Yellow kids-frame cycle', zone: 'South Parking Zone', bay: 'Bay C', spot: 'Bay C, row 4', ownershipStatus: 'NOTICE_ACTIVE', ...graded('B', 'V-03', 6), faults: ['Tyres / tubes'], ...notice(3), audit: audit('T215', 7, 'V-03', { dust: 'Heavy', rust: 'Light', blockedIn: true, sticker: 'Old', mainFault: 'Tyres / tubes', grade: 'B' }) }),
    base('PP-0221', { description: 'Maroon MTB, broken bell', bay: 'Bay A', spot: 'Bay A, row 5, 2nd from left', ownershipStatus: 'NOTICE_ACTIVE', ...graded('C', 'V-03', 8), faults: ['Gears', 'Chain', 'Brakes'], ...notice(6), audit: audit('T221', 9, 'V-03', { lock: 'Chained to stand', rust: 'Heavy', dust: 'Heavy', blockedIn: true, sticker: 'None', mainFault: 'Several main parts', grade: 'C', notes: 'Gears seized, chain rusted, rear brake loose' }) }),
    base('PP-0342', { description: 'Red MTB, black grip tape, rear rack', bay: 'Bay B', spot: 'Bay B, row 1, 5th from left', ownershipStatus: 'CLAIM_PENDING', ...graded('B', 'V-02', 6), faults: ['Tyres / tubes', 'Chain'], ...notice(5, 2), audit: audit('T342', 7, 'V-02', { lock: 'Chained to stand', rust: 'Moderate', dust: 'Heavy', blockedIn: false, sticker: 'Old', mainFault: 'Tyres / tubes', grade: 'B' }) }),
    base('PP-0230', { description: 'White hybrid, rear carrier', zone: 'South Parking Zone', bay: 'Bay C', spot: 'Bay C, row 2', ownershipStatus: 'DISPUTED', ...graded('C', 'V-05', 9), faults: ['Wheels / rims', 'Brakes', 'Chain'], ...notice(9, 6), audit: audit('T230', 11, 'V-05', { rust: 'Moderate', dust: 'Heavy', blockedIn: true, sticker: 'Old', mainFault: 'Wheels / rims', grade: 'C' }) }),
    base('PP-0118', { description: 'Blue hybrid, single-speed', bay: 'Bay A', spot: 'Bay A, row 3, 4th from left', ownershipStatus: 'AWAITING_CLEARANCE', ...graded('B', 'M-01', 1), faults: ['Tyres / tubes', 'Chain', 'Brakes'], repairItems: items('Replace tyre + tube', 'Replace chain', 'Replace cable + adjust'), safety: 'SAFE', safetyNote: 'Frame and fork checked', refurbishedValueV: 2500, salePriceS: 700, ...notice(9, 6), audit: audit('T118', 11, 'V-02', { lock: 'Locked', rust: 'Moderate', dust: 'Heavy', blockedIn: true, sticker: 'Old', mainFault: 'Tyres / tubes', grade: 'B' }) }),
    base('PP-0125', { description: 'Black roadster, rod brakes', bay: 'Bay B', spot: 'Bay B, row 3', ownershipStatus: 'AWAITING_CLEARANCE', ...notice(10, 7), audit: audit('T125', 12, 'V-05', { lock: 'No lock', rust: 'Heavy', dust: 'Heavy', blockedIn: true, sticker: 'None', mainFault: 'Several main parts', grade: null, notes: 'Auditor unsure of grade, needs mechanic' }) }),
    base('PP-0512', { description: 'Orange MTB, disc brakes', zone: 'South Parking Zone', bay: 'Bay D', spot: 'Bay D, row 4', ownerId: 'S-17', ownershipStatus: 'OWNER_VERIFIED', ...graded('C', 'V-03', 18), faults: ['Gears', 'Tyres / tubes', 'Chain'], ...notice(20, 17), lastVerified: at(13), audit: audit('T512', 22, 'V-03', { rust: 'Light', dust: 'Heavy', blockedIn: true, sticker: 'Old', mainFault: 'Gears', grade: 'C' }) }),

    // ---------- reuse: cleared stock
    base('PP-0402', { description: 'Teal hybrid, 7-speed', zone: 'North Parking Zone', bay: 'Bay B', spot: 'Storage bay, slot 1', ownershipStatus: 'CLEARED', ...graded('A', 'M-01', 9), safety: 'SAFE', safetyNote: 'Brakes, frame, tyres checked', refurbishedValueV: 1800, salePriceS: 1500, listingStatus: 'LIVE', ...notice(24, 21), audit: audit('T402', 26, 'V-02', { lock: 'Unlocked', dust: 'Heavy', blockedIn: true, sticker: 'Old', mainFault: 'None', grade: 'A' }) }),
    base('PP-0410', { description: 'Blue MTB, front suspension', zone: 'North Parking Zone', bay: 'Bay B', spot: 'Storage bay, slot 2', ownershipStatus: 'CLEARED', ...graded('B', 'M-01', 8), faults: ['Tyres / tubes', 'Chain', 'Brakes'], repairItems: items('Replace tube only', 'Replace chain', 'Replace brake pads'), safety: 'SAFE', safetyNote: 'Frame and fork checked', refurbishedValueV: 2000, salePriceS: 800, listingStatus: 'LIVE', ...notice(24, 21), audit: audit('T410', 26, 'V-02', { rust: 'Moderate', dust: 'Heavy', blockedIn: true, sticker: 'Old', mainFault: 'Tyres / tubes', grade: 'B' }) }),
    base('PP-0415', { description: 'Black hybrid, mudguards', zone: 'North Parking Zone', bay: 'Bay A', spot: 'Storage bay, slot 3', ownershipStatus: 'CLEARED', ...graded('B', 'M-01', 8), faults: ['Tyres / tubes', 'Brakes'], repairItems: items('Replace tube only', 'Replace brake pads'), safety: 'SAFE', safetyNote: 'Frame and fork checked', refurbishedValueV: 2000, salePriceS: 900, listingStatus: 'RESERVED', ...notice(24, 21), audit: audit('T415', 26, 'V-05', { rust: 'Light', dust: 'Heavy', blockedIn: true, sticker: 'Old', mainFault: 'Tyres / tubes', grade: 'B' }) }),
    base('PP-0420', { description: 'Grey city cycle', zone: 'North Parking Zone', bay: 'Bay A', spot: 'Handed over', ownerId: 'S-48', ownershipStatus: 'TRANSFERRED', ...graded('A', 'M-01', 12), safety: 'SAFE', safetyNote: 'Checked before sale', refurbishedValueV: 1700, salePriceS: 1400, listingStatus: 'SOLD', ...notice(28, 25), audit: audit('T420', 30, 'V-02', { dust: 'Heavy', blockedIn: true, sticker: 'Old', mainFault: 'None', grade: 'A' }) }),
    base('PP-0207', { description: 'Green geared MTB', zone: 'South Parking Zone', bay: 'Bay C', spot: 'Storage bay, slot 4', ownershipStatus: 'CLEARED', ...graded('C', 'M-01', 1), faults: ['Wheels / rims', 'Gears', 'Seat', 'Chain'], repairItems: items('True / replace rim', 'Tune / replace derailleur', 'Replace seat', 'Replace chain'), safety: 'SAFE', safetyNote: 'Frame OK; drivetrain and rear wheel worn out', refurbishedValueV: 3000, salePriceS: null, ...notice(17, 14), audit: audit('T207', 19, 'V-03', { lock: 'No lock', rust: 'Heavy', dust: 'Heavy', blockedIn: true, sticker: 'None', mainFault: 'Several main parts', grade: 'C' }) }),
    base('PP-0130', { description: 'Silver MTB, cracked down-tube', bay: 'Bay A', spot: 'Storage bay, slot 5', ownershipStatus: 'CLEARED', ...graded('C', 'M-01', 2), faults: ['Tyres / tubes', 'Chain', 'Frame / fork'], repairItems: items('Replace tyre + tube', 'Replace chain'), safety: 'UNSAFE', safetyNote: 'Hairline crack at down-tube weld', refurbishedValueV: 2000, salePriceS: null, ...notice(17, 14), audit: audit('T130', 19, 'V-05', { rust: 'Moderate', dust: 'Heavy', blockedIn: true, sticker: 'Old', mainFault: 'Frame / fork', grade: 'C' }) }),
    base('PP-0505', { description: 'Rusted roadster, both rims bent', zone: 'South Parking Zone', bay: 'Bay D', spot: 'Salvage corner', ownershipStatus: 'CLEARED', ...graded('D', 'M-01', 10), faults: ['Wheels / rims', 'Frame / fork', 'Brakes', 'Chain'], safety: 'UNSAFE', safetyNote: 'Bent fork', salvageStatus: 'PARTS_LOGGED', ...notice(24, 21), audit: audit('T505', 26, 'V-03', { lock: 'No lock', rust: 'Heavy', dust: 'Heavy', blockedIn: true, sticker: 'None', mainFault: 'Several main parts', grade: 'D' }) }),
  ];

  const log: AuditLogEntry[] = [];
  let logSeq = 0;
  const L = (atIso: string, actor: string, role: AuditLogEntry['role'], entityId: string, action: string, summary: string, entity = 'cycle') =>
    log.push({ id: 'L-' + String(++logSeq).padStart(4, '0'), at: atIso, actor, role, entity, entityId, action, summary });

  for (const c of cycles) {
    if (c.audit?.inspectedAt) {
      L(c.audit.inspectedAt, 'Volunteer ' + c.audit.auditor, 'auditor', c.id, 'AUDITED', `Field audit, tag ${c.audit.tagNo}, ${c.spot}; permanent QR issued`);
      if (c.audit.recheckAt) L(c.audit.recheckAt, 'Volunteer ' + c.audit.auditor, 'auditor', c.id, 'RECHECKED', `Re-check: ${c.audit.moved ? 'moved' : 'not moved'}, tag ${c.audit.tagIntact ? 'intact' : 'missing'}`);
    } else {
      L(c.createdAt, 'Student ' + c.ownerId, 'student', c.id, 'REGISTERED', 'Owner registered cycle; permanent QR issued');
    }
    if (c.noticeStart) L(c.noticeStart, 'Volunteer V-03', 'auditor', c.id, 'NOTICE_PLACED', 'Physical notice on cycle + hostel notice board; proposed 7-day claim window opened');
    if (c.reminderAt) L(c.reminderAt, 'Volunteer V-03', 'auditor', c.id, 'REMINDER_LOGGED', 'Mid-way reminder logged (manual, not an automated send)');
    if (c.noticeDeadline && Date.parse(c.noticeDeadline) < nowMs && ['AWAITING_CLEARANCE', 'CLEARED', 'TRANSFERRED', 'DISPUTED'].includes(c.ownershipStatus))
      L(c.noticeDeadline, 'System', 'system', c.id, 'WINDOW_CLOSED', 'Claim window closed. Status → awaiting clearance (no disposal permitted)');
    if (c.gradedAt && !c.selfReported) L(c.gradedAt, c.gradedBy!.startsWith('M') ? 'Mechanic ' + c.gradedBy : 'Volunteer ' + c.gradedBy, c.gradedBy!.startsWith('M') ? 'mechanic' : 'auditor', c.id, 'GRADED', `Grade ${c.grade}` + (c.repairItems.length ? `, R ₹${c.repairItems.reduce((s, i) => s + i.marketPrice, 0)}` : ''));
  }

  const clearedIds = ['PP-0402', 'PP-0410', 'PP-0415', 'PP-0420', 'PP-0207', 'PP-0130', 'PP-0505'];
  const clearances = clearedIds.map((id, i) => {
    const c = cycles.find((x) => x.id === id)!;
    const t = new Date(Date.parse(c.noticeDeadline!) + DAYMS).toISOString();
    L(t, 'Hostel office', 'admin', id, 'CLEARANCE_APPROVED', 'Written clearance recorded: no claim after notice and reminder');
    return { id: 'CL-' + (i + 1), cycleId: id, decision: 'APPROVED' as const, authority: 'Hostel office (demo signatory)', reason: 'No claim after notice + reminder; audit shows long idle', at: t };
  });

  const claims = [
    { id: 'CM-1', cycleId: 'PP-0342', claimantId: 'S-14', evidence: ['Earlier photo of the cycle', 'Key or lock combination'], description: 'Red MTB with black grip tape and a rear rack. I have the key to the chain lock.', submittedAt: at(0, 10, 15), status: 'SUBMITTED' as const, reviewNote: null, reviewedAt: null, reviewedBy: null },
    { id: 'CM-2', cycleId: 'PP-0230', claimantId: 'S-19', evidence: ['Earlier photo of the cycle'], description: 'White hybrid, I parked it there before the break.', submittedAt: at(5, 13, 0), status: 'DISPUTED' as const, reviewNote: 'Second claimant also submitted; escalated', reviewedAt: at(4), reviewedBy: 'Hostel office' },
    { id: 'CM-3', cycleId: 'PP-0230', claimantId: 'S-26', evidence: ['Purchase bill / receipt'], description: 'Bought from a senior last year, have the handover note.', submittedAt: at(4, 17, 30), status: 'DISPUTED' as const, reviewNote: 'Competing claim; escalated to warden’s office', reviewedAt: at(4), reviewedBy: 'Hostel office' },
    { id: 'CM-4', cycleId: 'PP-0512', claimantId: 'S-17', evidence: ['Key or lock combination', 'Unique mark / sticker'], description: 'Orange MTB, my name sticker under the saddle.', submittedAt: at(15, 11, 0), status: 'APPROVED' as const, reviewNote: 'Key verified at hostel desk; sticker matches', reviewedAt: at(13), reviewedBy: 'Hostel office' },
  ];
  L(at(0, 10, 15), 'Student S-14', 'student', 'PP-0342', 'CLAIM_SUBMITTED', 'Owner claim submitted (photo, key). Disposal paused');
  L(at(4), 'Hostel office', 'admin', 'PP-0230', 'CLAIM_DISPUTED', 'Two claimants; escalated to warden’s office');
  L(at(13), 'Hostel office', 'admin', 'PP-0512', 'CLAIM_APPROVED', 'Claim approved; returned to owner S-17');

  const listings = [
    { cycleId: 'PP-0402', priceS: 1500, draftedAt: at(6), draftedBy: 'Volunteer V-02', approvedAt: at(5, 16, 0), approvedBy: 'Hostel office', reservedBy: null, reservedAt: null, buyerShopChoice: null, soldAt: null, receiptNo: null },
    { cycleId: 'PP-0410', priceS: 800, draftedAt: at(2), draftedBy: 'Volunteer V-02', approvedAt: at(1, 17, 5), approvedBy: 'Hostel office', reservedBy: null, reservedAt: null, buyerShopChoice: null, soldAt: null, receiptNo: null },
    { cycleId: 'PP-0415', priceS: 900, draftedAt: at(6), draftedBy: 'Volunteer V-05', approvedAt: at(5, 16, 0), approvedBy: 'Hostel office', reservedBy: 'S-52', reservedAt: at(1, 20, 0), buyerShopChoice: 'partner' as const, soldAt: null, receiptNo: null },
    { cycleId: 'PP-0420', priceS: 1400, draftedAt: at(10), draftedBy: 'Volunteer V-02', approvedAt: at(9), approvedBy: 'Hostel office', reservedBy: 'S-48', reservedAt: at(8), buyerShopChoice: 'regular' as const, soldAt: at(7, 18, 0), receiptNo: 'PPR-0001' },
  ];
  L(at(1, 17, 5), 'Hostel office', 'admin', 'PP-0410', 'LISTING_APPROVED', 'Listing approved at ₹800 (cycle only)');
  L(at(5, 16, 0), 'Hostel office', 'admin', 'PP-0402', 'LISTING_APPROVED', 'Listing approved at ₹1,500 (cycle only)');
  L(at(1, 20, 0), 'Student S-52', 'student', 'PP-0415', 'RESERVED', 'Reserved; buyer leaning to partner shop for repairs');
  L(at(7, 18, 0), 'Hostel office', 'admin', 'PP-0420', 'SOLD', 'Handover recorded, receipt PPR-0001 (₹1,400 cycle only)');

  const salvage = [
    {
      cycleId: 'PP-0505',
      parts: [
        { id: 'SP-1', part: 'Front wheel (rim + tyre)', condition: 'Good, true', quantity: 1, destination: 'Spares shelf → B/C repairs', loggedAt: at(6) },
        { id: 'SP-2', part: 'Seat', condition: 'Usable', quantity: 1, destination: 'Spares shelf', loggedAt: at(6) },
        { id: 'SP-3', part: 'Pedal pair', condition: 'Usable', quantity: 2, destination: 'Spares shelf', loggedAt: at(6) },
        { id: 'SP-4', part: 'Brakes', condition: 'Failed, not reusable', quantity: 1, destination: 'Recycling (not reusable)', loggedAt: at(6) },
      ],
      residual: 'Steel frame, bent fork, rear rim',
      recyclerStatus: 'PENDING_PARTNER' as const,
      evidence: null,
      authorisedBy: 'Hostel office',
      completedAt: null,
    },
  ];
  L(at(8), 'Hostel office', 'admin', 'PP-0505', 'SALVAGE_AUTHORISED', 'Dismantling authorised (Grade D, unsafe fork)');
  L(at(6), 'Volunteer V-03', 'auditor', 'PP-0505', 'PARTS_LOGGED', '3 reusable parts logged; failed brakes sent to recycling pile');

  const term = '2026-27 Odd';
  const confirmations = [
    { id: 'SC-1', cycleId: 'PP-0101', ownerId: 'S-05', term, respondedAt: at(4, 19, 10), stillOwned: true, locationChanged: false, newSpot: null, faults: [], wantsExit: false },
    { id: 'SC-2', cycleId: 'PP-0601', ownerId: 'S-11', term, respondedAt: at(3, 8, 45), stillOwned: true, locationChanged: false, newSpot: null, faults: [], wantsExit: false },
    { id: 'SC-3', cycleId: 'PP-0610', ownerId: 'S-30', term, respondedAt: at(2, 21, 5), stillOwned: true, locationChanged: false, newSpot: null, faults: [], wantsExit: true },
  ];
  for (const s of confirmations) L(s.respondedAt, 'Student ' + s.ownerId, 'student', s.cycleId, 'SEMESTER_CONFIRMED', 'Semester self-check: still mine, same spot');

  const reminders = [
    { id: 'RM-1', kind: 'NOTICE_MIDWAY' as const, cycleId: 'PP-0342', at: at(2, 18, 0), by: 'Volunteer V-03', note: 'Mid-way reminder on hostel notice board' },
    { id: 'RM-2', kind: 'NOTICE_MIDWAY' as const, cycleId: 'PP-0118', at: at(6, 18, 0), by: 'Volunteer V-03', note: 'Mid-way reminder on hostel notice board' },
    { id: 'RM-3', kind: 'NOTICE_MIDWAY' as const, cycleId: 'PP-0125', at: at(7, 18, 0), by: 'Volunteer V-03', note: 'Mid-way reminder on hostel notice board' },
    { id: 'RM-4', kind: 'SEMESTER' as const, cycleId: null, at: at(7, 9, 0), by: 'Hostel office', note: 'Semester self-check opened: notice board + QR standee (manual, not an automated send)' },
  ];

  const exits = [
    { id: 'EX-1', cycleId: 'PP-0610', ownerId: 'S-30', choice: 'DONATE' as const, expectedPrice: null, handoverPref: 'Hostel desk, weekday evening', status: 'SUBMITTED' as const, submittedAt: at(1, 21, 30), handoverAt: null, receiptNo: null },
  ];
  L(at(1, 21, 30), 'Student S-30', 'student', 'PP-0610', 'EXIT_OFFER', 'Final-year owner offered to DONATE this cycle');

  log.sort((a, b) => a.at.localeCompare(b.at));

  return {
    version: 1,
    seededAt: new Date(nowMs).toISOString(),
    cycles,
    claims,
    clearances,
    listings,
    salvage,
    confirmations,
    reminders,
    exits,
    rateCard,
    log,
    settings: {
      term,
      noticeDays: 7,
      thresholdPct: 40,
      discountPct: 20,
      discountConfirmed: false,
      idPrefix: 'PP-',
      receiptFooter: 'Pedals pilot receipt: cycle price only. Repairs are paid directly to the mechanic the buyer chooses.',
      datasetMode: 'DEMO',
      semesterStart: at(7, 9, 0),
      semesterEnd: at(-9, 18, 0),
      pilotArea: 'Pilot hostel parking · Bays A–D',
      costs: [
        { label: 'Tags & notices', basis: 'per cycle', amount: '₹15 (team estimate)' },
        { label: 'Mechanic inspection', basis: 'per cycle', amount: '₹30 (team estimate)' },
        { label: 'Storage & transport', basis: 'pilot', amount: '₹0 (hostel space, to confirm)' },
        { label: 'Volunteer hours', basis: 'pilot', amount: '≈70 h (9–12 h per person)' },
        { label: 'Hosting & domain', basis: 'per term', amount: '₹500 (team estimate)' },
        { label: 'Authorised recycling', basis: 'pilot', amount: 'earns ≈₹250 (unconfirmed)' },
      ],
    },
  };
}
