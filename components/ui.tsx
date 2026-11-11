import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Tone } from '@/lib/labels';
import { GRADE, OWNERSHIP, LISTING, SALVAGE } from '@/lib/labels';
import type { Cycle, Grade } from '@/lib/types';

export const TONE: Record<Tone, string> = {
  blue: 'bg-pale text-primary',
  teal: 'bg-teal-soft text-teal-ink',
  amber: 'bg-amber-soft text-amber-ink',
  red: 'bg-red-soft text-red-ink',
  slate: 'bg-slate-soft text-body',
  navy: 'bg-navy text-white',
};
export const BAR: Record<Tone, string> = {
  blue: 'bg-accent',
  teal: 'bg-teal',
  amber: 'bg-amber',
  red: 'bg-red',
  slate: 'bg-[#9FB3C8]',
  navy: 'bg-navy',
};

export function Chip({ tone = 'slate', children, className = '', title }: { tone?: Tone; children: ReactNode; className?: string; title?: string }) {
  return (
    <span className={`chip ${TONE[tone]} ${className}`} title={title}>
      {children}
    </span>
  );
}

export function OwnershipChip({ c }: { c: Pick<Cycle, 'ownershipStatus'> }) {
  const m = OWNERSHIP[c.ownershipStatus];
  return <Chip tone={m.tone}>{m.label}</Chip>;
}
export function GradeChip({ grade, selfReported }: { grade: Grade | null; selfReported?: boolean }) {
  if (!grade) return <Chip tone="slate">Ungraded</Chip>;
  const m = GRADE[grade];
  return (
    <Chip tone={m.tone} title={selfReported ? 'Self-reported by owner, not a mechanic check' : m.hint}>
      {m.label}
      {selfReported ? <span className="font-normal opacity-80">· self</span> : null}
    </Chip>
  );
}
export function GradeDot({ grade }: { grade: Grade | null }) {
  const tone = grade ? GRADE[grade].tone : 'slate';
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg font-display text-sm font-extrabold ${TONE[tone]}`} aria-label={grade ? `Grade ${grade}` : 'Ungraded'}>
      {grade ?? '–'}
    </span>
  );
}
export function ListingChip({ c }: { c: Pick<Cycle, 'listingStatus'> }) {
  if (c.listingStatus === 'NONE') return <span className="text-xs text-muted">—</span>;
  const m = LISTING[c.listingStatus];
  return <Chip tone={m.tone}>{m.label}</Chip>;
}
export function SalvageChip({ c }: { c: Pick<Cycle, 'salvageStatus'> }) {
  if (c.salvageStatus === 'NONE') return null;
  const m = SALVAGE[c.salvageStatus];
  return <Chip tone={m.tone}>{m.label}</Chip>;
}

export function Card({ children, className = '', title, action, subtitle }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <section className={`card p-5 ${className}`}>
      {title ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-navy">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, tone, href, highlight }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; href?: string; highlight?: boolean }) {
  const color = tone ? { blue: 'text-primary', teal: 'text-teal-ink', amber: 'text-amber-ink', red: 'text-red-ink', slate: 'text-body', navy: 'text-navy' }[tone] : 'text-navy';
  const inner = (
    <>
      <div className="lbl">{label}</div>
      <div className={`mt-1.5 font-display text-[32px] font-extrabold leading-none ${color}`}>{value}</div>
      {sub ? <div className="mt-2 text-xs text-muted">{sub}</div> : null}
    </>
  );
  const cls = `card block p-4 transition hover:border-[#BBD6F2] ${highlight ? 'border-[#F3C2C8]' : ''}`;
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function PageHeader({ eyebrow, title, sub, actions }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        {eyebrow ? <div className="text-xs font-bold tracking-[0.08em] text-primary">{eyebrow}</div> : null}
        <h1 className="mt-1 text-[26px] font-extrabold leading-tight text-navy">{title}</h1>
        {sub ? <p className="mt-1 max-w-3xl text-sm text-muted">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong bg-[#FAFCFE] px-4 py-8 text-center">
      <div className="text-sm font-semibold text-body">{title}</div>
      {children ? <div className="mt-1 text-xs text-muted">{children}</div> : null}
    </div>
  );
}

export function Callout({ tone = 'blue', icon, children, className = '' }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  const border = { blue: 'border-[#BBD6F2]', teal: 'border-[#A9E0D3]', amber: 'border-[#F6D58E]', red: 'border-[#F3C2C8]', slate: 'border-line', navy: 'border-navy' }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] leading-relaxed ${TONE[tone]} ${border} ${className}`}>
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Money({ v, dash = '—' }: { v: number | null | undefined; dash?: string }) {
  if (v == null) return <>{dash}</>;
  return <>₹{v.toLocaleString('en-IN')}</>;
}

export function Bar({ value, max, tone = 'blue', label }: { value: number; max: number; tone?: Tone; label?: string }) {
  const pct = max > 0 ? Math.max(value > 0 ? 3 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2.5 rounded-full bg-slate-soft" role="img" aria-label={label ?? `${value} of ${max}`}>
      <div className={`h-full rounded-full ${BAR[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Donut({ pct, size = 88, label }: { pct: number; size?: number; label: string }) {
  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size, background: `conic-gradient(var(--color-primary) 0 ${pct}%, var(--color-line) ${pct}% 100%)` }}
      role="img"
      aria-label={label}
    >
      <div className="absolute inset-[11px] flex items-center justify-center rounded-full bg-white font-display text-lg font-extrabold text-navy">{pct}%</div>
    </div>
  );
}

export function Meter({ pct, threshold }: { pct: number | null; threshold: number }) {
  const shown = pct == null ? 0 : Math.min(100, pct);
  const ok = pct != null && pct <= threshold;
  return (
    <div>
      <div className="relative h-3.5 rounded-full" style={{ background: `linear-gradient(90deg, #CDEFE6 0 ${threshold}%, #FBE3E6 ${threshold}% 100%)` }}>
        {pct != null ? <div className={`absolute inset-y-0 left-0 rounded-full ${ok ? 'bg-teal' : 'bg-red'}`} style={{ width: `${shown}%` }} /> : null}
        <div className="absolute -top-1.5 -bottom-1.5 w-0.5 bg-navy" style={{ left: `${threshold}%` }} aria-hidden />
      </div>
      <div className="relative mt-1.5 h-4 text-[11px] text-muted">
        <span className="absolute left-0">0%</span>
        <span className="absolute -translate-x-1/2 font-semibold text-navy" style={{ left: `${threshold}%` }}>
          {threshold}% cut-off
        </span>
        <span className="absolute right-0">100%</span>
      </div>
    </div>
  );
}

export function fmtDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', withTime ? { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false } : { day: 'numeric', month: 'short', year: 'numeric' });
}
export function relTime(iso: string, now = Date.now()) {
  const diff = now - Date.parse(iso);
  const m = Math.round(diff / 60000);
  if (Math.abs(m) < 60) return m <= 1 ? 'just now' : `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  return fmtDate(iso);
}

export function Back({ name = 'back', value }: { name?: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
