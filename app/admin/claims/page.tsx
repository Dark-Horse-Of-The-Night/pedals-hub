import Link from 'next/link';
import { Info } from 'lucide-react';
import { readDb } from '@/lib/store';
import { staffActor } from '@/lib/session';
import { activeClaims, noticeProgress } from '@/lib/rules';
import { CLAIM, EVIDENCE_OPTIONS } from '@/lib/labels';
import { Callout, Card, Chip, Empty, GradeDot, PageHeader, fmtDate, relTime } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { aReminder, aReviewClaim } from '@/app/actions';
import type { Claim, Cycle, Db } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Claims({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const db = readDb();
  const actor = await staffActor();
  const now = Date.now();
  const by = (...s: Cycle['ownershipStatus'][]) => db.cycles.filter((c) => s.includes(c.ownershipStatus));
  const notices = by('NOTICE_ACTIVE').sort((a, b) => (a.noticeDeadline ?? '').localeCompare(b.noticeDeadline ?? ''));
  const pending = by('CLAIM_PENDING');
  const disputed = by('DISPUTED');
  const awaiting = by('AWAITING_CLEARANCE', 'HELD');

  const selCycleId =
    sp.cycle ??
    (sp.claim ? db.claims.find((c) => c.id === sp.claim)?.cycleId : undefined) ??
    pending[0]?.id ??
    disputed[0]?.id;
  const selCycle = selCycleId ? db.cycles.find((c) => c.id === selCycleId) : undefined;
  const selClaims = selCycle ? db.claims.filter((c) => c.cycleId === selCycle.id).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)) : [];
  const register = db.cycles.filter((c) => c.noticeStart).sort((a, b) => (b.noticeStart ?? '').localeCompare(a.noticeStart ?? ''));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Claims, notices & clearance"
        sub="Every suspected-abandoned cycle gets a physical notice, a proposed claim window and a named officer’s decision. QR identification is never proof of abandonment."
      />
      <Callout tone="blue" icon={<Info size={16} />}>
        Proposed rule: notice + {db.settings.noticeDays}-day claim window + mid-way reminder. <b>When the window closes the cycle moves to “awaiting clearance”, never to sale or scrap.</b> Officials’ policy replaces ours if it differs.
      </Callout>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 min-[1760px]:grid-cols-4">
            <Column title="Notice active" count={notices.length} tone="text-primary">
              {notices.map((c) => {
                const np = noticeProgress(c, now)!;
                const urgent = np.daysLeft <= 1;
                return (
                  <div key={c.id} className={`rounded-[11px] border bg-white p-3 text-[13px] ${urgent ? 'border-[#F6D58E]' : 'border-line'}`}>
                    <div className="flex justify-between"><Link href={`/admin/cycles/${c.id}`} className="font-bold hover:text-primary">{c.id}</Link><span className="text-xs text-muted">{c.bay}</span></div>
                    <div className={`mt-1 text-xs ${urgent ? 'font-semibold text-amber-ink' : 'text-muted'}`}>Day {np.day} of {np.total} · {urgent ? 'ends within a day' : `ends ${fmtDate(c.noticeDeadline).replace(/ \d{4}$/, '')}`}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded bg-line"><div className={`h-full ${urgent ? 'bg-amber' : 'bg-accent'}`} style={{ width: `${np.pct}%` }} /></div>
                    {c.reminderAt ? (
                      <div className="mt-2 text-[11px] text-teal-ink">✓ reminder {fmtDate(c.reminderAt).replace(/ \d{4}$/, '')}</div>
                    ) : (
                      <form action={aReminder} className="mt-1.5"><BackHere /><input type="hidden" name="id" value={c.id} /><Submit className="text-xs font-semibold text-primary hover:underline" disabled={actor.role === 'mechanic'}>Log mid-way reminder</Submit></form>
                    )}
                  </div>
                );
              })}
              {notices.length === 0 ? <p className="text-xs text-muted">None open.</p> : null}
            </Column>
            <Column title="Claim submitted" count={pending.length} tone="text-amber-ink">
              {pending.map((c) => {
                const cl = activeClaims(db.claims, c.id)[0];
                return (
                  <Link key={c.id} href={`/admin/claims?cycle=${c.id}`} className={`block rounded-[11px] border bg-white p-3 text-[13px] ${selCycleId === c.id ? 'border-2 border-primary' : 'border-line hover:border-[#BBD6F2]'}`}>
                    <div className="flex justify-between"><b>{c.id}</b><Chip tone={cl ? CLAIM[cl.status].tone : 'amber'}>{cl ? (cl.status === 'MORE_INFO' ? 'More info' : 'Review') : 'Review'}</Chip></div>
                    {cl ? <div className="mt-1 text-xs text-muted">{cl.claimantId} · {cl.evidence.length} evidence · {relTime(cl.submittedAt)}</div> : null}
                    <div className="mt-1.5 text-xs font-semibold text-red-ink">Disposal paused</div>
                  </Link>
                );
              })}
              {pending.length === 0 ? <p className="text-xs text-muted">No claims waiting.</p> : null}
            </Column>
            <Column title="Disputed" count={disputed.length} tone="text-red-ink">
              {disputed.map((c) => (
                <Link key={c.id} href={`/admin/claims?cycle=${c.id}`} className={`block rounded-[11px] border bg-white p-3 text-[13px] ${selCycleId === c.id ? 'border-2 border-primary' : 'border-line hover:border-[#BBD6F2]'}`}>
                  <div className="flex justify-between"><b>{c.id}</b><Chip tone="red">{activeClaims(db.claims, c.id).length} claimants</Chip></div>
                  <div className="mt-1 text-xs text-muted">Authorised officer rules</div>
                </Link>
              ))}
              {disputed.length === 0 ? <p className="text-xs text-muted">No disputes.</p> : null}
            </Column>
            <Column title="Awaiting clearance" count={awaiting.length} tone="text-red-ink">
              {awaiting.map((c) => (
                <div key={c.id} className="rounded-[11px] border border-line bg-white p-3 text-[13px]">
                  <div className="flex items-center justify-between"><b>{c.id}</b><GradeDot grade={c.grade} /></div>
                  <div className="mt-1 text-xs text-muted">{c.ownershipStatus === 'HELD' ? 'On hold' : `Ended ${fmtDate(c.noticeDeadline).replace(/ \d{4}$/, '')}`} · {db.claims.filter((x) => x.cycleId === c.id).length} claims</div>
                  <Link href={`/admin/cycles/${c.id}`} className="mt-1.5 block text-xs font-semibold text-primary hover:underline">Open sign-off →</Link>
                </div>
              ))}
              {awaiting.length === 0 ? <p className="text-xs text-muted">Nothing awaiting.</p> : null}
            </Column>
          </div>

          <Card title="Notice & reminder register" subtitle="Channels are logged as proposed / manual. The prototype sends no messages." action={<a href="/admin/export?kind=notices" className="text-[13px] font-semibold text-primary">Export CSV</a>}>
            <div className="overflow-x-auto">
              <table className="tbl min-w-[680px]">
                <thead><tr><th>Cycle</th><th>Physical tag</th><th>Start → deadline</th><th>Reminder</th><th>Claims</th><th>Status</th></tr></thead>
                <tbody>
                  {register.map((c) => (
                    <tr key={c.id}>
                      <td><Link href={`/admin/cycles/${c.id}?tab=claims`} className="font-semibold hover:text-primary">{c.id}</Link></td>
                      <td>{c.physicalTagPlaced ? '✓ placed' : '—'}</td>
                      <td>{fmtDate(c.noticeStart).replace(/ \d{4}$/, '')} → {fmtDate(c.noticeDeadline).replace(/ \d{4}$/, '')}</td>
                      <td className={c.reminderAt ? '' : 'text-red-ink'}>{c.reminderAt ? fmtDate(c.reminderAt).replace(/ \d{4}$/, '') : c.ownershipStatus === 'NOTICE_ACTIVE' ? 'missing' : '—'}</td>
                      <td>{db.claims.filter((x) => x.cycleId === c.id).length}</td>
                      <td><StatusChip c={c} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <aside className="card flex flex-col gap-3.5 self-start p-5 xl:sticky xl:top-20">
          {!selCycle || selClaims.length === 0 ? (
            <Empty title="No claim selected">Pick a claim or dispute from the board.</Empty>
          ) : (
            <ClaimPanel db={db} c={selCycle} claims={selClaims} isAdmin={actor.role === 'admin'} />
          )}
        </aside>
      </div>
    </div>
  );
}

function Column({ title, count, tone, children }: { title: string; count: number; tone: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 rounded-[14px] bg-[#EEF3F9] p-3" aria-label={title}>
      <div className="flex items-center justify-between"><b className="text-[13px]">{title}</b><span className={`chip bg-white ${tone}`}>{count}</span></div>
      {children}
    </section>
  );
}

function StatusChip({ c }: { c: Cycle }) {
  const map: Partial<Record<Cycle['ownershipStatus'], [string, 'blue' | 'amber' | 'red' | 'teal' | 'slate' | 'navy']>> = {
    NOTICE_ACTIVE: ['Open', 'blue'], CLAIM_PENDING: ['Claim in review', 'amber'], DISPUTED: ['Disputed', 'red'], AWAITING_CLEARANCE: ['Awaiting clearance', 'red'], HELD: ['On hold', 'slate'],
    CLEARED: ['Cleared', 'navy'], OWNER_VERIFIED: ['Returned to owner', 'teal'], TRANSFERRED: ['Transferred', 'slate'], IN_USE: ['In use', 'teal'],
  };
  const [l, t] = map[c.ownershipStatus] ?? [c.ownershipStatus, 'slate'];
  return <Chip tone={t}>{l}</Chip>;
}

function ClaimPanel({ db, c, claims, isAdmin }: { db: Db; c: Cycle; claims: Claim[]; isAdmin: boolean }) {
  const open = claims.filter((x) => ['SUBMITTED', 'MORE_INFO', 'DISPUTED'].includes(x.status));
  const disputed = c.ownershipStatus === 'DISPUTED';
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <div className="lbl">{disputed ? 'Dispute review' : 'Claim review'}</div>
          <Link href={`/admin/cycles/${c.id}`} className="font-display text-xl font-extrabold text-navy hover:text-primary">{c.id}</Link>
        </div>
        <StatusChip c={c} />
      </div>
      <div className="rounded-[10px] border border-line p-2.5 text-xs">
        <div className="lbl text-[11px]">Audit record</div>
        <div className="mt-1 leading-relaxed">{c.description}<br />Lock: {c.audit?.lock ?? '—'} · {c.spot}</div>
      </div>
      {claims.map((cl) => {
        const active = open.includes(cl);
        return (
          <div key={cl.id} className={`rounded-xl border p-3 ${active ? 'border-[#BBD6F2] bg-[#F3F8FE]' : 'border-line bg-page opacity-80'}`}>
            <div className="flex items-center justify-between text-[13px]"><b>Claimant {cl.claimantId}</b><Chip tone={CLAIM[cl.status].tone}>{CLAIM[cl.status].label}</Chip></div>
            <p className="mt-1 text-xs text-body">“{cl.description}”</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {EVIDENCE_OPTIONS.map((e) => (
                <span key={e} className={`chip ${cl.evidence.includes(e) ? 'bg-teal-soft text-teal-ink' : 'bg-slate-soft text-muted'}`}>{cl.evidence.includes(e) ? '✓' : '–'} {e}</span>
              ))}
            </div>
            <div className="mt-1.5 text-[11px] text-muted">Submitted {fmtDate(cl.submittedAt, true)} · pseudonymous demo ID{cl.reviewNote ? ` · last note: ${cl.reviewNote}` : ''}</div>
            {active ? (
              <form action={aReviewClaim} className="mt-2.5">
                <BackHere />
                <input type="hidden" name="claimId" value={cl.id} />
                <label className="block text-xs font-semibold text-body">
                  Decision note (logged)
                  <textarea name="note" required minLength={5} className="field mt-1" rows={2} placeholder="e.g. Key verified at hostel desk; marks match audit photo." />
                </label>
                {isAdmin ? (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <Submit name="decision" value="APPROVE" className="btn btn-teal col-span-2" confirm={`Approve ${cl.claimantId} as owner of ${c.id}?`}>Approve claim · return to owner</Submit>
                    {!disputed ? <Submit name="decision" value="MORE_INFO" className="btn btn-secondary">Ask for more</Submit> : null}
                    {!disputed ? <Submit name="decision" value="DISPUTE" className="btn btn-danger">Mark disputed</Submit> : null}
                    <Submit name="decision" value="REJECT" className={`btn btn-secondary ${disputed ? 'col-span-2' : 'col-span-2'}`} confirm="Reject this claim?">Not approved</Submit>
                  </div>
                ) : (
                  <p className="mt-2 rounded-lg bg-slate-soft px-3 py-2 text-xs text-body">Only the admin role can decide claims.</p>
                )}
              </form>
            ) : null}
          </div>
        );
      })}
      <p className="text-xs leading-relaxed text-muted">Approval records the owner, removes the cycle from every disposal queue and logs reviewer + time. {disputed ? 'In a dispute, approving one claimant closes the others.' : ''}</p>
      {db.settings.datasetMode === 'DEMO' ? <p className="text-[11px] text-muted">Claimant IDs are synthetic demo pseudonyms.</p> : null}
    </>
  );
}
