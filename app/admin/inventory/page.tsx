import Link from 'next/link';
import { Download, QrCode } from 'lucide-react';
import { readDb } from '@/lib/store';
import { actionQueue } from '@/lib/metrics';
import { abandonmentSignals, technicalRoute, repairCostR } from '@/lib/rules';
import { OWNERSHIP } from '@/lib/labels';
import { Card, Chip, Empty, GradeDot, ListingChip, OwnershipChip, PageHeader, SalvageChip, TONE, relTime } from '@/components/ui';
import type { Cycle, OwnershipStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const OWN_GROUPS: Record<string, OwnershipStatus[]> = {
  CLAIM: ['CLAIM_PENDING', 'DISPUTED'],
  AWAITING_CLEARANCE: ['AWAITING_CLEARANCE', 'HELD'],
  KNOWN: ['REGISTERED', 'OWNER_VERIFIED', 'IN_USE'],
};

export default async function Inventory({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const db = readDb();
  const queue = actionQueue(db);
  const q = (sp.q ?? '').trim().toLowerCase();
  const grade = sp.grade ?? '';
  const own = sp.own ?? '';
  const listing = sp.listing ?? '';
  const sort = sp.sort ?? 'id';

  let rows = db.cycles.filter((c) => {
    if (q) {
      const hay = [c.id, c.description, c.spot, c.bay, c.zone, c.grade ? 'grade ' + c.grade : 'ungraded', OWNERSHIP[c.ownershipStatus].label, c.audit?.tagNo ?? ''].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (grade === 'none' ? !!c.grade : grade && c.grade !== grade) return false;
    if (own && !(OWN_GROUPS[own] ?? [own]).includes(c.ownershipStatus)) return false;
    if (listing && c.listingStatus !== listing) return false;
    if (sp.pending && !queue.some((x) => x.cycleId === c.id)) return false;
    return true;
  });
  rows = rows.sort((a, b) => (sort === 'updated' ? b.updatedAt.localeCompare(a.updatedAt) : sort === 'grade' ? (a.grade ?? 'Z').localeCompare(b.grade ?? 'Z') : a.id.localeCompare(b.id)));

  const filtersOn = q || grade || own || listing || sp.pending;
  const sel = 'h-10 rounded-[10px] border border-line-strong bg-white px-2.5 text-sm';

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Inventory"
        sub="One row per permanent QR tag. Ownership, grade, listing and salvage are separate columns on purpose."
        actions={
          <>
            <Link className="btn btn-secondary" href="/admin/tags">
              <QrCode size={15} aria-hidden /> Print tags
            </Link>
            <a className="btn btn-secondary" href={`/admin/export${filtersOn ? '?' + new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString() : ''}`}>
              <Download size={15} aria-hidden /> Export CSV
            </a>
            <Link className="btn btn-primary" href="/admin/import">
              Import audit sheet
            </Link>
          </>
        }
      />

      {sp.pending ? (
        <Card title={`Action queue (${queue.length})`} subtitle="Ordered by urgency: claims and clearance first.">
          <ul className="grid gap-2 md:grid-cols-2">
            {queue.map((x) => (
              <li key={x.key} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <span className={`chip min-w-[86px] justify-center ${TONE[x.tone]}`}>{x.tag}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{x.title}</div>
                  <div className="truncate text-xs text-muted">{x.detail}</div>
                </div>
                <Link href={x.href} className="btn btn-secondary">
                  {x.cta}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <form className="card flex flex-wrap items-end gap-3 p-4" action="/admin/inventory">
        <label className="min-w-[200px] flex-1 text-xs font-semibold text-body">
          Search
          <input name="q" defaultValue={sp.q} className="field mt-1" placeholder="ID, bay, description, tag no." />
        </label>
        <label className="text-xs font-semibold text-body">
          Grade
          <select name="grade" defaultValue={grade} className={`${sel} mt-1 block`}>
            <option value="">All</option>
            <option value="A">A · Ride-ready</option>
            <option value="B">B · Minor</option>
            <option value="C">C · Major</option>
            <option value="D">D · Salvage</option>
            <option value="none">Ungraded</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-body">
          Ownership
          <select name="own" defaultValue={own} className={`${sel} mt-1 block`}>
            <option value="">All</option>
            <option value="KNOWN">Owner known</option>
            {Object.entries(OWNERSHIP).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
            <option value="CLAIM">Claim or dispute</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-body">
          Listing
          <select name="listing" defaultValue={listing} className={`${sel} mt-1 block`}>
            <option value="">All</option>
            {['DRAFT', 'LIVE', 'RESERVED', 'SOLD', 'WITHDRAWN'].map((l) => (
              <option key={l} value={l}>
                {l[0] + l.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-body">
          Sort
          <select name="sort" defaultValue={sort} className={`${sel} mt-1 block`}>
            <option value="id">Cycle ID</option>
            <option value="updated">Last updated</option>
            <option value="grade">Grade</option>
          </select>
        </label>
        <label className="flex h-10 items-center gap-2 text-sm text-body">
          <input type="checkbox" name="pending" value="1" defaultChecked={!!sp.pending} /> Needs action
        </label>
        <button className="btn btn-primary">Apply</button>
        {filtersOn ? (
          <Link href="/admin/inventory" className="btn btn-secondary">
            Clear
          </Link>
        ) : null}
      </form>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <h2 className="text-base font-bold text-navy">
            {rows.length} of {db.cycles.length} cycles
          </h2>
          <span className="text-xs text-muted">Click a row to open the record</span>
        </div>
        {rows.length === 0 ? (
          <div className="p-5">
            <Empty title="No cycles match these filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[1040px]">
              <thead>
                <tr>
                  <th className="pl-5">Cycle</th>
                  <th>Location</th>
                  <th>Ownership</th>
                  <th>Grade</th>
                  <th>Faults</th>
                  <th>R / V</th>
                  <th>Reuse</th>
                  <th>Signals</th>
                  <th>Next action</th>
                  <th className="pr-5">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <Row key={c.id} c={c} next={queue.find((x) => x.cycleId === c.id)} thresholdPct={db.settings.thresholdPct} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ c, next, thresholdPct }: { c: Cycle; next?: ReturnType<typeof actionQueue>[number]; thresholdPct: number }) {
  const route = technicalRoute(c, { thresholdPct });
  const v = route.viability;
  const sig = abandonmentSignals(c.audit);
  const r = repairCostR(c);
  return (
    <tr className="cursor-pointer">
      <td className="pl-5">
        <Link href={`/admin/cycles/${c.id}`} className="font-display font-extrabold text-navy hover:text-primary">
          {c.id}
        </Link>
        <div className="max-w-[180px] truncate text-xs text-muted">{c.description}</div>
      </td>
      <td className="text-[13px]">
        <div>{c.bay}</div>
        <div className="max-w-[170px] truncate text-xs text-muted">{c.spot}</div>
      </td>
      <td>
        <OwnershipChip c={c} />
      </td>
      <td>
        <span className="flex items-center gap-1.5">
          <GradeDot grade={c.grade} />
          {c.selfReported ? <span className="text-[11px] text-muted">self</span> : null}
        </span>
      </td>
      <td className="text-[13px]">{c.faults.length || <span className="text-muted">0</span>}</td>
      <td className="text-[13px]">
        {v?.pct != null ? (
          <Chip tone={v.pct <= thresholdPct ? 'teal' : 'red'}>{v.pct}%</Chip>
        ) : c.grade === 'A' && c.safety === 'SAFE' ? (
          <span className="text-xs text-muted">n/a · A</span>
        ) : r == null ? (
          <span className="text-xs text-muted">no estimate</span>
        ) : (
          <span className="text-xs text-muted">needs V</span>
        )}
        {c.safety === 'UNSAFE' ? <Chip tone="red" className="ml-1">unsafe</Chip> : null}
      </td>
      <td>
        <div className="flex flex-col items-start gap-1">
          <ListingChip c={c} />
          <SalvageChip c={c} />
        </div>
      </td>
      <td className="text-[13px]">{c.audit ? <span title={sig.list.join(', ')}>{sig.count}/{sig.of}</span> : <span className="text-xs text-muted">registered</span>}</td>
      <td>
        {next ? (
          <Link href={next.href} className={`chip ${TONE[next.tone]} hover:brightness-95`}>
            {next.cta} →
          </Link>
        ) : (
          <span className="text-xs text-muted">—</span>
        )}
      </td>
      <td className="pr-5 text-xs text-muted">{relTime(c.updatedAt)}</td>
    </tr>
  );
}
