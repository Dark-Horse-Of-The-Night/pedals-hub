import { NextResponse } from 'next/server';
import { readDb } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = (url.searchParams.get('id') ?? '').trim().toUpperCase();
  const db = readDb();
  const prefix = db.settings.idPrefix.toUpperCase();
  const candidates = [raw, prefix + raw, prefix + raw.padStart(4, '0'), raw.replace(/^PP-?/, prefix)];
  const hit = db.cycles.find((c) => candidates.includes(c.id.toUpperCase()));
  if (!raw) return NextResponse.redirect(new URL('/app?err=' + encodeURIComponent('Type the ID printed under the QR.'), url));
  if (!hit) return NextResponse.redirect(new URL('/app?err=' + encodeURIComponent(`No cycle with ID ${raw}. Check the tag or ask at the hostel desk.`), url));
  return NextResponse.redirect(new URL(`/app/c/${hit.id}`, url));
}
