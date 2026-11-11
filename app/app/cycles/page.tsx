import Link from 'next/link';
import { Bike } from 'lucide-react';
import { readDb } from '@/lib/store';
import { GRADE } from '@/lib/labels';
import { Chip } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Browse({ searchParams }: { searchParams: Promise<{ grade?: string; max?: string }> }) {
  const sp = await searchParams;
  const db = readDb();
  const max = sp.max ? Number(sp.max) : null;
  // Only admin-approved LIVE listings are public. Uncleared or salvage cycles never appear.
  const list = db.cycles
    .filter((c) => c.listingStatus === 'LIVE')
    .filter((c) => !sp.grade || c.grade === sp.grade)
    .filter((c) => max == null || (c.salePriceS ?? 0) <= max)
    .sort((a, b) => (a.salePriceS ?? 0) - (b.salePriceS ?? 0));
  const pill = (label: string, href: string, on: boolean) => (
    <Link href={href} className={`chip border px-3 py-1.5 ${on ? 'border-primary bg-pale text-primary' : 'border-line bg-white text-body'}`}>{label}</Link>
  );
  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ grade: sp.grade, max: sp.max, ...o }).filter(([, v]) => v) as [string, string][]);
    return '/app/cycles' + (p.toString() ? '?' + p : '');
  };
  return (
    <div className="px-4 pt-4">
      <h1 className="font-display text-xl font-extrabold text-navy">Buy a campus cycle</h1>
      <p className="mt-1 text-[13px] text-muted">Every cycle here was cleared by the hostel office and checked by a mechanic. You pay Pedals the cycle price only; repairs are your choice.</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {pill('All', q({ grade: undefined }), !sp.grade)}
        {(['A', 'B', 'C'] as const).map((g) => pill(`${g} · ${GRADE[g].short}`, q({ grade: g }), sp.grade === g))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {pill('Any price', q({ max: undefined }), !sp.max)}
        {['1000', '1500'].map((m) => pill(`≤ ₹${Number(m).toLocaleString('en-IN')}`, q({ max: m }), sp.max === m))}
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {list.map((c) => {
          const needs = c.grade === 'B' || c.grade === 'C';
          return (
            <li key={c.id}>
              <Link href={`/app/cycles/${c.id}`} className="flex gap-3 rounded-2xl border border-line bg-white p-3 transition hover:border-[#BBD6F2]">
                <div className="flex h-[84px] w-[96px] shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pale to-[#D8E8F8]"><Bike size={40} strokeWidth={1.3} className="text-accent" aria-hidden /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><b className="font-display">{c.id}</b><b className="font-display text-lg text-navy">₹{(c.salePriceS ?? 0).toLocaleString('en-IN')}</b></div>
                  <div className="truncate text-xs text-muted">{c.description}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {needs ? <Chip tone="red">Repair required</Chip> : <Chip tone="teal">Ready to ride</Chip>}
                    {c.grade ? <Chip tone={GRADE[c.grade].tone}>{c.grade}</Chip> : null}
                  </div>
                  {c.faults.length ? <div className="mt-1 truncate text-[11px] text-muted">Faults: {c.faults.join(', ')}</div> : null}
                </div>
              </Link>
            </li>
          );
        })}
        {list.length === 0 ? <li className="rounded-2xl bg-white p-5 text-center text-sm text-muted">No cycles match right now. New cleared cycles appear after each pilot week.</li> : null}
      </ul>
    </div>
  );
}
