import { readDb } from '@/lib/store';
import { staffActor } from '@/lib/session';
import { readPreview, AUDIT_COLUMNS, cycleIdForTag } from '@/lib/importer';
import { Callout, Card, Chip, PageHeader } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { aImportCancel, aImportCommit, aImportPreview } from '@/app/actions';
import { mapGrade } from '@/lib/rules';

export const dynamic = 'force-dynamic';

export default async function ImportPage() {
  const db = readDb();
  const actor = await staffActor();
  const admin = actor.role === 'admin';
  const p = readPreview();
  const good = p ? p.rows.filter((r) => !r.issues.length && !r.duplicate) : [];
  const grades = good.reduce<Record<string, number>>((acc, r) => {
    const g = mapGrade(r.grade) ?? 'Ungraded';
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Import the field audit" sub="Upload the team sheet ProjectPedals_Audit.xlsx (Audit tab) or a CSV export of it. Rows are previewed, checked and de-duplicated by Tag No. before anything is saved." />
      <Callout tone="amber">
        The audit workbook supplied so far is the <b>empty template</b>: headers and dropdowns, no filled rows. Once the ~160 rows are filled in, import them here and every dashboard switches from demo fixtures to real field data.
      </Callout>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title="1 · Upload">
          <form action={aImportPreview} className="flex flex-wrap items-center gap-3">
            <input type="file" name="file" accept=".xlsx,.csv" required className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-pale file:px-3 file:py-2 file:font-semibold file:text-primary" disabled={!admin} />
            <Submit className="btn btn-primary" disabled={!admin}>Read & preview</Submit>
          </form>
          {!admin ? <p className="mt-2 text-xs text-muted">Only the admin role can import.</p> : null}
          <p className="mt-3 text-xs text-muted">Nothing is saved at this step. Example rows (“e.g.”) and blank numbered rows are skipped automatically.</p>
        </Card>
        <Card title="Column mapping (fixed to the team template)">
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-body">
            {AUDIT_COLUMNS.map((c) => <li key={c}>• {c}</li>)}
          </ul>
          <p className="mt-2 text-xs text-muted">Tag T001 → cycle ID {cycleIdForTag('T001', db.settings.idPrefix)}. Ride-ready/Minor/Major/Scrap → A/B/C/D. Moved = Y → “in use”, otherwise “flagged”: a suspicion, not abandonment.</p>
        </Card>
      </div>

      {p ? (
        <Card title={`2 · Preview: ${p.fileName}`} subtitle={`${p.rows.length} data rows · ${good.length} valid · ${p.rows.length - good.length} with issues or duplicates · ${p.skipped} blank/example rows skipped`}>
          {p.missingColumns.length ? <Callout tone="red" className="mb-3">Missing columns: {p.missingColumns.join(', ')}</Callout> : null}
          {p.rows.length === 0 ? (
            <p className="text-sm text-muted">The sheet has headers but no filled rows yet.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
                {Object.entries(grades).map(([g, n]) => <Chip key={g} tone="blue">{g}: {n}</Chip>)}
              </div>
              <div className="max-h-[420px] overflow-auto rounded-xl border border-line">
                <table className="tbl min-w-[980px]">
                  <thead className="sticky top-0 bg-white"><tr><th>Row</th><th>Tag</th><th>→ ID</th><th>Spot</th><th>Lock</th><th>Rust/Dust</th><th>Blocked</th><th>Fault</th><th>Grade</th><th>Moved</th><th>Check</th></tr></thead>
                  <tbody>
                    {p.rows.map((r) => (
                      <tr key={r.row} className={r.issues.length || r.duplicate ? 'bg-[#FFF6F7]' : ''}>
                        <td className="text-xs text-muted">{r.row}</td><td className="font-semibold">{r.tagNo || '—'}</td><td className="text-xs">{r.tagNo ? cycleIdForTag(r.tagNo, db.settings.idPrefix) : '—'}</td>
                        <td className="max-w-[200px] truncate text-xs">{r.spot}</td><td className="text-xs">{r.lock}</td><td className="text-xs">{r.rust}/{r.dust}</td><td className="text-xs">{r.blockedIn == null ? '—' : r.blockedIn ? 'Y' : 'N'}</td>
                        <td className="text-xs">{r.mainFault}</td><td className="text-xs">{r.grade ?? '—'}</td><td className="text-xs">{r.moved == null ? '—' : r.moved ? 'Y' : 'N'}</td>
                        <td>{r.duplicate ? <Chip tone="red">Duplicate tag</Chip> : r.issues.length ? <Chip tone="red" title={r.issues.join('; ')}>{r.issues[0]}</Chip> : <Chip tone="teal">OK</Chip>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <form action={aImportCommit}>
              <BackHere />
              <Submit className="btn btn-primary" disabled={!admin || good.length === 0} confirm={`Import ${good.length} rows? This REPLACES all demo fixtures (they are never mixed with field data).`}>Commit {good.length} rows</Submit>
            </form>
            <form action={aImportCancel}><Submit className="btn btn-secondary">Discard preview</Submit></form>
            <span className="text-xs text-muted">Check that no spot text names a hostel before committing (anonymity rule).</span>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
