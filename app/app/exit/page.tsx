import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { readDb } from '@/lib/store';
import { studentActor } from '@/lib/session';
import { EXIT } from '@/lib/labels';
import { Chip, fmtDate } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { sExit, sExitWithdraw } from '@/app/actions';

export const dynamic = 'force-dynamic';

const STEPS = ['SUBMITTED', 'VERIFIED', 'HANDOVER_SCHEDULED', 'RECEIVED'] as const;

export default async function ExitPage() {
  const db = readDb();
  const me = await studentActor();
  const mine = db.cycles.filter((c) => c.ownerId === me.studentId && ['REGISTERED', 'OWNER_VERIFIED', 'IN_USE'].includes(c.ownershipStatus));
  const offers = db.exits.filter((e) => e.ownerId === me.studentId);
  const offerable = mine.filter((c) => !offers.some((e) => e.cycleId === c.id && !['RECEIVED', 'WITHDRAWN'].includes(e.status)));
  const opt = 'flex min-h-[64px] flex-1 flex-col items-center justify-center rounded-xl border border-line-strong bg-white px-2 text-center text-sm font-bold has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-pale has-[:checked]:text-primary';

  return (
    <div className="px-4 pt-3">
      <Link href="/app" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary"><ArrowLeft size={16} aria-hidden /> Home</Link>
      <h1 className="mt-2 font-display text-xl font-extrabold text-navy">Leaving IITG?</h1>
      <p className="mt-1 text-[13px] text-muted">Give your cycle a next chapter instead of leaving it in the bay. One form, a desk handover and a receipt.</p>

      {offers.map((e) => {
        const idx = STEPS.indexOf(e.status as (typeof STEPS)[number]);
        return (
          <div key={e.id} className="mt-4 rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between text-sm"><b>{e.cycleId} · {e.choice === 'DONATE' ? 'Donate' : `Sell (₹${e.expectedPrice ?? '—'})`}</b><Chip tone={EXIT[e.status].tone}>{EXIT[e.status].label}</Chip></div>
            {e.status !== 'WITHDRAWN' ? (
              <ol className="mt-3 grid grid-cols-4 gap-1">{STEPS.map((s, i) => <li key={s} className={`rounded-md px-1 py-1 text-center text-[10px] font-semibold ${i <= idx ? 'bg-teal-soft text-teal-ink' : 'bg-slate-soft text-muted'}`}>{EXIT[s].label}</li>)}</ol>
            ) : null}
            {e.handoverAt ? <p className="mt-2 text-xs text-body">Handover at the hostel desk: <b>{fmtDate(e.handoverAt, true)}</b></p> : null}
            {e.receiptNo ? <p className="mt-1 text-xs text-teal-ink">Custody receipt {e.receiptNo}. Thank you!</p> : null}
            {['SUBMITTED', 'VERIFIED'].includes(e.status) ? (
              <form action={sExitWithdraw} className="mt-2"><BackHere /><input type="hidden" name="id" value={e.id} /><Submit className="text-xs font-semibold text-muted underline" confirm="Withdraw your offer?">Withdraw offer</Submit></form>
            ) : null}
          </div>
        );
      })}

      {offerable.length ? (
        <form action={sExit} className="mt-4 flex flex-col gap-3">
          <BackHere />
          <label className="text-[13px] font-semibold text-body">Which cycle
            <select name="cycleId" className="field mt-1">{offerable.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.description}</option>)}</select>
          </label>
          <fieldset className="flex gap-2">
            <legend className="mb-1.5 text-[13px] font-semibold text-body">I want to</legend>
            <label className={opt}><input type="radio" name="choice" value="DONATE" defaultChecked className="sr-only" />Donate<span className="text-[11px] font-normal text-muted">goes to a student who needs it</span></label>
            <label className={opt}><input type="radio" name="choice" value="SELL" className="sr-only" />Offer to sell<span className="text-[11px] font-normal text-muted">at a fair asking price</span></label>
          </fieldset>
          <label className="text-[13px] font-semibold text-body">Asking price if selling (₹)
            <input name="expectedPrice" type="number" min={0} placeholder="e.g. 1200" className="field mt-1" />
          </label>
          <label className="text-[13px] font-semibold text-body">Handover preference
            <select name="handoverPref" className="field mt-1"><option>Hostel desk, weekday evening</option><option>Hostel desk, weekend morning</option><option>During check-out week</option></select>
          </label>
          <Submit className="btn btn-primary btn-lg w-full">Send to hostel office</Submit>
          <p className="text-center text-[11px] text-muted">Linking this to hostel clearance needs administrative approval; for now it is voluntary.</p>
        </form>
      ) : offers.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-white p-5 text-center text-sm text-muted">No registered cycle for {me.studentId}. <Link href="/app/register" className="font-semibold text-primary">Register one →</Link></div>
      ) : null}
    </div>
  );
}
