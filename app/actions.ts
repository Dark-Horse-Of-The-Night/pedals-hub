'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import * as ops from '@/lib/ops';
import { DomainError } from '@/lib/rules';
import { mutate, resetDemo } from '@/lib/store';
import { staffActor, studentActor } from '@/lib/session';
import type { Actor, Db } from '@/lib/types';
import { commitImport, parseAuditFile, readPreview, savePreview, clearPreview } from '@/lib/importer';

function backOf(fd: FormData, fallback: string) {
  const b = String(fd.get('back') ?? '');
  return b.startsWith('/') && !b.startsWith('//') ? b : fallback;
}
function withFlash(path: string, key: 'ok' | 'err', msg: string) {
  const [p, q = ''] = path.split('?');
  const sp = new URLSearchParams(q);
  sp.delete('ok');
  sp.delete('err');
  sp.set(key, msg);
  return `${p}?${sp.toString()}`;
}

async function run(
  fd: FormData,
  kind: 'staff' | 'student',
  fallback: string,
  fn: (db: Db, a: Actor) => string | void | null | undefined,
  okMsg: string | ((r: string | void | null | undefined) => string),
  next?: (r: string | void | null | undefined) => string,
) {
  const back = backOf(fd, fallback);
  let target: string;
  try {
    const actor = kind === 'staff' ? await staffActor() : await studentActor();
    const r = await mutate((db) => fn(db, actor));
    target = withFlash(next ? next(r) : back, 'ok', typeof okMsg === 'function' ? okMsg(r) : okMsg);
  } catch (e) {
    if (!(e instanceof DomainError)) console.error(e);
    target = withFlash(back, 'err', e instanceof DomainError ? e.message : 'Something went wrong. Nothing was changed.');
  }
  revalidatePath('/', 'layout');
  redirect(target);
}

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const all = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);
const numOrNull = (v: string) => (v === '' ? null : Number(v));

// ---------------------------------------------------------------- demo controls
export async function setRole(fd: FormData) {
  const jar = await cookies();
  jar.set('pp_role', s(fd, 'role'), { path: '/', sameSite: 'lax' });
  revalidatePath('/', 'layout');
  redirect(backOf(fd, '/admin'));
}
export async function setStudent(fd: FormData) {
  const jar = await cookies();
  jar.set('pp_student', s(fd, 'student'), { path: '/', sameSite: 'lax' });
  revalidatePath('/', 'layout');
  redirect(backOf(fd, '/app'));
}
export async function resetDemoData(fd: FormData) {
  const a = await staffActor();
  if (a.role !== 'admin') redirect(withFlash(backOf(fd, '/admin/settings'), 'err', 'Only the admin role can reset demo data.'));
  await resetDemo();
  clearPreview();
  revalidatePath('/', 'layout');
  redirect(withFlash(backOf(fd, '/admin'), 'ok', 'Demo data reset to the 22 synthetic fixture records.'));
}

// ---------------------------------------------------------------- recover
export async function aRecheck(fd: FormData) {
  return run(fd, 'staff', '/admin', (db, a) => ops.recordRecheck(db, a, { id: s(fd, 'id'), moved: s(fd, 'moved') === 'yes', tagIntact: s(fd, 'tagIntact') !== 'no' }), 'Re-check recorded.');
}
export async function aStartNotice(fd: FormData) {
  return run(fd, 'staff', '/admin', (db, a) => ops.startNotice(db, a, { id: s(fd, 'id'), physicalTagPlaced: fd.get('physicalTagPlaced') === 'on' ? true : false, channels: all(fd, 'channels') }), 'Notice placed. Claim window open.');
}
export async function aReminder(fd: FormData) {
  return run(fd, 'staff', '/admin/claims', (db, a) => ops.logNoticeReminder(db, a, { id: s(fd, 'id') }), 'Reminder logged (no message was sent: demo log only).');
}
export async function aReviewClaim(fd: FormData) {
  const d = s(fd, 'decision');
  const msg: Record<string, string> = { APPROVE: 'Claim approved. The cycle is back with its owner and out of every disposal queue.', MORE_INFO: 'Asked the claimant for more evidence.', REJECT: 'Claim not approved.', DISPUTE: 'Escalated as a dispute.' };
  return run(fd, 'staff', '/admin/claims', (db, a) => ops.reviewClaim(db, a, { claimId: s(fd, 'claimId'), decision: d, note: s(fd, 'note') }), msg[d] ?? 'Saved.');
}
export async function aClearance(fd: FormData) {
  const d = s(fd, 'decision');  return run(fd, 'staff', '/admin', (db, a) => ops.decideClearance(db, a, { id: s(fd, 'id'), decision: d, reason: s(fd, 'reason') }), d === 'APPROVED' ? 'Clearance recorded. Disposal routes are now unlocked.' : d === 'HELD' ? 'Clearance put on hold.' : 'Clearance denied: cycle treated as owned.');
}

