import Link from 'next/link';
import { Check, Download, Plus } from 'lucide-react';
import { readDb } from '@/lib/store';
import { overview } from '@/lib/metrics';
import { Bar, Card, Chip, Donut, Kpi, PageHeader, TONE, fmtDate, relTime } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { aSemesterReminder } from '@/app/actions';
import type { Tone } from '@/lib/labels';

export const dynamic = 'force-dynamic';

const ACTION_TONE: Record<string, Tone> = {
  CLAIM_SUBMITTED: 'amber', CLAIM_DISPUTED: 'red', CLAIM_APPROVED: 'teal', CLAIM_REJECTED: 'slate',
  NOTICE_PLACED: 'blue', REMINDER_LOGGED: 'blue', WINDOW_CLOSED: 'red', CLEARANCE_APPROVED: 'teal', CLEARANCE_HELD: 'slate', CLEARANCE_DENIED: 'slate',
  GRADED: 'slate', LISTING_APPROVED: 'teal', LISTING_DRAFTED: 'teal', RESERVED: 'amber', SOLD: 'teal', SEMESTER_CONFIRMED: 'blue', EXIT_OFFER: 'blue',
};
const DOT: Record<Tone, string> = { blue: 'bg-accent', teal: 'bg-teal', amber: 'bg-amber', red: 'bg-red', slate: 'bg-muted', navy: 'bg-navy' };

