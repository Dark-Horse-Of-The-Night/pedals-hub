import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { Actor, AuditSignals, Cycle, Db } from './types';
import { DomainError, mapGrade } from './rules';
import { log } from './ops';

// Columns of the team's sheet "ProjectPedals_Audit.xlsx" → "Audit" tab (row 4 headers).
export const AUDIT_COLUMNS = [
  'Serial No.', 'Tag No.', 'Spot / bay', 'Date', 'Time', 'Auditor', 'Photo Drive link', 'Lock', 'Rust', 'Dust',
  'Blocked in? (Y/N)', 'Hostel sticker', 'Main fault / parts missing', 'Grade', 'Moved? (Y/N)', 'Tag still there? (Y/N)', 'Notes',
] as const;

export interface PreviewRow {
  row: number;
  tagNo: string;
  spot: string;
  inspectedAt: string | null;
  auditor: string | null;
  photoLink: string | null;
  lock: string | null;
  rust: string | null;
  dust: string | null;
  blockedIn: boolean | null;
  sticker: string | null;
  mainFault: string | null;
  grade: string | null;
  moved: boolean | null;
  tagIntact: boolean | null;
  notes: string | null;
  issues: string[];
  duplicate: boolean;
}
export interface Preview {
  fileName: string;
  readAt: string;
  headerFound: boolean;
  missingColumns: string[];
  rows: PreviewRow[];
  skipped: number;
}

const FILE = path.join(process.cwd(), 'data', 'import-preview.json');
export const savePreview = (p: Preview) => {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(p));
};
export const readPreview = (): Preview | null => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : null);
export const clearPreview = () => {
  if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
};

type Cell = string | number | boolean | Date | null | undefined;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); rows.push(row); row = []; cur = '';
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const norm = (v: Cell) => (v == null ? '' : v instanceof Date ? v.toISOString() : String(v)).trim();
const yn = (v: Cell): boolean | null => {
  const s = norm(v).toUpperCase();
  return s.startsWith('Y') ? true : s.startsWith('N') ? false : null;
};
const orNull = (v: Cell) => norm(v) || null;

function combineDateTime(d: Cell, t: Cell): string | null {
  let base: Date | null = null;
  if (d instanceof Date) base = new Date(d);
  else if (norm(d)) {
    const s = norm(d);
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/); // dd/mm/yyyy
    if (m) base = new Date(Number(m[3].length === 2 ? '20' + m[3] : m[3]), Number(m[2]) - 1, Number(m[1]));
    else if (!Number.isNaN(Date.parse(s))) base = new Date(s);
  }
  if (!base) return null;
  if (t instanceof Date) base.setHours(t.getUTCHours(), t.getUTCMinutes());
  else if (typeof t === 'number') base.setHours(Math.floor(t * 24), Math.round((t * 24 * 60) % 60));
  else {
    const m = norm(t).match(/^(\d{1,2}):(\d{2})/);
    if (m) base.setHours(Number(m[1]), Number(m[2]));
  }
  return base.toISOString();
}