// ---------------------------------------------------------------- technical
export async function aSaveReview(fd: FormData) {
  return run(
    fd,
    'staff',
    '/admin',
    (db, a) => {
      const payload = JSON.parse(s(fd, 'payload') || '{}');
      return ops.saveTechnicalReview(db, a, payload);
    },
    'Technical review saved.',
  );
}
export async function aDraftListing(fd: FormData) {
  return run(fd, 'staff', '/admin/marketplace', (db, a) => ops.draftListing(db, a, { id: s(fd, 'id') }), 'Draft listing created. It needs admin approval to go live.');
}
export async function aApproveListing(fd: FormData) {
  return run(fd, 'staff', '/admin/marketplace', (db, a) => ops.approveListing(db, a, { id: s(fd, 'id') }), 'Listing approved. Students can now see it.');
}
export async function aWithdrawListing(fd: FormData) {
  return run(fd, 'staff', '/admin/marketplace', (db, a) => ops.withdrawListing(db, a, { id: s(fd, 'id'), reason: s(fd, 'reason') || 'Withdrawn by admin' }), 'Listing withdrawn.');
}
export async function aCancelReservation(fd: FormData) {
  return run(fd, 'staff', '/admin/marketplace', (db, a) => ops.cancelReservation(db, a, { id: s(fd, 'id') }), 'Reservation released.');
}
export async function aRecordSale(fd: FormData) {
  return run(fd, 'staff', '/admin/marketplace', (db, a) => ops.recordSale(db, a, { id: s(fd, 'id') }), (r) => `Handover recorded with receipt ${r}. Cycle price only; no real payment taken.`);
}

// ---------------------------------------------------------------- salvage
export async function aSalvageReview(fd: FormData) {
  return run(fd, 'staff', '/admin/salvage', (db, a) => ops.markSalvageReview(db, a, { id: s(fd, 'id') }), 'Routed to salvage review.');
}
export async function aAuthoriseSalvage(fd: FormData) {
  return run(fd, 'staff', '/admin/salvage', (db, a) => ops.authoriseSalvage(db, a, { id: s(fd, 'id'), reason: s(fd, 'reason') }), 'Dismantling authorised.');
}
export async function aLogPart(fd: FormData) {
  return run(fd, 'staff', '/admin/salvage', (db, a) => ops.logSalvagePart(db, a, { id: s(fd, 'id'), part: s(fd, 'part'), condition: s(fd, 'condition'), quantity: s(fd, 'quantity') || '1', destination: s(fd, 'destination') }), 'Part logged.');
}
export async function aResidual(fd: FormData) {
  return run(fd, 'staff', '/admin/salvage', (db, a) => ops.setResidual(db, a, { id: s(fd, 'id'), residual: s(fd, 'residual') }), 'Residual material recorded as awaiting an authorised recycler.');
}
export async function aCompleteSalvage(fd: FormData) {
  return run(fd, 'staff', '/admin/salvage', (db, a) => ops.completeSalvage(db, a, { id: s(fd, 'id'), evidence: s(fd, 'evidence') }), 'Salvage record closed with evidence.');
}

// ---------------------------------------------------------------- prevent
export async function aSemesterReminder(fd: FormData) {
  return run(fd, 'staff', '/admin/semester', (db, a) => ops.logSemesterReminder(db, a, { cycleId: s(fd, 'cycleId') || null, note: s(fd, 'note') || 'Reminder round' }), 'Reminder logged (demo: nothing was sent).');
}
export async function aExit(fd: FormData) {
  return run(fd, 'staff', '/admin/exit', (db, a) => ops.advanceExit(db, a, { id: s(fd, 'id'), step: s(fd, 'step'), when: s(fd, 'when') || undefined }), 'Exit offer updated.');
}

// ---------------------------------------------------------------- partners + settings
export async function aRateCard(fd: FormData) {
  return run(
    fd,
    'staff',
    '/admin/repairs',
    (db, a) =>
      ops.upsertRateCard(db, a, {
        id: s(fd, 'id') || undefined,
        component: s(fd, 'component'),
        operation: s(fd, 'operation'),
        marketPrice: s(fd, 'marketPrice'),
        partnerPrice: numOrNull(s(fd, 'partnerPrice')),
        source: s(fd, 'source'),
        verified: fd.get('verified') === 'on',
      }),
    'Rate card saved.',
  );
}
export async function aSettings(fd: FormData) {
  return run(
    fd,
    'staff',
    '/admin/settings',
    (db, a) =>
      ops.updateSettings(db, a, {
        term: s(fd, 'term'),
        noticeDays: s(fd, 'noticeDays'),
        thresholdPct: s(fd, 'thresholdPct'),
        discountPct: s(fd, 'discountPct'),
        discountConfirmed: fd.get('discountConfirmed') === 'on',
        idPrefix: s(fd, 'idPrefix'),
        receiptFooter: s(fd, 'receiptFooter'),
        semesterStart: s(fd, 'semesterStart'),
        semesterEnd: s(fd, 'semesterEnd'),
      }),
    'Settings saved.',
  );
}

