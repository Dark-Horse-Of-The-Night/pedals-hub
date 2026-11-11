import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { readDb } from '@/lib/store';
import { noticeProgress } from '@/lib/rules';
import { fmtDate } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ClaimList() {
  const db = readDb();
  const now = Date.now();
  const list = db.cycles.filter((c) => c.ownershipStatus === 'NOTICE_ACTIVE').sort((a, b) => (a.noticeDeadline ?? '').localeCompare(b.noticeDeadline ?? ''));
  return (
    <div className="px-4 pt-4">
      <h1 className="font-display text-xl font-extrabold text-navy">Claim my cycle</h1>
      <p className="mt-1 text-[13px] text-muted">These cycles have a notice on them. If one is yours, open it and claim within the proposed {db.settings.noticeDays}-day window. Missed it? Ask at the hostel desk: nothing is sold or scrapped without an officer’s review.</p>
      <form action="/app/lookup" className="mt-3 flex gap-2">
        <input name="id" placeholder={`Type the tag ID, e.g. ${db.settings.idPrefix}0215`} aria-label="Cycle ID" className="field h-11 flex-1" />
        <button className="btn btn-primary h-11">Open</button>
      </form>
      <ul className="mt-4 flex flex-col gap-2.5">
        {list.map((c) => {
          const np = noticeProgress(c, now)!;
          return (
            <li key={c.id}>
              <Link href={`/app/c/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between"><b className="font-display">{c.id}</b><span className={`text-xs font-semibold ${np.daysLeft <= 1 ? 'text-amber-ink' : 'text-muted'}`}>{np.daysLeft <= 1 ? 'ends within a day' : `${np.daysLeft} days left`}</span></div>
                  <div className="truncate text-xs text-muted">{c.description} · {c.zone}, {c.bay}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded bg-line"><div className="h-full bg-accent" style={{ width: `${np.pct}%` }} /></div>
                  <div className="mt-1 text-[11px] text-muted">Window ends {fmtDate(c.noticeDeadline, true)}</div>
                </div>
                <ChevronRight size={18} className="text-muted" aria-hidden />
              </Link>
            </li>
          );
        })}
        {list.length === 0 ? <li className="rounded-2xl bg-white p-4 text-center text-sm text-muted">No cycles under notice right now.</li> : null}
      </ul>
    </div>
  );
}
