import Link from 'next/link';
import { readDb } from '@/lib/store';
import { staffActor } from '@/lib/session';
import { EXIT } from '@/lib/labels';
import { Callout, Chip, Empty, GradeChip, Money, PageHeader, fmtDate } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { aExit } from '@/app/actions';

export const dynamic = 'force-dynamic';

const STEPS = ['SUBMITTED', 'VERIFIED', 'HANDOVER_SCHEDULED', 'RECEIVED'] as const;

export default async function Exit() {
  const db = readDb();
  const actor = await staffActor();
  const admin = actor.role === 'admin';
  const offers = [...db.exits].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const tomorrow = new Date(Date.now() + 86400000);
  tomorrow.setHours(18, 0, 0, 0);
  const defWhen = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Graduation exit" sub="Final-year owners voluntarily donate or sell their cycle before check-out, so it never becomes the next abandoned bike. Linking this to hostel clearance needs administrative approval." />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s} className="card p-4"><div className="lbl">{EXIT[s].label}</div><div className="mt-1 font-display text-2xl font-extrabold text-navy">{db.exits.filter((e) => e.status === s).length}</div></div>
        ))}
      </section>
      <Callout tone="blue">Only the registered owner can offer a cycle. A received cycle gets a custody receipt, a clearance record (“voluntary handover”) and then goes through the normal mechanic grading before any listing. No peer-to-peer transfers.</Callout>
      <section className="flex flex-col gap-3">
        {offers.length === 0 ? <Empty title="No offers yet.">Students submit offers from the student web app → “Leaving IITG?”.</Empty> : null}
        {offers.map((e) => {
          const c = db.cycles.find((x) => x.id === e.cycleId)!;
          const idx = STEPS.indexOf(e.status as (typeof STEPS)[number]);
          return (
            <article key={e.id} className="card p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pale font-display text-xs font-extrabold text-primary">{e.choice === 'DONATE' ? 'DON' : 'SELL'}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm"><Link href={`/admin/cycles/${c.id}`} className="font-display font-extrabold text-navy hover:text-primary">{c.id}</Link> · {c.description} · owner <b>{e.ownerId}</b></div>
                  <div className="text-xs text-muted">{e.choice === 'DONATE' ? 'Donation' : <>Sell offer, asking <Money v={e.expectedPrice} /></>} · prefers {e.handoverPref} · submitted {fmtDate(e.submittedAt, true)}</div>
                </div>
                <GradeChip grade={c.grade} selfReported={c.selfReported} />
                <Chip tone={EXIT[e.status].tone}>{EXIT[e.status].label}</Chip>
              </div>
              {e.status !== 'WITHDRAWN' ? (
                <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Progress">
                  {STEPS.map((s, i) => (
                    <li key={s} className={`rounded-lg px-2 py-1.5 text-center text-xs font-semibold ${i <= idx ? 'bg-teal-soft text-teal-ink' : 'bg-slate-soft text-muted'}`}>{EXIT[s].label}</li>
                  ))}
                </ol>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {e.status === 'SUBMITTED' ? (
                  <form action={aExit}><BackHere /><input type="hidden" name="id" value={e.id} /><input type="hidden" name="step" value="VERIFY" /><Submit className="btn btn-primary" disabled={!admin}>Verify registered owner</Submit></form>
                ) : null}
                {e.status === 'VERIFIED' ? (
                  <form action={aExit} className="flex flex-wrap items-center gap-2"><BackHere /><input type="hidden" name="id" value={e.id} /><input type="hidden" name="step" value="SCHEDULE" />
                    <input type="datetime-local" name="when" defaultValue={defWhen} className="field h-10 w-auto" aria-label="Handover time" />
                    <Submit className="btn btn-primary" disabled={!admin}>Schedule desk handover</Submit></form>
                ) : null}
                {e.status === 'HANDOVER_SCHEDULED' ? (
                  <>
                    <span className="text-[13px] text-muted">Handover {fmtDate(e.handoverAt, true)} at hostel desk</span>
                    <form action={aExit}><BackHere /><input type="hidden" name="id" value={e.id} /><input type="hidden" name="step" value="RECEIVE" /><Submit className="btn btn-teal" disabled={!admin} confirm={`Record that ${c.id} was received from ${e.ownerId} and issue a custody receipt?`}>Mark received + issue receipt</Submit></form>
                  </>
                ) : null}
                {e.status === 'RECEIVED' ? <span className="text-[13px] text-teal-ink">Custody receipt <b>{e.receiptNo}</b> · now in inventory for mechanic grading</span> : null}
                {['SUBMITTED', 'VERIFIED', 'HANDOVER_SCHEDULED'].includes(e.status) ? (
                  <form action={aExit}><BackHere /><input type="hidden" name="id" value={e.id} /><input type="hidden" name="step" value="WITHDRAW" /><Submit className="btn btn-secondary" disabled={!admin} confirm="Withdraw this offer?">Withdraw</Submit></form>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
