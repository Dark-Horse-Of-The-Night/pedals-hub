import { readDb } from '@/lib/store';
import { repairCostR, technicalRoute } from '@/lib/rules';

export const dynamic = 'force-dynamic';

const esc = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(esc).join(',')).join('\r\n');

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') ?? 'inventory';
  const db = readDb();
  const prov = db.settings.datasetMode === 'DEMO' ? 'DEMO-DATA' : 'FIELD-AUDIT';
  let body: string;
  if (kind === 'log') {
    body = csv([['at', 'actor', 'role', 'entity', 'entityId', 'action', 'summary'], ...db.log.map((e) => [e.at, e.actor, e.role, e.entity, e.entityId, e.action, e.summary])]);
  } else if (kind === 'notices') {
    body = csv([
      ['cycleId', 'physicalTag', 'noticeStart', 'noticeDeadline', 'reminderAt', 'claims', 'ownershipStatus'],
      ...db.cycles.filter((c) => c.noticeStart).map((c) => [c.id, c.physicalTagPlaced ? 'Y' : 'N', c.noticeStart, c.noticeDeadline, c.reminderAt, db.claims.filter((x) => x.cycleId === c.id).length, c.ownershipStatus]),
    ]);
  } else {
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const grade = url.searchParams.get('grade');
    const rows = db.cycles.filter((c) => (!q || (c.id + c.spot + c.description).toLowerCase().includes(q)) && (!grade || (grade === 'none' ? !c.grade : c.grade === grade)));
    body = csv([
      ['cycleId', 'tagNo', 'provenance', 'zone', 'spot', 'ownershipStatus', 'grade', 'selfReported', 'faults', 'safety', 'R', 'V', 'S', 'R_over_V_pct', 'technicalRoute', 'listingStatus', 'salvageStatus', 'noticeDeadline', 'lastVerified', 'updatedAt'],
      ...rows.map((c) => {
        const r = technicalRoute(c, db.settings);
        return [c.id, c.audit?.tagNo, c.provenance, c.zone, c.spot, c.ownershipStatus, c.grade, c.selfReported ? 'Y' : 'N', c.faults.join('; '), c.safety, repairCostR(c), c.refurbishedValueV, c.salePriceS, r.viability?.pct, r.route, c.listingStatus, c.salvageStatus, c.noticeDeadline, c.lastVerified, c.updatedAt];
      }),
    ]);
  }
  return new Response('﻿' + body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pedals-${kind}-${prov}.csv"`,
    },
  });
}
