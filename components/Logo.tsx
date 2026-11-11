import { Bike } from 'lucide-react';

export function Logo({ sub = 'Operations Centre', light = false }: { sub?: string; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`flex h-[38px] w-[38px] items-center justify-center rounded-[11px] ${light ? 'bg-white/15' : 'bg-primary'}`}>
        <Bike size={22} color="#fff" strokeWidth={2} aria-hidden />
      </div>
      <div className="leading-tight">
        <div className={`font-display text-[17px] font-extrabold ${light ? 'text-white' : 'text-navy'}`}>Pedals Hub</div>
        <div className={`text-xs ${light ? 'text-[#B7C6D8]' : 'text-muted'}`}>{sub}</div>
      </div>
    </div>
  );
}

export function DemoPill({ mode }: { mode: 'DEMO' | 'IMPORTED' | 'MIXED' }) {
  if (mode === 'IMPORTED')
    return <span className="chip border border-[#A9E0D3] bg-teal-soft px-2.5 py-1 text-teal-ink">● Field audit data (imported)</span>;
  return (
    <span className="chip border border-[#F6D58E] bg-amber-soft px-2.5 py-1 text-amber-ink" title="Synthetic fixture records, not the team's ~160-cycle field audit">
      ● DEMO DATA · not the field audit
    </span>
  );
}
