import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { readDb } from '@/lib/store';
import { studentActor } from '@/lib/session';
import { partnerQuote, repairCostR } from '@/lib/rules';
import { ListingCard } from '@/components/ListingCard';
import { BackHere, Submit } from '@/components/client';
import { sReserve } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function ListingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = readDb();
  const c = db.cycles.find((x) => x.id === decodeURIComponent(id).toUpperCase());
  if (!c || !['LIVE', 'RESERVED', 'SOLD'].includes(c.listingStatus)) notFound();
  const me = await studentActor();
  const l = db.listings.find((x) => x.cycleId === c.id)!;
  const S = l.priceS;
  const Rm = repairCostR(c) ?? 0;
  const pq = partnerQuote(c, db.settings, db.rateCard);
  const needs = c.grade === 'B' || c.grade === 'C';
  const mine = l.reservedBy === me.studentId;
  const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <div className="px-4 pt-3">
      <Link href="/app/cycles" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary"><ArrowLeft size={16} aria-hidden /> All cycles</Link>
      <div className="mt-3"><ListingCard c={{ ...c, salePriceS: S }} rateCard={db.rateCard} settings={db.settings} compact /></div>

      {c.listingStatus === 'LIVE' ? (
        <form action={sReserve} className="mt-3 flex flex-col gap-3">
          <BackHere />
          <input type="hidden" name="id" value={c.id} />
          {needs ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[13px] font-bold">Repair later, at a mechanic you choose</legend>
              <label className="flex min-h-[56px] items-center gap-3 rounded-xl border border-line-strong bg-white px-3 text-[13px] has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-[#F3F8FE]">
                <input type="radio" name="shop" value="regular" />
                <span className="flex-1">Any regular mechanic<span className="block text-xs text-muted">estimate, paid to them</span></span><b>{inr(Rm)}</b>
              </label>
              {pq ? (
                <label className="flex min-h-[56px] items-center gap-3 rounded-xl border border-line-strong bg-white px-3 text-[13px] has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-[#F3F8FE]">
                  <input type="radio" name="shop" value="partner" defaultChecked />
                  <span className="flex-1">Campus partner shop<span className="block text-xs text-amber-ink">{pq.confirmed ? 'confirmed rate' : `~${db.settings.discountPct}% off · proposed, not yet signed`}</span></span><b>{inr(pq.rp)}</b>
                </label>
              ) : null}
              <label className="flex min-h-[44px] items-center gap-3 rounded-xl border border-line-strong bg-white px-3 text-[13px] has-[:checked]:border-2 has-[:checked]:border-primary">
                <input type="radio" name="shop" value="undecided" /> <span className="flex-1">Decide later</span>
              </label>
            </fieldset>
          ) : <input type="hidden" name="shop" value="undecided" />}

          <div className="rounded-2xl border border-line bg-white p-3.5 text-[13px]">
            <div className="lbl mb-2">Who you pay</div>
            <div className="flex justify-between"><span>Pedals · cycle only</span><b>{inr(S)}</b></div>
            {needs ? (
              <>
                <div className="mt-1 flex justify-between text-body"><span>Mechanic, directly (optional)</span><span>{inr(Rm)} regular{pq ? ` / ${inr(pq.rp)} partner` : ''}</span></div>
                <div className="mt-2 flex justify-between border-t border-dashed border-line pt-2 text-xs text-muted"><span>Possible total</span><span>{inr(S + Rm)}{pq ? ` or ${inr(S + pq.rp)}` : ''}</span></div>
              </>
            ) : null}
          </div>
          <Submit className="btn btn-primary btn-lg w-full">Reserve for {inr(S)} · cycle only</Submit>
          <p className="text-center text-[11px] text-muted">Demo reservation: no payment is taken in the app. Pay and collect at the hostel desk with a numbered receipt. Prices are illustrative.</p>
        </form>
      ) : mine ? (
        <div className="mt-3 rounded-2xl border border-[#A9E0D3] bg-teal-soft p-4 text-[13px] text-teal-ink">
          <div className="flex items-center gap-2 font-bold"><CheckCircle2 size={18} aria-hidden /> {c.listingStatus === 'SOLD' ? `Handed over · receipt ${l.receiptNo}` : 'Reserved for you'}</div>
          <p className="mt-1">{c.listingStatus === 'SOLD' ? 'Enjoy the ride, after any listed repairs.' : `Collect at the hostel desk and pay ${inr(S)} for the cycle. ${needs ? 'Get the listed repairs done before riding.' : ''}`}</p>
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-white p-4 text-center text-sm text-muted">This cycle is {c.listingStatus === 'SOLD' ? 'sold' : 'reserved by another student'}.</p>
      )}
    </div>
  );
}
