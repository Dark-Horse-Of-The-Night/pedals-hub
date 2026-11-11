import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { readDb } from '@/lib/store';
import { studentActor } from '@/lib/session';
import { FAULT_OPTIONS } from '@/lib/labels';
import { fmtDate } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { sSemester } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function SemesterCheck() {
  const db = readDb();
  const me = await studentActor();
  const term = db.settings.term;
  const mine = db.cycles.filter((c) => c.ownerId === me.studentId && ['REGISTERED', 'OWNER_VERIFIED', 'IN_USE'].includes(c.ownershipStatus));
  const pending = mine.filter((c) => !db.confirmations.some((x) => x.cycleId === c.id && x.term === term));
  const done = mine.filter((c) => !pending.includes(c));
  const c = pending[0];
  const opt = 'flex min-h-[48px] items-center gap-3 rounded-xl border border-line-strong bg-white px-3.5 text-sm has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-[#F3F8FE]';

  return (
    <div className="px-4 pt-3">
      <Link href="/app" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary"><ArrowLeft size={16} aria-hidden /> Home</Link>
      <h1 className="mt-2 font-display text-xl font-extrabold text-navy">Semester check</h1>
      <p className="mt-1 text-[13px] text-muted">{term} · open until {fmtDate(db.settings.semesterEnd)} · about a minute. Missing it only means a friendly follow-up.</p>

      {mine.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-white p-5 text-center text-sm text-muted">
          No cycle registered to {me.studentId}. <Link href="/app/register" className="font-semibold text-primary">Register one →</Link>
        </div>
      ) : null}

      {c ? (
        <form action={sSemester} className="mt-4 flex flex-col gap-3">
          <BackHere />
          <input type="hidden" name="cycleId" value={c.id} />
          <div className="rounded-2xl bg-navy p-4 text-white">
            <div className="text-xs text-[#B7C6D8]">Welcome back!</div>
            <div className="font-display text-lg font-extrabold">Is {c.id} still yours?</div>
            <div className="text-xs text-[#B7C6D8]">{c.description} · {c.spot}</div>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Still yours?</legend>
            <label className={opt}><input type="radio" name="owned" value="yes" defaultChecked /> Yes, still mine and in use</label>
            <label className={opt}><input type="radio" name="owned" value="no" /> No longer mine</label>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[13px] font-bold">Same parking spot?</legend>
            <label className={opt}><input type="radio" name="moved" value="no" defaultChecked /> Same spot</label>
            <label className={opt}><input type="radio" name="moved" value="yes" /> Moved: <input name="newSpot" placeholder="new spot" className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong px-2 text-sm" aria-label="New spot" /></label>
          </fieldset>
          <details className="rounded-xl border border-line bg-white px-3.5 py-2.5">
            <summary className="cursor-pointer text-[13px] font-bold">Anything broken now? (optional)</summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {FAULT_OPTIONS.map((f) => (
                <label key={f} className="chip cursor-pointer border border-line bg-white text-body has-[:checked]:border-[#BBD6F2] has-[:checked]:bg-pale has-[:checked]:text-primary"><input type="checkbox" name="faults" value={f} defaultChecked={c.faults.includes(f)} className="sr-only" />{f}</label>
              ))}
            </div>
          </details>
          <label className="flex items-center gap-2.5 text-[13px]"><input type="checkbox" name="wantsExit" /> I’m graduating / leaving: help me sell or donate it</label>
          <Submit className="btn btn-primary btn-lg w-full">Confirm</Submit>
          <p className="text-center text-[11px] text-muted">Same QR, updated record. No new sticker.</p>
        </form>
      ) : null}

      {done.map((d) => (
        <div key={d.id} className="mt-4 flex items-center gap-3 rounded-2xl border border-[#A9E0D3] bg-teal-soft px-4 py-3 text-[13px] text-teal-ink">
          <CheckCircle2 size={20} aria-hidden /> <span><b>{d.id}</b> confirmed for {term}. Thanks!</span>
        </div>
      ))}
    </div>
  );
}
