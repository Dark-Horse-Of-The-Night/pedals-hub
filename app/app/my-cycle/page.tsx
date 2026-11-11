import Link from 'next/link';
import { readDb } from '@/lib/store';
import { studentActor } from '@/lib/session';
import { CLAIM, OWNERSHIP } from '@/lib/labels';
import { Chip, GradeChip, fmtDate } from '@/components/ui';
import { QR } from '@/components/QR';

export const dynamic = 'force-dynamic';

export default async function MyCycle({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const sp = await searchParams;
  const db = readDb();
  const me = await studentActor();
  const mine = db.cycles.filter((c) => c.ownerId === me.studentId);
  const claims = db.claims.filter((c) => c.claimantId === me.studentId);
  return (
    <div className="px-4 pt-4">
      <h1 className="font-display text-xl font-extrabold text-navy">My cycle</h1>
      <p className="mt-1 text-[13px] text-muted">Signed in as {me.studentId} (demo pseudonym). Only you and authorised hostel staff see this page.</p>
      {mine.length === 0 ? (
        <div className="mt-4 rounded-2xl bg-white p-5 text-center text-sm text-muted">No cycle registered yet. <Link href="/app/register" className="font-semibold text-primary">Register one →</Link></div>
      ) : null}
      {mine.map((c) => {
        const conf = db.confirmations.filter((x) => x.cycleId === c.id).sort((a, b) => b.respondedAt.localeCompare(a.respondedAt));
        return (
          <section key={c.id} className={`mt-4 rounded-2xl border bg-white p-4 ${sp.new === c.id ? 'border-2 border-teal' : 'border-line'}`}>
            {sp.new === c.id ? <div className="mb-3 rounded-xl bg-teal-soft px-3 py-2 text-[13px] font-semibold text-teal-ink">Registered! This is your permanent tag. Print it at the hostel desk or stick the issued tag on the handlebar.</div> : null}
            <div className="flex items-center gap-4">
              <div className="rounded-xl border-2 border-dashed border-line-strong p-2.5"><QR id={c.id} size={92} /></div>
              <div className="min-w-0 text-[13px]">
                <div className="font-display text-xl font-extrabold text-navy">{c.id}</div>
                <div className="text-muted">{c.description}</div>
                <div className="mt-1.5 flex flex-wrap gap-1"><Chip tone={OWNERSHIP[c.ownershipStatus].tone}>{OWNERSHIP[c.ownershipStatus].label}</Chip><GradeChip grade={c.grade} selfReported={c.selfReported} /></div>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-[120px_1fr] gap-y-1 text-[13px]">
              <dt className="text-muted">Spot</dt><dd>{c.spot}</dd>
              <dt className="text-muted">Last confirmed</dt><dd>{fmtDate(c.lastVerified)}</dd>
              <dt className="text-muted">Tag issued</dt><dd>{fmtDate(c.tagIssuedAt)} · one tag for life</dd>
            </dl>
            {conf.length ? (
              <div className="mt-3 border-t border-line pt-2.5">
                <div className="lbl mb-1">Semester history</div>
                {conf.map((x) => <div key={x.id} className="text-xs text-body">{x.term}: {x.stillOwned ? 'confirmed' : 'reported not mine'} · {fmtDate(x.respondedAt)}</div>)}
              </div>
            ) : null}
            {c.ownershipStatus !== 'TRANSFERRED' ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href="/app/semester" className="btn btn-soft">Semester check</Link>
                <Link href="/app/exit" className="btn btn-secondary">Sell / donate</Link>
              </div>
            ) : null}
          </section>
        );
      })}
      {claims.length ? (
        <section className="mt-4 rounded-2xl border border-line bg-white p-4">
          <div className="lbl mb-2">My claims</div>
          {claims.map((cl) => (
            <Link key={cl.id} href={`/app/c/${cl.cycleId}`} className="flex items-center justify-between py-1 text-[13px]"><span>{cl.cycleId} · {fmtDate(cl.submittedAt)}</span><Chip tone={CLAIM[cl.status].tone}>{CLAIM[cl.status].label}</Chip></Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
