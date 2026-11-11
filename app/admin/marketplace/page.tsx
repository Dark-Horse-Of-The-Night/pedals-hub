import Link from 'next/link';
import { readDb } from '@/lib/store';
import { staffActor } from '@/lib/session';
import { listingBlockers, partnerQuote, repairCostR } from '@/lib/rules';
import { reusableStock } from '@/lib/metrics';
import { Callout, Card, Chip, Empty, GradeDot, Money, PageHeader, fmtDate } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { ListingCard } from '@/components/ListingCard';
import { aApproveListing, aCancelReservation, aDraftListing, aRecordSale, aWithdrawListing } from '@/app/actions';
import type { Cycle } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Marketplace({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const sp = await searchParams;
  const db = readDb();
  const actor = await staffActor();
  const admin = actor.role === 'admin';
  const with_ = (s: Cycle['listingStatus']) => db.cycles.filter((c) => c.listingStatus === s);
  const drafts = with_('DRAFT');
  const live = with_('LIVE');
  const reserved = with_('RESERVED');
  const sold = with_('SOLD');
  const ready = reusableStock(db).filter((c) => ['NONE', 'WITHDRAWN'].includes(c.listingStatus));
  const previewC = db.cycles.find((c) => c.id === sp.preview) ?? live[0] ?? drafts[0];
  const L = (id: string) => db.listings.find((l) => l.cycleId === id);
  const proceeds = sold.reduce((s, c) => s + (L(c.id)?.priceS ?? 0), 0);

  const Row = ({ c, children }: { c: Cycle; children?: React.ReactNode }) => {
    const pq = partnerQuote(c, db.settings, db.rateCard);
    return (
      <tr>
        <td className="pl-5"><Link href={`/admin/cycles/${c.id}`} className="font-display font-extrabold text-navy hover:text-primary">{c.id}</Link><div className="text-xs text-muted">{c.description}</div></td>
        <td><GradeDot grade={c.grade} /></td>
        <td className="font-semibold"><Money v={c.salePriceS} /></td>
        <td><Money v={c.grade === 'A' ? null : repairCostR(c)} dash="—" /></td>
        <td>{pq ? <span><Money v={pq.rp} /> <span className="text-[11px] text-amber-ink">{pq.confirmed ? '' : 'indicative'}</span></span> : '—'}</td>
        <td className="pr-5"><div className="flex flex-wrap justify-end gap-1.5"><Link href={`/admin/marketplace?preview=${c.id}`} scroll={false} className="btn btn-secondary">Preview</Link>{children}</div></td>
      </tr>
    );
  };
  const head = (
    <thead><tr><th className="pl-5">Cycle</th><th>Grade</th><th>S · cycle price</th><th>Rm · regular</th><th>Rp · partner</th><th className="pr-5 text-right">Actions</th></tr></thead>
  );
  const one = (action: (fd: FormData) => Promise<void>, id: string, label: string, cls = 'btn btn-secondary', confirm?: string, extra?: React.ReactNode, disabled?: boolean) => (
    <form action={action}><BackHere /><input type="hidden" name="id" value={id} />{extra}<Submit className={cls} confirm={confirm} disabled={disabled}>{label}</Submit></form>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Marketplace" sub="Only admin-cleared, safety-checked cycles that pass the R/V gate can be listed. Buyers pay Pedals the cycle price only." />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Ready to list', ready.length, 'text-primary'],
          ['Drafts', drafts.length, 'text-primary'],
          ['Live', live.length, 'text-teal-ink'],
          ['Reserved', reserved.length, 'text-amber-ink'],
          ['Sold (demo ₹)', `${sold.length} · ₹${proceeds.toLocaleString('en-IN')}`, 'text-body'],
        ].map(([l, v, cls]) => (
          <div key={l as string} className="card p-4"><div className="lbl">{l}</div><div className={`mt-1 font-display text-2xl font-extrabold ${cls}`}>{v}</div></div>
        ))}
      </section>
      <Callout tone="amber">Proceeds are demo values only. Any real sale income goes to an institute-approved programme fund, if one is authorised; Pedals does not own abandoned property.</Callout>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Section title={`Drafts awaiting admin approval (${drafts.length})`}>
            {drafts.length ? (
              <table className="tbl min-w-[720px]">{head}<tbody>{drafts.map((c) => (
                <Row key={c.id} c={c}>
                  {one(aApproveListing, c.id, 'Approve & publish', 'btn btn-primary', undefined, undefined, !admin)}
                  {one(aWithdrawListing, c.id, 'Withdraw', 'btn btn-secondary', undefined, <input type="hidden" name="reason" value="Draft withdrawn" />, !admin)}
                </Row>
              ))}</tbody></table>
            ) : <div className="p-5"><Empty title="No drafts." /></div>}
          </Section>

          <Section title={`Live listings (${live.length})`}>
            {live.length ? (
              <table className="tbl min-w-[720px]">{head}<tbody>{live.map((c) => (
                <Row key={c.id} c={c}>{one(aWithdrawListing, c.id, 'Withdraw', 'btn btn-danger', 'Withdraw this listing?', <input type="hidden" name="reason" value="Withdrawn by admin" />, !admin)}</Row>
              ))}</tbody></table>
            ) : <div className="p-5"><Empty title="Nothing live." /></div>}
          </Section>

          <Section title={`Reserved: hand over at the desk (${reserved.length})`}>
            {reserved.length ? (
              <table className="tbl min-w-[720px]">
                <thead><tr><th className="pl-5">Cycle</th><th>Buyer</th><th>Reserved</th><th>Pays Pedals</th><th>Repair plan</th><th className="pr-5 text-right">Actions</th></tr></thead>
                <tbody>{reserved.map((c) => {
                  const l = L(c.id)!;
                  return (
                    <tr key={c.id}>
                      <td className="pl-5"><Link href={`/admin/cycles/${c.id}`} className="font-display font-extrabold text-navy">{c.id}</Link></td>
                      <td>{l.reservedBy}</td>
                      <td className="text-xs text-muted">{fmtDate(l.reservedAt, true)}</td>
                      <td className="font-semibold"><Money v={l.priceS} /> <span className="text-xs font-normal text-muted">cycle only</span></td>
                      <td className="text-xs">{l.buyerShopChoice === 'partner' ? 'Partner shop (buyer pays shop)' : l.buyerShopChoice === 'regular' ? 'Own mechanic' : 'Undecided'}</td>
                      <td className="pr-5"><div className="flex justify-end gap-1.5">
                        {one(aRecordSale, c.id, 'Record handover + receipt', 'btn btn-teal', `Record handover of ${c.id} to ${l.reservedBy} for ₹${l.priceS} (cycle only)?`, undefined, !admin)}
                        {one(aCancelReservation, c.id, 'Release', 'btn btn-secondary', undefined, undefined, !admin)}
                      </div></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            ) : <div className="p-5"><Empty title="No reservations." /></div>}
          </Section>

          <Section title={`Eligible stock not yet listed (${ready.length})`}>
            {ready.length ? (
              <table className="tbl min-w-[720px]">{head}<tbody>{ready.map((c) => {
                const b = listingBlockers(c, db.claims, db.settings);
                return <Row key={c.id} c={c}>{one(aDraftListing, c.id, b.length ? 'Set price first' : 'Draft listing', 'btn btn-soft', undefined, undefined, b.length > 0 || actor.role === 'mechanic')}</Row>;
              })}</tbody></table>
            ) : <div className="p-5"><Empty title="No eligible stock waiting.">Clear and grade cycles to fill this list.</Empty></div>}
          </Section>

          <Section title={`Sold / handed over (${sold.length})`}>
            {sold.length ? (
              <table className="tbl min-w-[620px]"><thead><tr><th className="pl-5">Cycle</th><th>Receipt</th><th>Buyer</th><th>Cycle price</th><th className="pr-5">Date</th></tr></thead>
                <tbody>{sold.map((c) => { const l = L(c.id)!; return (
                  <tr key={c.id}><td className="pl-5 font-semibold">{c.id}</td><td><Chip tone="slate">{l.receiptNo}</Chip></td><td>{l.reservedBy}</td><td><Money v={l.priceS} /></td><td className="pr-5 text-xs text-muted">{fmtDate(l.soldAt, true)}</td></tr>
                ); })}</tbody></table>
            ) : <div className="p-5"><Empty title="No sales yet." /></div>}
          </Section>
        </div>

        <aside className="flex flex-col gap-3 self-start xl:sticky xl:top-20">
          <div className="lbl">Student view preview</div>
          {previewC ? <ListingCard c={previewC} rateCard={db.rateCard} settings={db.settings} /> : <Empty title="Nothing to preview." />}
          {previewC ? <Link href={`/app/cycles/${previewC.id}`} className="btn btn-secondary">Open in student app</Link> : null}
          <Card title="Who pays what">
            <ul className="text-[13px] leading-relaxed text-body">
              <li>• Buyer → Pedals: <b>cycle price S only</b></li>
              <li>• Buyer → any mechanic, directly: optional repairs</li>
              <li>• Partner discount ~{db.settings.discountPct}% is {db.settings.discountConfirmed ? 'confirmed' : 'proposed, not signed'}</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card overflow-hidden">
      <h2 className="px-5 pt-4 pb-1 text-base font-bold text-navy">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
