import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { parseAuditFile, commitImport } from '@/lib/importer';
import { buildSeed } from '@/lib/seed';

const HEADER = 'Serial No.,Tag No.,Spot / bay,Date,Time,Auditor,Photo Drive link,Lock,Rust,Dust,Blocked in? (Y/N),Hostel sticker,Main fault / parts missing,Grade,Moved? (Y/N),Tag still there? (Y/N),Notes';
const csv = [
  'Project Pedals: Cycle audit',
  HEADER,
  'e.g.,T001,"Block 2 bay, row 1",05/11/2026,07:20,AB,drive...,Locked,Moderate,Heavy,Y,Old,Tyres / tubes,Minor repair,N,Y,Example row',
  '1,T001,"Bay A, row 1, 5th from left",05/11/2026,07:20,AB,link,Locked,Moderate,Heavy,Y,Old,Tyres / tubes,Minor repair,N,Y,',
  '2,T002,"Bay A, row 2",05/11/2026,07:25,AB,link,No lock,Heavy,Heavy,Y,None,Several main parts,Scrap,N,Y,bent fork',
  '3,T002,"Bay B, row 1",05/11/2026,07:30,CD,link,Locked,None,Light,N,Current,None,Ride-ready,Y,Y,dup tag',
  '4,,"Bay B, row 2",05/11/2026,07:35,CD,link,Locked,None,Light,N,Current,None,Ride-ready,N,Y,missing tag',
  '5,T005,"Some Hostel bay",05/11/2026,07:40,CD,link,Locked,None,Light,N,Current,None,Ride-ready,Y,Y,',
  '6,,,,,,,,,,,,,,,,',
].join('\n');

describe('audit import', () => {
  it('parses the team CSV layout, skips example/blank rows, flags issues', async () => {
    const p = await parseAuditFile(Buffer.from(csv), 'audit.csv');
    expect(p.missingColumns).toEqual([]);
    expect(p.rows.map((r) => r.tagNo)).toEqual(['T001', 'T002', 'T002', '', 'T005']);
    expect(p.rows[2].duplicate).toBe(true);
    expect(p.rows[3].issues).toContain('Missing Tag No.');
    expect(p.rows[4].issues.join()).toMatch(/anonymity/);
    const db = buildSeed();
    const n = commitImport(db, { role: 'admin', name: 'Hostel office', studentId: null }, p);
    expect(n).toBe(2);
    expect(db.cycles.map((c) => [c.id, c.grade, c.ownershipStatus, c.provenance])).toEqual([
      ['PP-0001', 'B', 'FLAGGED', 'IMPORTED'],
      ['PP-0002', 'D', 'FLAGGED', 'IMPORTED'],
    ]);
    expect(db.settings.datasetMode).toBe('IMPORTED');
    expect(db.claims.length + db.listings.length).toBe(0); // demo data never mixed in
  });
  const real = 'C:/Users/prate/Desktop/Sahyog/ProjectPedals_Audit.xlsx';
  it.runIf(fs.existsSync(real))('reads the real team template (.xlsx): headers found, no filled rows yet', async () => {
    const p = await parseAuditFile(fs.readFileSync(real), 'ProjectPedals_Audit.xlsx');
    expect(p.missingColumns).toEqual([]);
    expect(p.rows.length).toBe(0);
  });
});
