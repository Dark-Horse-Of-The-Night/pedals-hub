import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock, MapPin, ShieldCheck } from 'lucide-react';
import { readDb } from '@/lib/store';
import { studentActor } from '@/lib/session';
import { canBeClaimed, noticeProgress } from '@/lib/rules';
import { CLAIM, EVIDENCE_OPTIONS, OWNERSHIP } from '@/lib/labels';
import { Chip, GradeChip, fmtDate } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { sClaim } from '@/app/actions';
import { QR } from '@/components/QR';

export const dynamic = 'force-dynamic';

const STEPS = ['Submitted', 'Under review', 'Decision'];

/** Public scan page: ID, location and status only. Never owner identity or contact. */
export default async function PublicCycle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDb();
  const c = db.cycles.find((x) => x.id === decodeURIComponent(id).toUpperCase());
  if (!c) notFound();
  const me = await studentActor();
  const np = noticeProgress(c, Date.now());
  const myClaim = db.claims.filter((x) => x.cycleId === c.id && x.claimantId === me.studentId).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  const isMine = c.ownerId === me.studentId && ['REGISTERED', 'OWNER_VERIFIED', 'IN_USE'].includes(c.ownershipStatus);
  const claimable = canBeClaimed(c) && !(myClaim && ['SUBMITTED', 'MORE_INFO', 'DISPUTED'].includes(myClaim.status)) && !isMine;
  const stepIdx = myClaim ? (myClaim.status === 'SUBMITTED' ? 1 : ['APPROVED', 'REJECTED'].includes(myClaim.status) ? 2 : 1) : -1;

  return (
    <div className="px-4 pt-3">
      <Link href="/app" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary"><ArrowLeft size={16} aria-hidden /> Home</Link>
      <div className="mt-3 flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
        <QR id={c.id} size={72} label={false} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold text-navy">{c.id}</h1>
          <div className="mt-0.5 flex items-center gap-1 text-[13px] text-muted"><MapPin size={14} aria-hidden /> {c.zone} · {c.bay}</div>
          <div className="mt-1.5 flex flex-wrap gap-1"><GradeChip grade={c.grade} selfReported={c.selfReported} /></div>
        </div>
      </div>

      <div className={`mt-3 rounded-2xl border px-4 py-3 text-[13px] ${c.ownershipStatus === 'NOTICE_ACTIVE' ? 'border-[#BBD6F2] bg-[#F3F8FE]' : 'border-line bg-white'}`}>
        <div className="lbl">Status</div>
        <div className="mt-1 text-[15px] font-bold text-navy">{isMine ? 'Registered to you' : OWNERSHIP[c.ownershipStatus].public}</div>
        {c.ownershipStatus === 'NOTICE_ACTIVE' && np ? (
          <>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent" style={{ width: `${np.pct}%` }} /></div>
            <div className="mt-1.5 flex justify-between text-xs text-muted"><span>Claim window: day {np.day} of {np.total} (proposed)</span><span>ends {fmtDate(c.noticeDeadline, true)}</span></div>
            <p className="mt-2 text-xs text-body">After the window the hostel office reviews it. Nothing is sold or scrapped automatically.</p>
          </>
        ) : null}
        {c.listingStatus === 'LIVE' ? <Link href={`/app/cycles/${c.id}`} className="btn btn-primary mt-3 w-full">See listing</Link> : null}
      </div>

      {isMine ? (
        <div className="mt-3 flex flex-col gap-2">
          <Link href="/app/semester" className="btn btn-primary btn-lg w-full">Semester check for this cycle</Link>
          <Link href="/app/my-cycle" className="btn btn-secondary w-full">My cycle</Link>
        </div>
      ) : null}

      {myClaim ? (
        <div className="mt-3 rounded-2xl border border-line bg-white p-4">
          <div className="flex items-center justify-between"><b className="text-sm">Your claim</b><Chip tone={CLAIM[myClaim.status].tone}>{CLAIM[myClaim.status].label}</Chip></div>
          <ol className="mt-3 grid grid-cols-3 gap-1.5">
            {STEPS.map((s, i) => <li key={s} className={`rounded-lg px-1 py-1.5 text-center text-[11px] font-semibold ${i <= stepIdx ? 'bg-teal-soft text-teal-ink' : 'bg-slate-soft text-muted'}`}>{s}</li>)}
          </ol>
          {myClaim.reviewNote && myClaim.status !== 'SUBMITTED' ? <p className="mt-2 text-xs text-body">Note from the hostel office: {myClaim.reviewNote}</p> : null}
          {myClaim.status === 'MORE_INFO' ? <p className="mt-1 text-xs text-amber-ink">Bring the requested proof (key, bill or photo) to the hostel desk.</p> : null}
          {myClaim.status === 'APPROVED' ? <p className="mt-1 text-xs text-teal-ink">Verified: the cycle is yours and is out of every disposal queue.</p> : null}
        </div>
      ) : null}

      {claimable ? (
        <form action={sClaim} className="mt-3 rounded-2xl border border-line bg-white p-4">
          <BackHere />
          <input type="hidden" name="id" value={c.id} />
          <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-amber-ink" aria-hidden /><b className="text-sm">Is this your cycle? Claim it</b></div>
          <p className="mt-1 text-xs text-muted">Your student ID ({me.studentId}, demo pseudonym) plus at least one proof. An officer reviews every claim; disputes go to the hostel office.</p>
          <fieldset className="mt-3 flex flex-col gap-2">
            <legend className="sr-only">Evidence</legend>
            {EVIDENCE_OPTIONS.map((e) => (
              <label key={e} className="flex min-h-[44px] items-center gap-2.5 rounded-xl border border-line-strong px-3 text-[13px]"><input type="checkbox" name="evidence" value={e} /> {e}</label>
            ))}
          </fieldset>
          <label className="mt-3 block text-xs font-semibold text-body">Describe it (colour, marks, lock)
            <textarea name="description" required minLength={5} rows={2} className="field mt-1" placeholder="e.g. Red MTB, black grip tape, I have the lock key" />
          </label>
          <Submit className="btn btn-primary btn-lg mt-3 w-full">Submit claim</Submit>
        </form>
      ) : null}

      {!claimable && !isMine && !myClaim && c.listingStatus !== 'LIVE' ? (
        <p className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs text-muted"><Lock size={14} aria-hidden /> No action is open on this cycle. Questions? Ask at the hostel desk with the ID.</p>
      ) : null}
      <p className="mt-3 text-center text-[11px] text-muted">Public view shows ID, location and status only. Owner details are never shown.</p>
    </div>
  );
}
