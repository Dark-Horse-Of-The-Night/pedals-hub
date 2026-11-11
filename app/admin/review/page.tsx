import Link from 'next/link';
import { readDb } from '@/lib/store';
import { dispositionBlockers, repairCostR, technicalRoute } from '@/lib/rules';
import { Callout, Card, Chip, GradeDot, Money, OwnershipChip, PageHeader } from '@/components/ui';
import { GRADE } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function ReviewList() {
  const db = readDb();
  const t = db.settings.thresholdPct;
  const rows = db.cycles
    .filter((c) => !['REGISTERED', 'TRANSFERRED'].includes(c.ownershipStatus) && !['DISMANTLING', 'PARTS_LOGGED', 'RESIDUAL_PENDING', 'COMPLETED'].includes(c.salvageStatus))
    .map((c) => ({ c, r: technicalRoute(c, db.settings), R: repairCostR(c), cleared: dispositionBlockers(c, db.claims).length === 0 }))
    .sort((a, b) => Number(b.cleared) - Number(a.cleared) || a.c.id.localeCompare(b.c.id));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Grading & repair viability" sub="Mechanics and volunteers may grade at any time; the route (list or salvage) only unlocks after written clearance." />
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title="Decision rule (team proposal)">
          <div className="grid gap-3 sm:grid-cols-4">
            {(['A', 'B', 'C', 'D'] as const).map((g) => (
              <div key={g} className="rounded-xl border border-line p-3">
                <div className="flex items-center gap-2"><GradeDot grade={g} /><b className="text-sm">{GRADE[g].short}</b></div>
                <p className="mt-1.5 text-xs text-muted">{GRADE[g].hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-page p-4 text-[13px] leading-relaxed">
            <div className="font-display text-lg font-extrabold text-navy">P = R ÷ V × 100</div>
            <ul className="mt-1 list-disc pl-5 text-body">
              <li><b>R</b> = necessary repairs at the conservative regular quote (never the partner discount).</li>
              <li><b>V</b> = expected resale value after repair (not MRP, not the as-is price S).</li>
              <li>Cleared B/C with <b>P ≤ {t}%</b> and a passed safety check → may be listed with defects disclosed. Exactly {t}% qualifies.</li>
              <li><b>P &gt; {t}%</b>, grade D or an unsafe frame → salvage safe parts, recycle the rest. Missing V → price review.</li>
            </ul>
          </div>
        </Card>
        <Card title="Worked examples (illustrative ₹)">
          <ul className="flex flex-col gap-2 text-[13px]">
            <li className="flex items-center justify-between rounded-xl border border-line px-3 py-2"><span>R ₹800 · V ₹2,500</span><Chip tone="teal">32% · list</Chip></li>
            <li className="flex items-center justify-between rounded-xl border border-line px-3 py-2"><span>R ₹800 · V ₹2,000</span><Chip tone="teal">40% · list (boundary)</Chip></li>
            <li className="flex items-center justify-between rounded-xl border border-line px-3 py-2"><span>R ₹1,500 · V ₹3,000</span><Chip tone="red">50% · salvage</Chip></li>
            <li className="flex items-center justify-between rounded-xl border border-line px-3 py-2"><span>R ₹600 · V ₹2,000 · cracked frame</span><Chip tone="red">30% · safety veto</Chip></li>
          </ul>
          <Callout tone="amber" className="mt-3">Values are placeholders until written local quotes are recorded on the rate card.</Callout>
        </Card>
      </div>

      <section className="card overflow-hidden">
        <h2 className="px-5 pt-4 text-base font-bold text-navy">Review queue ({rows.length})</h2>
        <div className="overflow-x-auto">
          <table className="tbl min-w-[920px]">
            <thead><tr><th className="pl-5">Cycle</th><th>Ownership</th><th>Grade</th><th>R</th><th>V</th><th>R/V</th><th>Safety</th><th>Technical route</th><th className="pr-5"></th></tr></thead>
            <tbody>
              {rows.map(({ c, r, R, cleared }) => (
                <tr key={c.id}>
                  <td className="pl-5"><Link href={`/admin/cycles/${c.id}`} className="font-display font-extrabold text-navy hover:text-primary">{c.id}</Link><div className="text-xs text-muted">{c.faults.join(', ') || 'no faults recorded'}</div></td>
                  <td><OwnershipChip c={c} /></td>
                  <td><GradeDot grade={c.grade} /></td>
                  <td><Money v={R} /></td>
                  <td><Money v={c.refurbishedValueV} /></td>
                  <td>{r.viability?.pct != null ? <Chip tone={r.viability.pct <= t ? 'teal' : 'red'}>{r.viability.pct}%</Chip> : <span className="text-xs text-muted">—</span>}</td>
                  <td>{c.safety === 'SAFE' ? <Chip tone="teal">Safe</Chip> : c.safety === 'UNSAFE' ? <Chip tone="red">Unsafe</Chip> : <Chip tone="slate">Unchecked</Chip>}</td>
                  <td>
                    <Chip tone={r.route === 'LIST' ? 'teal' : r.route === 'SALVAGE' ? 'red' : 'amber'}>{r.route === 'LIST' ? 'List' : r.route === 'SALVAGE' ? 'Salvage' : 'Review'}</Chip>
                    {!cleared ? <span className="ml-1.5 text-[11px] text-muted">locked until clearance</span> : null}
                  </td>
                  <td className="pr-5"><Link href={`/admin/cycles/${c.id}`} className="btn btn-secondary">Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
