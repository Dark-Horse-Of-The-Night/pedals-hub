import { readDb } from '@/lib/store';
import { staffActor } from '@/lib/session';
import { repairCostR } from '@/lib/rules';
import { Callout, Card, Chip, Money, PageHeader, fmtDate } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { aRateCard } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function Repairs() {
  const db = readDb();
  const actor = await staffActor();
  const canEdit = actor.role === 'admin' || actor.role === 'mechanic';
  const d = db.settings.discountPct;
  const verified = db.rateCard.filter((r) => r.verified).length;
  const referrals = db.listings.filter((l) => l.reservedBy && l.buyerShopChoice);
  const partnerRefs = referrals.filter((l) => l.buyerShopChoice === 'partner');
  const indicativeSaving = partnerRefs.reduce((s, l) => s + Math.round((repairCostR(db.cycles.find((c) => c.id === l.cycleId)!) ?? 0) * (d / 100)), 0);
  const input = 'h-9 w-full rounded-lg border border-line-strong bg-white px-2 text-[13px]';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Repairs & partners" sub="Itemised rate card behind every R estimate and every buyer-facing repair quote. Non-exclusive: buyers may use any mechanic." />
      <section className="grid gap-3 md:grid-cols-4">
        <div className="card p-4"><div className="lbl">Rate-card items</div><div className="mt-1 font-display text-2xl font-extrabold text-navy">{db.rateCard.length}</div><div className="text-xs text-muted">{verified} confirmed by written quote</div></div>
        <div className="card p-4"><div className="lbl">Partner discount</div><div className="mt-1 font-display text-2xl font-extrabold text-amber-ink">~{d}%</div><div className="text-xs text-muted">{db.settings.discountConfirmed ? 'Confirmed agreement' : 'Proposed · not signed'}</div></div>
        <div className="card p-4"><div className="lbl">Referrals recorded</div><div className="mt-1 font-display text-2xl font-extrabold text-navy">{partnerRefs.length}<span className="text-base text-muted"> / {referrals.length}</span></div><div className="text-xs text-muted">buyers choosing the partner</div></div>
        <div className="card p-4"><div className="lbl">Buyer saving (indicative)</div><div className="mt-1 font-display text-2xl font-extrabold text-teal-ink">₹{indicativeSaving.toLocaleString('en-IN')}</div><div className="text-xs text-muted">same scope · {db.settings.discountConfirmed ? 'confirmed rates' : 'not verified'}</div></div>
      </section>
      {verified === 0 ? (
        <Callout tone="amber">
          <b>All prices are illustrative placeholders.</b> Replace each row with a written quote from the campus shop and a second local mechanic, then tick “confirmed”. Until then every partner price is shown to buyers as “proposed”.
        </Callout>
      ) : null}

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="text-base font-bold text-navy">Rate card</h2>
          <span className="text-xs text-muted">{canEdit ? 'Edit a row and save it' : 'Read-only for your role'}</span>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[1.1fr_1.3fr_.6fr_.8fr_1.6fr_.8fr_.6fr_.6fr] gap-2 border-b border-line px-5 py-2.5 text-xs font-semibold text-muted"><span>Component</span><span>Operation</span><span>Regular ₹</span><span>Partner ₹</span><span>Source</span><span>Status</span><span>Updated</span><span></span></div>
            
              {db.rateCard.map((r) => (
                <div key={r.id} className="border-b border-[#EEF2F7]">
                    <form action={aRateCard} className="grid grid-cols-[1.1fr_1.3fr_.6fr_.8fr_1.6fr_.8fr_.6fr_.6fr] items-center gap-2 px-5 py-2">
                      <BackHere />
                      <input type="hidden" name="id" value={r.id} />
                      <input name="component" defaultValue={r.component} className={input} aria-label="Component" disabled={!canEdit} />
                      <input name="operation" defaultValue={r.operation} className={input} aria-label="Operation" disabled={!canEdit} />
                      <input name="marketPrice" type="number" min={0} defaultValue={r.marketPrice} className={input} aria-label="Regular price" disabled={!canEdit} />
                      <input name="partnerPrice" type="number" min={0} defaultValue={r.partnerPrice ?? ''} placeholder={`≈${Math.round(r.marketPrice * (1 - d / 100))} (−${d}%)`} className={input} aria-label="Partner price" disabled={!canEdit} />
                      <input name="source" defaultValue={r.source} className={input} aria-label="Source" disabled={!canEdit} />
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" name="verified" defaultChecked={r.verified} disabled={!canEdit} />
                        {r.verified ? <Chip tone="teal">Confirmed</Chip> : <Chip tone="amber">Unverified</Chip>}
                      </label>
                      <span className="text-xs text-muted">{fmtDate(r.lastUpdated).replace(/ \d{4}$/, '')}</span>
                      <Submit className="btn btn-secondary" disabled={!canEdit}>Save</Submit>
                    </form>
                  </div>
              ))}
              <div className="bg-page">
                  <form action={aRateCard} className="grid grid-cols-[1.1fr_1.3fr_.6fr_.8fr_1.6fr_.8fr_.6fr_.6fr] items-center gap-2 px-5 py-2.5">
                    <BackHere />
                    <input name="component" placeholder="New component" className={input} aria-label="New component" disabled={!canEdit} required />
                    <input name="operation" placeholder="Operation" className={input} aria-label="New operation" disabled={!canEdit} required />
                    <input name="marketPrice" type="number" min={0} placeholder="₹" className={input} aria-label="New regular price" disabled={!canEdit} required />
                    <input name="partnerPrice" type="number" min={0} placeholder="optional" className={input} aria-label="New partner price" disabled={!canEdit} />
                    <input name="source" placeholder="e.g. Written quote, campus shop, 12 Nov" className={input} aria-label="New source" disabled={!canEdit} required />
                    <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" name="verified" disabled={!canEdit} /> Confirmed</label>
                    <span />
                    <Submit className="btn btn-primary" disabled={!canEdit}>Add</Submit>
                  </form>
                </div>
            
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Why a shop would join (value, not a contract)">
          <ul className="text-[13px] leading-relaxed text-body">
            <li>• Referred, pre-diagnosed jobs: every listing carries an itemised defect list.</li>
            <li>• Visibility on every listing beside the regular quote; non-exclusive.</li>
            <li>• Salvaged safe parts can feed its repairs (never brakes or frames).</li>
          </ul>
        </Card>
        <Card title="Referral log">
          {referrals.length ? (
            <ul className="text-[13px]">
              {referrals.map((l) => (
                <li key={l.cycleId} className="flex justify-between border-b border-[#EEF2F7] py-1.5 last:border-0">
                  <span>{l.cycleId} · {l.reservedBy}</span>
                  <span className="text-muted">{l.buyerShopChoice === 'partner' ? 'Partner shop' : l.buyerShopChoice === 'regular' ? 'Own mechanic' : 'Undecided'} · <Money v={repairCostR(db.cycles.find((c) => c.id === l.cycleId)!)} /> regular</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">No referrals recorded yet.</p>}
          <p className="mt-2 text-xs text-muted">Recorded from buyer choices at reservation. No booking or payment flows through Pedals.</p>
        </Card>
      </div>
    </div>
  );
}
