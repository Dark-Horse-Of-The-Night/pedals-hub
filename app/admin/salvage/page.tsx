import Link from 'next/link';
import { readDb } from '@/lib/store';
import { staffActor } from '@/lib/session';
import { salvageBlockers, technicalRoute } from '@/lib/rules';
import { Callout, Card, Chip, Empty, GradeDot, PageHeader, fmtDate } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { aAuthoriseSalvage, aCompleteSalvage, aLogPart, aResidual, aSalvageReview } from '@/app/actions';
import type { Cycle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Salvage() {
  const db = readDb();
  const actor = await staffActor();
  const admin = actor.role === 'admin';
  const field = actor.role !== 'mechanic' || true;
  const toRoute = db.cycles.filter((c) => c.ownershipStatus === 'CLEARED' && c.salvageStatus === 'NONE' && ['NONE', 'WITHDRAWN'].includes(c.listingStatus) && technicalRoute(c, db.settings).route === 'SALVAGE');
  const st = (...s: Cycle['salvageStatus'][]) => db.cycles.filter((c) => s.includes(c.salvageStatus));
  const review = st('REVIEW');
  const working = st('DISMANTLING', 'PARTS_LOGGED');
  const residual = st('RESIDUAL_PENDING');
  const done = st('COMPLETED');
  const parts = db.salvage.flatMap((s) => s.parts.map((p) => ({ ...p, cycleId: s.cycleId })));
  const reusable = parts.filter((p) => !/recycl/i.test(p.destination)).reduce((s, p) => s + p.quantity, 0);
  const why = (c: Cycle) => {
    const r = technicalRoute(c, db.settings);
    return r.reasons[0];
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Salvage & parts recovery" sub="Only admin-cleared cycles that are grade D, above the R/V cut-off or structurally unsafe. Safe parts feed B/C repairs; the rest waits for an authorised recycler." />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['To route', toRoute.length],
          ['Awaiting authorisation', review.length],
          ['Dismantling / parts', working.length],
          ['Residual pending', residual.length],
          ['Safe parts recovered', reusable],
        ].map(([l, v]) => (
          <div key={l as string} className="card p-4"><div className="lbl">{l}</div><div className="mt-1 font-display text-2xl font-extrabold text-navy">{v}</div></div>
        ))}
      </section>
      <Callout tone="amber">Recycling partner: <b>pending confirmation</b>. No scrap prices, receipts or CO₂ figures are shown until a real partner and evidence exist. Failed brakes and damaged frames/forks are never transplanted.</Callout>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="1 · Cleared, technically non-viable: route to review">
          {toRoute.length ? toRoute.map((c) => (
            <div key={c.id} className="flex items-center gap-3 border-b border-[#EEF2F7] py-2.5 last:border-0">
              <GradeDot grade={c.grade} />
              <div className="min-w-0 flex-1"><Link href={`/admin/cycles/${c.id}`} className="font-semibold hover:text-primary">{c.id}</Link><div className="truncate text-xs text-muted">{why(c)}</div></div>
              <form action={aSalvageReview}><BackHere /><input type="hidden" name="id" value={c.id} /><Submit className="btn btn-secondary" disabled={salvageBlockers(c, db.claims, db.settings).length > 0 || actor.role === 'mechanic'}>Route to review</Submit></form>
            </div>
          )) : <Empty title="Nothing to route." />}
        </Card>
        <Card title="2 · Admin authorises dismantling">
          {review.length ? review.map((c) => (
            <form key={c.id} action={aAuthoriseSalvage} className="flex flex-wrap items-center gap-2 border-b border-[#EEF2F7] py-2.5 last:border-0">
              <BackHere /><input type="hidden" name="id" value={c.id} />
              <GradeDot grade={c.grade} />
              <Link href={`/admin/cycles/${c.id}`} className="font-semibold hover:text-primary">{c.id}</Link>
              <input name="reason" required minLength={5} defaultValue={why(c)} className="field h-9 min-w-[160px] flex-1 text-[13px]" aria-label="Reason" />
              <Submit className="btn btn-primary" disabled={!admin} confirm={`Authorise dismantling of ${c.id}? This cannot be undone.`}>Authorise</Submit>
            </form>
          )) : <Empty title="Nothing awaiting authorisation." />}
          {!admin && review.length ? <p className="mt-2 text-xs text-muted">Only the admin role can authorise.</p> : null}
        </Card>
      </div>

      <Card title="3 · Recover safe parts, record residual" subtitle="Log each part with condition and destination; then record what is left for the recycler.">
        {working.length ? (
          <div className="flex flex-col gap-4">
            {working.map((c) => {
              const s = db.salvage.find((x) => x.cycleId === c.id)!;
              return (
                <div key={c.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><GradeDot grade={c.grade} /><b>{c.id}</b><span className="text-xs text-muted">{c.description} · authorised by {s.authorisedBy}</span></div>
                    <Chip tone="teal">{s.parts.length} part line(s)</Chip>
                  </div>
                  {s.parts.length ? (
                    <ul className="mt-2 grid gap-1.5 text-[13px] md:grid-cols-2">
                      {s.parts.map((p) => (
                        <li key={p.id} className="flex justify-between rounded-lg bg-page px-3 py-1.5"><span>{p.quantity} × {p.part} <span className="text-xs text-muted">({p.condition})</span></span><span className={`text-xs ${/recycl/i.test(p.destination) ? 'text-red-ink' : 'text-teal-ink'}`}>{p.destination}</span></li>
                      ))}
                    </ul>
                  ) : null}
                  <form action={aLogPart} className="mt-3 grid gap-2 md:grid-cols-[1.4fr_1fr_.5fr_1.4fr_auto]">
                    <BackHere /><input type="hidden" name="id" value={c.id} />
                    <input name="part" required placeholder="Part, e.g. Rear wheel" className="field h-9 text-[13px]" aria-label="Part" list="parts" />
                    <input name="condition" required placeholder="Condition" className="field h-9 text-[13px]" aria-label="Condition" />
                    <input name="quantity" type="number" min={1} defaultValue={1} className="field h-9 text-[13px]" aria-label="Quantity" />
                    <select name="destination" className="field h-9 text-[13px]" aria-label="Destination">
                      <option>Spares shelf → B/C repairs</option>
                      <option>Partner shop (for listed cycles)</option>
                      <option>Recycling (not reusable)</option>
                    </select>
                    <Submit className="btn btn-soft" disabled={!field}>Log part</Submit>
                  </form>
                  <form action={aResidual} className="mt-2 flex flex-wrap gap-2">
                    <BackHere /><input type="hidden" name="id" value={c.id} />
                    <input name="residual" required minLength={3} placeholder="Residual material, e.g. steel frame + bent fork" className="field h-9 min-w-[220px] flex-1 text-[13px]" aria-label="Residual material" defaultValue={s.residual ?? ''} />
                    <Submit className="btn btn-secondary" disabled={actor.role === 'mechanic'}>Record residual → awaiting recycler</Submit>
                  </form>
                </div>
              );
            })}
          </div>
        ) : <Empty title="No cycles being dismantled." />}
        <datalist id="parts">{['Front wheel', 'Rear wheel', 'Seat', 'Pedal pair', 'Chain', 'Stand', 'Handlebar', 'Mudguard', 'Bell', 'Brakes', 'Frame / fork'].map((p) => <option key={p} value={p} />)}</datalist>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="4 · Residual awaiting authorised recycler">
          {residual.length ? residual.map((c) => {
            const s = db.salvage.find((x) => x.cycleId === c.id)!;
            return (
              <form key={c.id} action={aCompleteSalvage} className="border-b border-[#EEF2F7] py-2.5 last:border-0">
                <BackHere /><input type="hidden" name="id" value={c.id} />
                <div className="text-[13px]"><b>{c.id}</b> · {s.residual} · <Chip tone="amber">partner pending</Chip></div>
                <div className="mt-2 flex gap-2">
                  <input name="evidence" required minLength={5} placeholder="Recycler receipt no. / photo link" className="field h-9 flex-1 text-[13px]" aria-label="Evidence" />
                  <Submit className="btn btn-primary" disabled={!admin} confirm="Close this salvage record with the evidence given?">Close with evidence</Submit>
                </div>
              </form>
            );
          }) : <Empty title="No residual material waiting." />}
        </Card>
        <Card title="Completed with evidence">
          {done.length ? done.map((c) => {
            const s = db.salvage.find((x) => x.cycleId === c.id)!;
            return <div key={c.id} className="text-[13px]"><b>{c.id}</b> · {s.evidence} · {fmtDate(s.completedAt)}</div>;
          }) : <Empty title="None yet." />}
        </Card>
      </div>
    </div>
  );
}