// ---------------------------------------------------------------- import
export async function aImportPreview(fd: FormData) {
  const back = '/admin/import';
  let target: string;
  try {
    const a = await staffActor();
    if (a.role !== 'admin') throw new DomainError('Only the admin role can import audit data.');
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) throw new DomainError('Choose the audit .xlsx or .csv file.');
    const buf = Buffer.from(await file.arrayBuffer());
    const preview = await parseAuditFile(buf, file.name);
    savePreview(preview);
    target = withFlash(back, 'ok', `Read ${preview.rows.length} row(s) from ${file.name}. Review before committing.`);
  } catch (e) {
    if (!(e instanceof DomainError)) console.error(e);
    target = withFlash(back, 'err', e instanceof DomainError ? e.message : 'Could not read that file.');
  }
  redirect(target);
}
export async function aImportCommit(fd: FormData) {
  return run(
    fd,
    'staff',
    '/admin/import',
    (db, a) => {
      if (a.role !== 'admin') throw new DomainError('Only the admin role can import audit data.');
      const p = readPreview();
      if (!p) throw new DomainError('Nothing to import. Upload a file first.');
      const n = commitImport(db, a, p);
      clearPreview();
      return String(n);
    },
    (n) => `Imported ${n} field-audit records. Demo fixtures were removed so synthetic and real data never mix.`,
    () => '/admin',
  );
}
export async function aImportCancel() {
  clearPreview();
  redirect('/admin/import');
}

// ---------------------------------------------------------------- student portal
export async function sRegister(fd: FormData) {
  return run(
    fd,
    'student',
    '/app/register',
    (db, a) =>
      ops.registerCycle(db, a, {
        description: s(fd, 'description'),
        zone: s(fd, 'zone'),
        bay: s(fd, 'bay'),
        spot: s(fd, 'spot'),
        condition: s(fd, 'condition') || 'ok',
        faults: all(fd, 'faults'),
        ack: fd.get('ack') === 'on' ? true : false,
      }),
    (id) => `Registered. Your permanent tag is ${id}.`,
    (id) => `/app/my-cycle?new=${id}`,
  );
}
export async function sClaim(fd: FormData) {
  const id = s(fd, 'id');
  return run(fd, 'student', `/app/c/${id}`, (db, a) => ops.submitClaim(db, a, { id, evidence: all(fd, 'evidence'), description: s(fd, 'description') }), 'Claim submitted. The hostel office will review it; nothing happens to the cycle meanwhile.', () => `/app/c/${id}`);
}
export async function sReserve(fd: FormData) {
  const id = s(fd, 'id');
  return run(fd, 'student', `/app/cycles/${id}`, (db, a) => ops.reserveListing(db, a, { id, shop: s(fd, 'shop') || 'undecided' }), 'Reserved. Collect it at the hostel desk; you pay the cycle price only.');
}
export async function sSemester(fd: FormData) {
  return run(
    fd,
    'student',
    '/app/semester',
    (db, a) =>
      ops.semesterConfirm(db, a, {
        cycleId: s(fd, 'cycleId'),
        stillOwned: s(fd, 'owned') !== 'no',
        locationChanged: s(fd, 'moved') === 'yes',
        newSpot: s(fd, 'newSpot') || null,
        faults: all(fd, 'faults'),
        wantsExit: fd.get('wantsExit') === 'on',
      }),
    'Thanks! Your cycle is confirmed for this semester.',
    () => (fd.get('wantsExit') === 'on' ? '/app/exit' : '/app'),
  );
}
export async function sExit(fd: FormData) {
  return run(
    fd,
    'student',
    '/app/exit',
    (db, a) => ops.submitExit(db, a, { cycleId: s(fd, 'cycleId'), choice: s(fd, 'choice'), expectedPrice: numOrNull(s(fd, 'expectedPrice')), handoverPref: s(fd, 'handoverPref') }),
    'Offer sent to the hostel office. They will confirm a handover slot.',
  );
}
export async function sExitWithdraw(fd: FormData) {
  return run(fd, 'student', '/app/exit', (db, a) => ops.advanceExit(db, a, { id: s(fd, 'id'), step: 'WITHDRAW' }), 'Offer withdrawn.');
}