export default async function Overview() {
  const db = readDb();
  const o = overview(db);
  const maxGrade = Math.max(1, o.grades.A, o.grades.B, o.grades.C, o.grades.D, o.grades.none);
  const decisions = o.queue.filter((q) => q.priority <= 5).length;
  const salvageRouted = o.salvage.filter((c) => c.salvageStatus === 'NONE').length;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  const window = `${fmtDate(o.semester.start).replace(/ \d{4}$/, '')} – ${fmtDate(o.semester.end).replace(/ \d{4}$/, '')}`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <span className="flex gap-2">
            <span>RECOVER</span><span className="text-[#B7C6D8]">•</span><span className="text-teal-ink">REUSE</span><span className="text-[#B7C6D8]">•</span><span className="text-amber-ink">PREVENT</span>
          </span>
        }
        title={decisions > 0 ? `${decisions} cycle${decisions === 1 ? '' : 's'} need a decision today` : 'Nothing urgent today'}
        sub={`${today} · every count is computed from the ${o.total} records in this registry.`}
        actions={
          <>
            <a className="btn btn-secondary" href="/admin/export">
              <Download size={15} aria-hidden /> Export CSV
            </a>
            <Link className="btn btn-primary" href="/admin/import">
              <Plus size={15} aria-hidden /> Add / import cycles
            </Link>
          </>
        }
      />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Registry records" value={o.total} href="/admin/inventory" sub={db.settings.datasetMode === 'DEMO' ? 'Field audit ~160 · import pending' : `${o.provenance.imported} imported from audit`} />
        <Kpi label="In claim process" value={o.inClaim} tone="amber" href="/admin/claims" sub={`${o.notices} notice${o.notices === 1 ? '' : 's'} · ${o.claimsPending} claim · ${o.disputes} dispute`} />
        <Kpi label="Awaiting clearance" value={o.awaiting} tone="red" highlight={o.awaiting > 0} href="/admin/claims?tab=clearance" sub={o.held ? `${o.held} on hold · sign-off due` : 'Window over · admin sign-off due'} />
        <Kpi label="Eligible for reuse" value={o.reusable.length} tone="teal" href="/admin/marketplace" sub={`Cleared · safe · R/V ≤ ${db.settings.thresholdPct}%`} />
        <Kpi label="Salvage inventory" value={o.salvage.length} tone="slate" href="/admin/salvage" sub={`${salvageRouted} to route · ${o.salvage.length - salvageRouted} in pipeline`} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[5fr_7fr]">
        <Card title="Condition grades" action={<span className="text-xs text-muted">auditor / mechanic grade</span>}>
          <div className="mt-2 flex flex-col gap-3.5">
            {(
              [
                ['A', 'Ride-ready', o.grades.A, 'teal', 'text-teal-ink'],
                ['B', 'Minor repair', o.grades.B, 'blue', 'text-primary'],
                ['C', 'Major repair', o.grades.C, 'amber', 'text-amber-ink'],
                ['D', 'Salvage', o.grades.D, 'red', 'text-red-ink'],
              ] as const
            ).map(([g, label, n, tone, cls]) => (
              <Link key={g} href={`/admin/inventory?grade=${g}`} className="group block">
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span>
                    <b className={cls}>{g}</b> · {label}
                  </span>
                  <b className="group-hover:text-primary">{n}</b>
                </div>
                <Bar value={n} max={maxGrade} tone={tone} label={`Grade ${g}: ${n}`} />
              </Link>
            ))}
            <Link href="/admin/inventory?grade=none" className="block">
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span className="text-muted">Not yet graded</span>
                <b>{o.grades.none}</b>
              </div>
              <div className="h-2.5 rounded-full bg-slate-soft">
                <div className="hatch h-full rounded-full" style={{ width: `${Math.round((o.grades.none / maxGrade) * 100)}%` }} />
              </div>
            </Link>
          </div>
          <p className="mt-4 border-t border-dashed border-line pt-3 text-xs leading-relaxed text-muted">
            {o.grades.selfReported} grade{o.grades.selfReported === 1 ? ' is' : 's are'} owner self-reports, not mechanic checks. A grade never changes who owns the cycle.
          </p>
        </Card>

        <Card title="Needs action now" action={<Link href="/admin/inventory?pending=1" className="text-[13px] font-semibold text-primary">Full queue ({o.queue.length}) →</Link>}>
          {o.queue.length === 0 ? (
            <p className="text-sm text-muted">No pending decisions.</p>
          ) : (
            <ul className="flex flex-col">
              {o.queue.slice(0, 6).map((q) => (
                <li key={q.key} className="flex items-center gap-3 border-b border-[#EEF2F7] py-2.5 last:border-0">
                  <span className={`chip min-w-[92px] justify-center ${TONE[q.tone]}`}>{q.tag}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{q.title}</div>
                    <div className="truncate text-xs text-muted">{q.detail}</div>
                  </div>
                  <Link href={q.href} className={`btn ${q.priority <= 3 ? 'btn-primary' : 'btn-secondary'}`}>
                    {q.cta}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-[7fr_5fr]">
        <Card title="Ownership pipeline" action={<span className="text-xs text-muted">kept separate from grade</span>}>
          <div className="mt-2 grid grid-cols-3 gap-1.5 md:grid-cols-6">
            {o.pipeline.map((p) => (
              <Link
                key={p.key}
                href={`/admin/inventory?own=${p.key}`}
                className={`rounded-[10px] border-t-[3px] px-2.5 py-3 transition hover:brightness-[.98] ${
                  { slate: 'border-[#9FB3C8] bg-page', blue: 'border-accent bg-pale', amber: 'border-amber bg-[#FEF7E8]', red: 'border-red bg-[#FDF0F2]', teal: 'border-teal bg-[#E9F7F3]', navy: 'border-navy bg-page' }[p.tone]
                }`}
              >
                <div className="font-display text-[22px] font-extrabold">{p.count}</div>
                <div className="text-xs leading-snug text-muted">{p.label}</div>
              </Link>
            ))}
          </div>
          <div className="mt-3.5 flex items-center gap-2.5 rounded-[10px] bg-page px-3 py-2.5 text-[13px] text-body">
            <Check size={16} className="shrink-0 text-teal-ink" aria-hidden />
            <span>
              <b>{o.ownerKnown}</b> cycles have a known owner ({o.registered} registered · {o.verified} claim approved) and sit outside the disposal path.
            </span>
          </div>
        </Card>

        <Card title="Recent activity" action={<Link href="/admin/impact#log" className="text-[13px] font-semibold text-primary">Audit log →</Link>}>
          <ol className="flex flex-col gap-3 text-[13px]">
            {o.recent.map((e) => (
              <li key={e.id} className="flex items-start gap-2.5">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[ACTION_TONE[e.action] ?? 'slate']}`} aria-hidden />
                <div className="min-w-0">
                  <b>{e.actor}</b>{' '}
                  <Link href={e.entity === 'cycle' ? `/admin/cycles/${e.entityId}` : '/admin/impact#log'} className="font-semibold text-primary">
                    {e.entityId}
                  </Link>{' '}
                  <span className="text-body">{e.summary}</span>
                  <div className="text-xs text-muted">{relTime(e.at)}</div>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card title="Semester self-check" action={<Chip tone="blue">{window}</Chip>}>
          <div className="flex items-center gap-4">
            <Donut pct={o.semester.pct} label={`${o.semester.pct}% of owners confirmed`} />
            <div className="text-[13px] leading-relaxed">
              <div>
                <b>{o.semester.confirmed.length}</b> of {o.semester.invited.length} owners confirmed
              </div>
              <div className="text-muted">{o.semester.pending.length} pending → follow-up, never seizure</div>
            </div>
          </div>
          <form action={aSemesterReminder} className="mt-3.5">
            <BackHere />
            <input type="hidden" name="note" value="Reminder round: hostel notice board + QR standee" />
            <Submit className="btn btn-soft w-full">Log reminder round (demo)</Submit>
          </form>
        </Card>
        <Card title="Marketplace" action={<Link href="/admin/marketplace" className="text-[13px] font-semibold text-primary">Open →</Link>}>
          <div className="grid grid-cols-4 gap-2 text-center">
            {(
              [
                ['Draft', o.market.draft, 'bg-pale text-primary'],
                ['Live', o.market.live, 'bg-[#E9F7F3] text-teal-ink'],
                ['Reserved', o.market.reserved, 'bg-[#FEF7E8] text-amber-ink'],
                ['Sold', o.market.sold, 'bg-page text-body'],
              ] as const
            ).map(([l, n, cls]) => (
              <div key={l} className={`rounded-[10px] px-1 py-2.5 ${cls}`}>
                <div className="font-display text-[22px] font-extrabold">{n}</div>
                <div className="text-xs text-muted">{l}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">Buyers pay Pedals the cycle price only. Repairs are paid directly to the mechanic they pick.</p>
        </Card>
        <Card title="Graduation exit" action={<Link href="/admin/exit" className="text-[13px] font-semibold text-primary">Open →</Link>}>
          {o.exitsOpen.length === 0 ? (
            <p className="text-sm text-muted">No open sell / donate offers.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {o.exitsOpen.slice(0, 2).map((e) => (
                <li key={e.id} className="flex items-start gap-3 text-[13px]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-pale font-display text-xs font-extrabold text-primary">{e.choice === 'DONATE' ? 'DON' : 'SELL'}</div>
                  <div>
                    <b>{e.cycleId}</b> · {e.choice === 'DONATE' ? 'donate' : 'sell'} offer from {e.ownerId}
                    <div className="text-xs text-muted">{e.handoverPref}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/exit" className="btn btn-primary mt-3.5 w-full">
            Review exit queue
          </Link>
        </Card>
      </section>
    </div>
  );
}
