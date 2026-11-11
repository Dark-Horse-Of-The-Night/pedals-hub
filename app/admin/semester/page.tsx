import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { readDb } from '@/lib/store';
import { staffActor } from '@/lib/session';
import { semesterStats } from '@/lib/metrics';
import { Bar, Callout, Card, Chip, Donut, Empty, PageHeader, fmtDate, relTime } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { aSemesterReminder } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function Semester() {
  const db = readDb();
  const actor = await staffActor();
  const s = semesterStats(db);
  const responses = db.confirmations.filter((x) => x.term === s.term).sort((a, b) => b.respondedAt.localeCompare(a.respondedAt));
  const reminders = db.reminders.filter((r) => r.kind !== 'NOTICE_MIDWAY').sort((a, b) => b.at.localeCompare(a.at));
  const followUps = db.reminders.filter((r) => r.kind === 'FOLLOW_UP');
  const max = Math.max(1, s.invited.length);
  const canLog = actor.role !== 'mechanic';
  const now = Date.now();
  const open = now >= Date.parse(s.start) && now <= Date.parse(s.end);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Semester self-check"
        sub="After every break, registered owners re-confirm their cycle with the same permanent QR. A non-response triggers a follow-up, never confiscation."
        actions={<Link href="/admin/tags?standee=1" className="btn btn-secondary"><QrCode size={15} aria-hidden /> Print QR standee</Link>}
      />
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <Card title={`Window · ${s.term}`} action={<Chip tone={open ? 'blue' : 'slate'}>{open ? 'Open' : 'Closed'}</Chip>}>
          <div className="text-[13px] text-muted">{fmtDate(s.start)} → {fmtDate(s.end)}</div>
          <div className="mt-4 flex items-center gap-5">
            <Donut pct={s.pct} size={112} label={`${s.pct}% confirmed`} />
            <div className="text-sm leading-7">
              <div><b>{s.confirmed.length}</b> of {s.invited.length} owners confirmed</div>
              <div><b>{s.pending.length}</b> pending → follow-up queue</div>
              <div><b>{s.wantsExit}</b> asked about sell / donate</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted">Target: under a minute per owner (to be timed in the pilot). Reached via notice board, QR standee and, if approved, the registration window.</p>
        </Card>
        <Card title="Adoption funnel" subtitle="Counts from records in this registry">
          <div className="flex flex-col gap-3 text-[13px]">
            {[
              ['Owners with a registered cycle (invited)', s.invited.length, 'navy'],
              ['Reminder rounds logged', reminders.filter((r) => r.kind === 'SEMESTER').length, 'blue'],
              ['Confirmed this term', s.confirmed.length, 'teal'],
              ['Pending → manual follow-up', s.pending.length, 'amber'],
              ['Follow-ups logged', followUps.length, 'slate'],
            ].map(([l, v, t]) => (
              <div key={l as string}>
                <div className="mb-1 flex justify-between"><span>{l}</span><b>{v}</b></div>
                <Bar value={v as number} max={max} tone={t as 'navy'} />
              </div>
            ))}
          </div>
          <form action={aSemesterReminder} className="mt-4 flex gap-2">
            <BackHere />
            <input name="note" defaultValue="Reminder round: hostel notice board + QR standee" className="field h-10 flex-1 text-[13px]" aria-label="Reminder note" />
            <Submit className="btn btn-soft" disabled={!canLog}>Log reminder round (demo)</Submit>
          </form>
        </Card>
      </div>
      <Callout tone="blue">Nothing is sent: reminders are logged only. Real SMS, email or WhatsApp sends need an approved channel and are out of scope for the prototype.</Callout>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={`Follow-up queue (${s.pending.length})`} subtitle="Owners who have not confirmed yet. Not abandonment.">
          {s.pending.length ? (
            <ul>
              {s.pending.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2 border-b border-[#EEF2F7] py-2.5 last:border-0">
                  <div className="min-w-0 flex-1 text-[13px]"><Link href={`/admin/cycles/${c.id}`} className="font-semibold hover:text-primary">{c.id}</Link> · {c.ownerId} · {c.spot}<div className="text-xs text-muted">last verified {c.lastVerified ? relTime(c.lastVerified) : 'never'}</div></div>
                  <form action={aSemesterReminder}><BackHere /><input type="hidden" name="cycleId" value={c.id} /><input type="hidden" name="note" value={`Personal follow-up for ${c.id} (desk / hostel rep)`} /><Submit className="btn btn-secondary" disabled={!canLog}>Log follow-up</Submit></form>
                </li>
              ))}
            </ul>
          ) : <Empty title="Everyone has confirmed." />}
        </Card>
        <Card title={`Responses (${responses.length})`}>
          {responses.length ? (
            <ul>
              {responses.map((r) => (
                <li key={r.id} className="flex items-center justify-between border-b border-[#EEF2F7] py-2 text-[13px] last:border-0">
                  <span><b>{r.cycleId}</b> · {r.ownerId}{r.locationChanged ? ` · moved to ${r.newSpot}` : ''}{r.faults.length ? ` · ${r.faults.join(', ')}` : ''}</span>
                  <span className="flex items-center gap-1.5">{r.stillOwned ? <Chip tone="teal">Still mine</Chip> : <Chip tone="amber">Not mine</Chip>}{r.wantsExit ? <Chip tone="blue">Exit?</Chip> : null}<span className="text-xs text-muted">{relTime(r.respondedAt)}</span></span>
                </li>
              ))}
            </ul>
          ) : <Empty title="No responses yet." />}
        </Card>
      </div>
      <Card title="Reminder log">
        {reminders.length ? (
          <ul className="text-[13px]">{reminders.map((r) => <li key={r.id} className="border-b border-[#EEF2F7] py-1.5 last:border-0">{fmtDate(r.at, true)} · <b>{r.by}</b> · {r.cycleId ? r.cycleId + ' · ' : ''}{r.note}</li>)}</ul>
        ) : <Empty title="No reminders logged." />}
      </Card>
    </div>
  );
}
