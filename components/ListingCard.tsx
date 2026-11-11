import { AlertTriangle, Bike, CheckCircle2 } from 'lucide-react';
import { partnerQuote, repairCostR } from '@/lib/rules';
import { GRADE } from '@/lib/labels';
import type { Cycle, RateCardItem, Settings } from '@/lib/types';
import { Chip } from './ui';

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

/** The buyer-facing listing: cycle price S shown apart from optional repair quotes. */
export function ListingCard({ c, rateCard, settings, compact = false }: { c: Cycle; rateCard: RateCardItem[]; settings: Settings; compact?: boolean }) {
  const R = repairCostR(c) ?? 0;
  const pq = partnerQuote(c, settings, rateCard);
  const needsRepair = c.grade === 'B' || c.grade === 'C';
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative flex h-[120px] items-center justify-center bg-gradient-to-br from-pale to-[#D8E8F8]">
        <Bike size={64} strokeWidth={1.2} className="text-accent" aria-hidden />
        <span className="absolute top-2.5 left-2.5">{c.grade ? <Chip tone={GRADE[c.grade].tone} className="bg-white">{GRADE[c.grade].label}</Chip> : null}</span>
        <span className="absolute top-2.5 right-2.5 rounded-md bg-white/90 px-2 py-0.5 font-display text-xs font-extrabold text-navy">{c.id}</span>
      </div>
      <div className="p-4">
        {needsRepair ? (
          <div className="flex items-start gap-2 rounded-xl border border-[#F3C2C8] bg-[#FDF0F2] px-3 py-2 text-[13px] text-[#8C2230]">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span><b>Requires repairs, not ride-ready.</b> Do not ride before the listed repairs and a safety check.</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-teal-soft px-3 py-2 text-[13px] text-teal-ink">
            <CheckCircle2 size={16} aria-hidden /> <b>Ready to ride</b> · mechanic safety check passed
          </div>
        )}
        {c.faults.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.repairItems.map((i) => (
              <span key={i.id} className="chip bg-slate-soft text-body">{i.operation}</span>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex items-end justify-between border-t border-dashed border-line pt-3">
          <div>
            <div className="text-xs text-muted">Cycle price · pay Pedals</div>
            <div className="font-display text-[28px] font-extrabold text-navy">{inr(c.salePriceS ?? 0)}</div>
          </div>
          <div className="text-right text-xs text-muted">{c.description}<br />{c.zone}</div>
        </div>
        {needsRepair && !compact ? (
          <div className="mt-3 rounded-xl bg-page p-3 text-[13px]">
            <div className="flex justify-between"><span>Regular mechanic (estimate)</span><b>{inr(R)}</b></div>
            {pq ? (
              <div className="mt-1 flex justify-between"><span>Partner shop <span className="text-xs text-amber-ink">{pq.confirmed ? 'confirmed' : `~${settings.discountPct}% off · proposed`}</span></span><b>{inr(pq.rp)}</b></div>
            ) : null}
            <div className="mt-1.5 text-[11px] text-muted">Repairs are optional and paid directly to the mechanic you choose. Pedals never charges for repairs.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