export async function parseAuditFile(buf: Buffer, fileName: string): Promise<Preview> {
  let grid: Cell[][];
  if (/\.csv$/i.test(fileName)) grid = parseCsv(buf.toString('utf8'));
  else if (/\.xlsx$/i.test(fileName)) {
    const { readSheet } = await import('read-excel-file/node');
    try {
      grid = (await readSheet(buf, 'Audit')) as unknown as Cell[][];
    } catch {
      grid = (await readSheet(buf)) as unknown as Cell[][];
    }
  } else throw new DomainError('Use the .xlsx audit workbook or a .csv export of its Audit tab.');

  const headerIdx = grid.findIndex((r) => r.some((c) => norm(c).toLowerCase() === 'tag no.'));
  if (headerIdx < 0) throw new DomainError('Could not find the "Tag No." header. Is this the team audit sheet?');
  const header = grid[headerIdx].map((c) => norm(c).toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const missingColumns = AUDIT_COLUMNS.filter((c) => col(c) < 0);
  const get = (r: Cell[], name: string) => (col(name) >= 0 ? r[col(name)] : null);

  const rows: PreviewRow[] = [];
  let skipped = 0;
  const seen = new Map<string, number>();
  grid.slice(headerIdx + 1).forEach((r, i) => {
    const rowNo = headerIdx + 2 + i;
    const serial = norm(get(r, 'Serial No.'));
    const dataCells = r.filter((c, ci) => ci !== col('Serial No.') && norm(c) !== '');
    if (serial.toLowerCase() === 'e.g.' || dataCells.length === 0) { skipped++; return; }
    const tagNo = norm(get(r, 'Tag No.'));
    const issues: string[] = [];
    if (!tagNo) issues.push('Missing Tag No.');
    if (!norm(get(r, 'Spot / bay'))) issues.push('Missing spot');
    const gradeLabel = orNull(get(r, 'Grade'));
    if (gradeLabel && !mapGrade(gradeLabel)) issues.push(`Unknown grade "${gradeLabel}"`);
    const spot = norm(get(r, 'Spot / bay'));
    if (/hostel/i.test(spot)) issues.push('Spot mentions a hostel (anonymity): edit before importing');
    const dupKey = tagNo.toUpperCase();
    const duplicate = !!tagNo && seen.has(dupKey);
    if (tagNo && !duplicate) seen.set(dupKey, rowNo);
    rows.push({
      row: rowNo,
      tagNo,
      spot,
      inspectedAt: combineDateTime(get(r, 'Date'), get(r, 'Time')),
      auditor: orNull(get(r, 'Auditor')),
      photoLink: orNull(get(r, 'Photo Drive link')),
      lock: orNull(get(r, 'Lock')),
      rust: orNull(get(r, 'Rust')),
      dust: orNull(get(r, 'Dust')),
      blockedIn: yn(get(r, 'Blocked in? (Y/N)')),
      sticker: orNull(get(r, 'Hostel sticker')),
      mainFault: orNull(get(r, 'Main fault / parts missing')),
      grade: gradeLabel,
      moved: yn(get(r, 'Moved? (Y/N)')),
      tagIntact: yn(get(r, 'Tag still there? (Y/N)')),
      notes: orNull(get(r, 'Notes')),
      issues,
      duplicate,
    });
  });
  return { fileName, readAt: new Date().toISOString(), headerFound: true, missingColumns: [...missingColumns], rows, skipped };
}

export function cycleIdForTag(tag: string, prefix: string) {
  const digits = tag.match(/\d+/)?.[0];
  return digits ? prefix + digits.padStart(4, '0') : prefix + tag.toUpperCase();
}

/** Replaces the whole dataset with the field audit (no mixing with demo fixtures). */
export function commitImport(db: Db, a: Actor, p: Preview): number {
  const good = p.rows.filter((r) => r.issues.length === 0 && !r.duplicate);
  if (good.length === 0) throw new DomainError('No valid rows to import. Fix the flagged rows in the sheet first.');
  const now = new Date().toISOString();
  const cycles: Cycle[] = good.map((r) => {
    const audit: AuditSignals = {
      tagNo: r.tagNo,
      inspectedAt: r.inspectedAt,
      auditor: r.auditor,
      photoLink: r.photoLink,
      lock: r.lock,
      rust: r.rust,
      dust: r.dust,
      blockedIn: r.blockedIn,
      sticker: r.sticker,
      mainFault: r.mainFault,
      auditorGrade: mapGrade(r.grade),
      recheckAt: r.moved != null || r.tagIntact != null ? r.inspectedAt : null,
      moved: r.moved,
      tagIntact: r.tagIntact,
      notes: r.notes,
      sourceRow: r.row,
      sourceFile: p.fileName,
    };
    const bay = r.spot.split(/[,;]/)[0].trim().slice(0, 40) || 'Unrecorded';
    return {
      id: cycleIdForTag(r.tagNo, db.settings.idPrefix),
      description: 'From field audit (description not recorded)',
      zone: 'Field audit',
      bay,
      spot: r.spot,
      ownerId: null,
      ownershipStatus: r.moved ? 'IN_USE' : 'FLAGGED',
      preClaimStatus: null,
      grade: mapGrade(r.grade),
      gradedBy: r.auditor ? 'Auditor ' + r.auditor : 'Field audit',
      gradedAt: r.inspectedAt,
      faults: r.mainFault && r.mainFault !== 'None' ? [r.mainFault] : [],
      repairItems: [],
      safety: 'UNCHECKED',
      safetyNote: null,
      refurbishedValueV: null,
      salePriceS: null,
      listingStatus: 'NONE',
      salvageStatus: 'NONE',
      noticeStart: null,
      noticeDeadline: null,
      reminderAt: null,
      physicalTagPlaced: false,
      lastVerified: null,
      selfReported: false,
      audit,
      tagIssuedAt: r.inspectedAt ?? now,
      createdAt: now,
      updatedAt: now,
      provenance: 'IMPORTED',
    };
  });
  db.cycles = cycles;
  db.claims = [];
  db.clearances = [];
  db.listings = [];
  db.salvage = [];
  db.confirmations = [];
  db.reminders = [];
  db.exits = [];
  db.log = [];
  db.settings.datasetMode = 'IMPORTED';
  log(db, a, 'import', 'IMPORTED', `Imported ${cycles.length} rows from ${p.fileName} (${p.rows.length - good.length} skipped for issues/duplicates). Demo fixtures removed.`, 'import');
  return cycles.length;
}
