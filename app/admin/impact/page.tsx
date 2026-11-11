import Link from 'next/link';
import { Download, Printer } from 'lucide-react';
import { readDb } from '@/lib/store';
import { impact, overview } from '@/lib/metrics';
import { Callout, Card, Kpi, PageHeader, fmtDate } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function Impact() {
  const db = readDb();
  const m = impact(db);
  const o = overview(db);
  const log = [...db.log].sort((a, b) => b.at.localeCompare(a.at));
  const demo = db.settings.datasetMode === 'DEMO';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Impact & reports"
        sub="Outcomes recorded by actions in this registry. Pilot KPIs: baselines are set in the pilot; no targets are assumed."
        actions={
          <>
            <a className="btn btn-secondary" href="/admin/export?kind=log"><Download size={15} aria-hidden /> Audit log CSV</a>
            <a className="btn btn-secondary" href="/admin/export"><Download size={15} aria-hidden /> Inventory CSV</a>
          </>
        }
      />
      {demo ? <Callout tone="amber"><b>Demo data.</b> These numbers come from 22 synthetic fixture records and the actions taken in this demo. They are not results of the field audit or of any real pilot.</Callout> : <Callout tone="teal">Field-audit data imported. Figures come from imported rows and the actions recorded since.</Callout>}

      <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Recover · due process</h2>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Records verified" value={m.verifiedRecords} sub="re-checked or owner-confirmed" />
        <Kpi label="Claims resolved" value={m.resolvedClaims} sub={`${m.returned} returned to owners`} tone="teal" />
        <Kpi label="Open disputes" value={m.openDisputes} tone={m.openDisputes ? 'red' : 'slate'} sub="with authorised officer" />
        <Kpi label="Written clearances" value={m.clearedTotal} sub="incl. voluntary exits" tone="navy" />
      </section>

      <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Reuse · value</h2>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Cycles reused" value={m.soldCount} sub={`${o.market.live} live · ${o.market.reserved} reserved`} tone="teal" />
        <Kpi label="Bays potentially freed" value={m.baysFreed} sub="cleared cycles moved out of parking" />
        <Kpi label="Safe parts recovered" value={m.reusedParts} sub={`${m.residualPending} residual lot(s) awaiting recycler`} />
        <Kpi label="Clearance → sale" value={m.avgTurnoverDays != null ? `${m.avgTurnoverDays} d` : '—'} sub="average turnaround" />
      </section>

      <h2 className="text-sm font-bold tracking-wide text-muted uppercase">Prevent · adoption</h2>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Semester check" value={`${m.semesterPct}%`} sub={`${m.semester.confirmed.length} of ${m.semester.invited.length} owners`} tone="blue" />
        <Kpi label="Owner-linked tags" value={m.qrRegistered} sub="registered or verified owners" />
        <Kpi label="Reminders logged" value={m.remindersLogged} sub="manual / demo, nothing sent" />
        <Kpi label="Exit handovers" value={m.exitsReceived} sub={`${o.exitsOpen.length} offer(s) open`} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Money (recorded, demo)">
          <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-[13px]">
            <dt>Cycle sale proceeds recorded</dt><dd className="font-semibold">₹{m.proceeds.toLocaleString('en-IN')}</dd>
            <dt>Indicative buyer saving via partner shop</dt><dd className="font-semibold">₹{m.partnerSavings.toLocaleString('en-IN')} <span className="text-xs font-normal text-amber-ink">{db.settings.discountConfirmed ? '' : 'unverified'}</span></dd>
            <dt>Repair money handled by Pedals</dt><dd className="font-semibold">₹0 (by design)</dd>
          </dl>
          <p className="mt-3 text-xs text-muted">Proceeds would go to an institute-approved programme fund only if authorised. No environmental savings are claimed.</p>
        </Card>
        <Card title="Cost lines (team estimates, replace with quotes)">
          <ul className="text-[13px]">
            {db.settings.costs.map((c) => (
              <li key={c.label} className="flex justify-between border-b border-[#EEF2F7] py-1.5 last:border-0"><span>{c.label} <span className="text-xs text-muted">· {c.basis}</span></span><b>{c.amount}</b></li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Cost per cycle and staff-minutes per cycle are measured during the pilot.</p>
        </Card>
      </div>

      <section id="log" className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4">
          <h2 className="text-base font-bold text-navy">Audit log ({log.length})</h2>
          <span className="flex items-center gap-1 text-xs text-muted"><Printer size={13} aria-hidden /> print-friendly</span>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="tbl min-w-[860px]">
            <thead className="sticky top-0 bg-white"><tr><th className="pl-5">When</th><th>Actor</th><th>Record</th><th>Action</th><th className="pr-5">Summary</th></tr></thead>
            <tbody>
              {log.map((e) => (
                <tr key={e.id}>
                  <td className="pl-5 text-xs whitespace-nowrap text-muted">{fmtDate(e.at, true)}</td>
                  <td className="text-xs whitespace-nowrap">{e.actor} <span className="text-muted">({e.role})</span></td>
                  <td className="text-xs">{e.entity === 'cycle' ? <Link href={`/admin/cycles/${e.entityId}`} className="font-semibold text-primary">{e.entityId}</Link> : e.entityId}</td>
                  <td className="text-xs font-semibold whitespace-nowrap">{e.action.replaceAll('_', ' ').toLowerCase()}</td>
                  <td className="pr-5 text-xs">{e.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
