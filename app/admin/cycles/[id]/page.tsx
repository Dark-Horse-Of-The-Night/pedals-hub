import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, Camera, Check, Lock } from 'lucide-react';
import { readDb } from '@/lib/store';
import { actionQueue } from '@/lib/metrics';
import { staffActor } from '@/lib/session';
import { abandonmentSignals, activeClaims, dispositionBlockers, listingBlockers, noticeProgress, salvageBlockers, technicalRoute } from '@/lib/rules';
import { CLAIM, OWNERSHIP } from '@/lib/labels';
import { Callout, Chip, GradeChip, ListingChip, OwnershipChip, SalvageChip, fmtDate, relTime, Money } from '@/components/ui';
import { BackHere, Submit, TabLink } from '@/components/client';
import { QR } from '@/components/QR';
import { ReviewEditor } from '@/components/ReviewEditor';
import { aClearance, aDraftListing, aRecheck, aReminder, aSalvageReview, aStartNotice } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function CyclePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  const { tab = 'review' } = await searchParams;
  const db = readDb();
  const c = db.cycles.find((x) => x.id === decodeURIComponent(id).toUpperCase());
  if (!c) notFound();
  const actor = await staffActor();
  const now = Date.now();
  const np = noticeProgress(c, now);
  const claims = db.claims.filter((x) => x.cycleId === c.id);
  const open = activeClaims(db.claims, c.id);
  const clearances = db.clearances.filter((x) => x.cycleId === c.id);
  const next = actionQueue(db, now).find((x) => x.cycleId === c.id);
  const sig = abandonmentSignals(c.audit);
  const route = technicalRoute(c, db.settings);
  const dispBlock = dispositionBlockers(c, db.claims);
  const listBlock = listingBlockers(c, db.claims, db.settings);
  const salvBlock = salvageBlockers(c, db.claims, db.settings);
  const timeline = db.log.filter((e) => e.entityId === c.id).sort((a, b) => b.at.localeCompare(a.at));
  const isAdmin = actor.role === 'admin';
  const staffCanField = actor.role === 'admin' || actor.role === 'auditor';
  const editLock =
    c.ownershipStatus === 'TRANSFERRED'
      ? 'Transferred: record is read-only'
      : ['LIVE', 'RESERVED', 'SOLD'].includes(c.listingStatus)
        ? 'Listed: withdraw the listing to edit the review'
        : !['NONE', 'REVIEW'].includes(c.salvageStatus)
          ? 'Being dismantled: review is frozen'
          : undefined;

  const steps = [
    { done: !!c.audit?.inspectedAt || c.provenance === 'USER_ENTERED', label: c.audit ? `Audited · tag ${c.audit.tagNo} · ${fmtDate(c.audit.inspectedAt)}` : `Registered by owner · ${fmtDate(c.createdAt)}` },
    { done: !!c.audit?.recheckAt, label: c.audit?.recheckAt ? `Re-check · ${c.audit.moved ? 'moved' : 'not moved'} · tag ${c.audit.tagIntact ? 'intact' : 'missing'}` : 'Re-check 2+ days later' },
    { done: !!c.noticeStart, label: c.noticeStart ? `Notice on cycle + hostel board · ${fmtDate(c.noticeStart)}` : 'Physical notice + approved channels' },
    { done: !!c.reminderAt, label: c.reminderAt ? `Mid-way reminder · ${fmtDate(c.reminderAt)}` : 'Mid-way reminder' },
    { done: !!np?.ended, label: np ? (np.ended ? `Proposed ${np.total}-day window closed · ${fmtDate(c.noticeDeadline)} · ${claims.length} claim(s)` : `Window open · day ${np.day} of ${np.total} · ends ${fmtDate(c.noticeDeadline)}`) : `Proposed ${db.settings.noticeDays}-day claim window` },
    { done: c.ownershipStatus === 'CLEARED' || c.ownershipStatus === 'TRANSFERRED', label: 'Written clearance by authorised officer', key: true },
  ];

  const tabs = [
    ['review', 'Review & clearance'],
    ['evidence', 'Audit evidence'],
    ['claims', `Notices & claims (${claims.length})`],
    ['timeline', `Timeline (${timeline.length})`],
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/admin" className="hover:text-primary">Overview</Link> / <Link href="/admin/inventory" className="hover:text-primary">Inventory</Link> / <b className="text-navy">{c.id}</b>
      </nav>

      <div className="flex flex-wrap items-center gap-5">
        <div className="rounded-[14px] border border-line bg-white p-3">
          <QR id={c.id} size={84} label={false} />
        </div>
        <div className="min-w-[300px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[28px] font-extrabold text-navy">{c.id}</h1>
            <OwnershipChip c={c} />
            <GradeChip grade={c.grade} selfReported={c.selfReported} />
            {c.listingStatus !== 'NONE' ? <ListingChip c={c} /> : <Chip tone="slate"><Lock size={12} aria-hidden /> {dispBlock.length ? 'Disposal locked' : 'Not listed'}</Chip>}
            <SalvageChip c={c} />
            {c.provenance !== 'DEMO' ? <Chip tone="teal">{c.provenance === 'IMPORTED' ? 'Field audit' : 'Owner-entered'}</Chip> : null}
          </div>
          <p className="mt-1.5 text-sm text-muted">
            {c.description} · {c.zone}, {c.spot} · permanent tag issued {fmtDate(c.tagIssuedAt)}
            {c.ownerId && ['REGISTERED', 'OWNER_VERIFIED', 'IN_USE', 'TRANSFERRED'].includes(c.ownershipStatus) ? ` · owner ${c.ownerId} (private)` : ''}
          </p>
        </div>
        <div className="card max-w-[360px] flex-[0_1_340px] border-[#BBD6F2] bg-[#F3F8FE] px-4 py-3">
          <div className="lbl text-primary">Next required action</div>
          {next ? (
            <>
              <div className="mt-1 font-bold text-navy">{next.title.replace(c.id + ' · ', '')}</div>
              <div className="mt-0.5 text-xs text-muted">{next.detail}</div>
            </>
          ) : (
            <div className="mt-1 text-sm text-body">{['REGISTERED', 'OWNER_VERIFIED', 'IN_USE'].includes(c.ownershipStatus) ? 'None: owner-controlled cycle. Semester self-check keeps it current.' : 'Nothing pending.'}</div>
          )}
        </div>
      </div>

      <nav className="flex gap-6 border-b border-line" aria-label="Record sections">
        {tabs.map(([k, l]) => (
          <TabLink key={k} href={`/admin/cycles/${c.id}?tab=${k}`} active={tab === k}>
            {l}
          </TabLink>
        ))}
      </nav>

      {tab === 'review' ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-navy">1 · Identity &amp; evidence</h2>
                {c.audit ? <Chip tone={sig.count >= 3 ? 'amber' : 'slate'}>{sig.count}/{sig.of} abandonment signals</Chip> : <Chip tone="teal">Registered by owner</Chip>}
              </div>
              <div className="mt-3.5 grid gap-4 sm:grid-cols-[160px_1fr]">
                <div className="flex h-[132px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#C9D6E4] bg-[repeating-linear-gradient(135deg,#EEF2F7_0_10px,#F5F8FC_10px_20px)] text-center text-xs text-muted">
                  <Camera size={20} aria-hidden />
                  {c.audit?.photoLink ? 'Timestamped photo' : 'No photo'}
                  <span className="text-[11px]">{c.provenance === 'DEMO' ? '(demo placeholder)' : c.audit?.photoLink ? 'link in audit tab' : ''}</span>
                </div>
                <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                  {c.audit ? (
                    <>
                      <dt className="text-muted">Audited</dt><dd>{fmtDate(c.audit.inspectedAt, true)} · {c.audit.auditor}</dd>
                      <dt className="text-muted">Lock</dt><dd>{c.audit.lock ?? '—'}</dd>
                      <dt className="text-muted">Rust / dust</dt><dd>{c.audit.rust ?? '—'} / {c.audit.dust ?? '—'}</dd>
                      <dt className="text-muted">Blocked in</dt><dd>{c.audit.blockedIn == null ? '—' : c.audit.blockedIn ? 'Yes' : 'No'}</dd>
                      <dt className="text-muted">Hostel sticker</dt><dd>{c.audit.sticker ?? '—'}</dd>
                      <dt className="text-muted">Main fault</dt><dd>{c.audit.mainFault ?? '—'}</dd>
                    </>
                  ) : (
                    <>
                      <dt className="text-muted">Registered</dt><dd>{fmtDate(c.createdAt, true)}</dd>
                      <dt className="text-muted">Last verified</dt><dd>{fmtDate(c.lastVerified)}</dd>
                      <dt className="text-muted">Condition</dt><dd>Owner self-report</dd>
                    </>
                  )}
                </dl>
              </div>

              {c.ownershipStatus === 'FLAGGED' && !c.audit?.recheckAt ? (
                <form action={aRecheck} className="mt-4 rounded-xl border border-line bg-page p-3.5">
                  <BackHere />
                  <input type="hidden" name="id" value={c.id} />
                  <div className="text-sm font-semibold">Record the 2+ day re-check</div>
                  <div className="mt-2 flex flex-wrap gap-4 text-[13px]">
                    <fieldset className="flex gap-3"><legend className="sr-only">Moved?</legend>Moved?
                      <label><input type="radio" name="moved" value="no" defaultChecked /> No</label>
                      <label><input type="radio" name="moved" value="yes" /> Yes</label>
                    </fieldset>
                    <fieldset className="flex gap-3"><legend className="sr-only">Tag still there?</legend>Tag still there?
                      <label><input type="radio" name="tagIntact" value="yes" defaultChecked /> Yes</label>
                      <label><input type="radio" name="tagIntact" value="no" /> No</label>
                    </fieldset>
                  </div>
                  <Submit className="btn btn-primary mt-3" disabled={!staffCanField}>Save re-check</Submit>
                </form>
              ) : null}
              {c.ownershipStatus === 'FLAGGED' && c.audit?.recheckAt && !c.audit.moved ? (
                <form action={aStartNotice} className="mt-4 rounded-xl border border-[#BBD6F2] bg-[#F3F8FE] p-3.5">
                  <BackHere />
                  <input type="hidden" name="id" value={c.id} />
                  <div className="text-sm font-semibold text-navy">Open the proposed {db.settings.noticeDays}-day claim window</div>
                  <label className="mt-2 flex items-center gap-2 text-[13px]"><input type="checkbox" name="physicalTagPlaced" /> Physical notice is on the cycle (photo taken)</label>
                  <div className="mt-2 flex flex-wrap gap-3 text-[13px]">
                    <label><input type="checkbox" name="channels" value="Hostel notice board" defaultChecked /> Hostel notice board</label>
                    <label><input type="checkbox" name="channels" value="Approved hostel group" /> Approved hostel group</label>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">Channels are logged, not sent: the prototype has no messaging integration.</p>
                  <Submit className="btn btn-primary mt-3" disabled={!staffCanField}>Place notice</Submit>
                </form>
              ) : null}
            </section>

            <section className="card p-5">
              <h2 className="text-base font-bold text-navy">2 · Ownership &amp; clearance</h2>
              <ol className="mt-3.5 flex flex-col gap-2.5 text-[13px]">
                {steps.map((s, i) => (
                  <li key={i} className="flex items-center gap-2.5">
                    {s.done ? (
                      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-teal text-white"><Check size={13} strokeWidth={3} aria-label="done" /></span>
                    ) : (
                      <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${s.key ? 'border-red text-red-ink' : 'border-line-strong text-muted'}`}>{i + 1}</span>
                    )}
                    <span className={s.key && !s.done ? 'font-bold' : ''}>{s.label}</span>
                  </li>
                ))}
              </ol>
              {clearances.length ? (
                <div className="mt-3 rounded-xl bg-page px-3 py-2 text-xs text-body">
                  {clearances.map((cl) => (
                    <div key={cl.id}>
                      <b>{cl.decision === 'APPROVED' ? 'Cleared' : cl.decision === 'HELD' ? 'Held' : 'Denied'}</b> by {cl.authority} · {fmtDate(cl.at, true)}: {cl.reason}
                    </div>
                  ))}
                </div>
              ) : null}

              {open.length ? (
                <Callout tone="amber" className="mt-3.5" icon={<AlertTriangle size={16} />}>
                  <b>{open.length} open claim{open.length > 1 ? 's' : ''}.</b> Disposal is paused until resolved.{' '}
                  <Link href={`/admin/claims?cycle=${c.id}`} className="font-semibold underline">Review claims →</Link>
                </Callout>
              ) : null}

              {['AWAITING_CLEARANCE', 'HELD'].includes(c.ownershipStatus) && !open.length ? (
                <form action={aClearance} className="mt-3.5">
                  <BackHere />
                  <input type="hidden" name="id" value={c.id} />
                  <Callout tone="red"><b>Expiry alone never authorises resale or recycling.</b> Only a recorded admin decision moves this cycle on.</Callout>
                  <label className="mt-3 block text-xs font-semibold text-body">
                    Reason for decision
                    <input name="reason" required minLength={5} className="field mt-1.5" defaultValue={c.reminderAt ? 'No claim after notice + reminder; audit shows long idle' : ''} placeholder="e.g. No claim after notice and reminder" />
                  </label>
                  {isAdmin ? (
                    <div className="mt-3 flex gap-2">
                      <Submit name="decision" value="APPROVED" className="btn btn-primary flex-1" confirm={`Record written clearance for ${c.id}? This unlocks listing or salvage.`}>Approve clearance</Submit>
                      <Submit name="decision" value="HELD" className="btn btn-secondary">Hold</Submit>
                      <Submit name="decision" value="DENIED" className="btn btn-danger" confirm="Deny clearance? The cycle will be treated as owned / in use.">Deny</Submit>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-slate-soft px-3 py-2 text-xs text-body"><Lock size={12} className="mr-1 inline" aria-hidden />Only the admin role (authorised hostel officer) can issue clearance. You are {actor.role}.</p>
                  )}
                </form>
              ) : null}
              {c.ownershipStatus === 'NOTICE_ACTIVE' && np ? (
                <div className="mt-3.5">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-soft"><div className="h-full bg-accent" style={{ width: `${np.pct}%` }} /></div>
                  <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
                    <span>Day {np.day} of {np.total} · {np.daysLeft} day(s) left</span>
                    {!c.reminderAt ? (
                      <form action={aReminder}><BackHere /><input type="hidden" name="id" value={c.id} /><Submit className="btn btn-soft" disabled={!staffCanField}>Log mid-way reminder</Submit></form>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {['REGISTERED', 'OWNER_VERIFIED', 'IN_USE'].includes(c.ownershipStatus) ? (
                <Callout tone="teal" className="mt-3.5"><b>{OWNERSHIP[c.ownershipStatus].label}.</b> This cycle is outside every disposal path. A missed semester check triggers follow-up, never seizure.</Callout>
              ) : null}
            </section>
          </div>

          <ReviewEditor
            key={c.updatedAt}
            cycle={c}
            rateCard={db.rateCard}
            settings={db.settings}
            canEdit={!editLock}
            lockedReason={editLock}
            clearanceOk={dispBlock.length === 0}
          />

          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-navy">5 · Route this cycle</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Technical route: <b className="text-body">{route.route === 'LIST' ? 'list for reuse' : route.route === 'SALVAGE' ? 'salvage parts, recycle rest' : 'needs review'}</b>. Both routes unlock only after written clearance.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={aDraftListing}><BackHere /><input type="hidden" name="id" value={c.id} />
                  <Submit className="btn btn-primary" disabled={listBlock.length > 0 || !staffCanField} title={listBlock.join('; ')}>{listBlock.length ? <Lock size={14} aria-hidden /> : null} Move to draft listing</Submit>
                </form>
                <form action={aSalvageReview}><BackHere /><input type="hidden" name="id" value={c.id} />
                  <Submit className="btn btn-secondary" disabled={salvBlock.length > 0 || !staffCanField} title={salvBlock.join('; ')}>{salvBlock.length ? <Lock size={14} aria-hidden /> : null} Mark for salvage review</Submit>
                </form>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-page p-3 text-xs">
                <div className="mb-1 font-semibold text-body">Listing {listBlock.length ? 'blocked because' : 'allowed'}</div>
                {listBlock.length ? <ul className="list-disc pl-4 text-muted">{listBlock.map((b) => <li key={b}>{b}</li>)}</ul> : <span className="text-teal-ink">All gates pass: cleared, safe, R/V within cut-off, S set.</span>}
              </div>
              <div className="rounded-xl bg-page p-3 text-xs">
                <div className="mb-1 font-semibold text-body">Salvage {salvBlock.length ? 'blocked because' : 'allowed'}</div>
                {salvBlock.length ? <ul className="list-disc pl-4 text-muted">{salvBlock.map((b) => <li key={b}>{b}</li>)}</ul> : <span className="text-teal-ink">Cleared and technically non-viable / unsafe.</span>}
              </div>
            </div>
            {c.listingStatus !== 'NONE' || c.salvageStatus !== 'NONE' ? (
              <p className="mt-3 text-[13px]">
                Current: <ListingChip c={c} /> <SalvageChip c={c} />{' '}
                <Link className="font-semibold text-primary" href={c.salvageStatus !== 'NONE' ? '/admin/salvage' : '/admin/marketplace'}>Manage →</Link>
              </p>
            ) : null}
          </section>
        </>
      ) : null}

      {tab === 'evidence' ? (
        <section className="card p-5">
          <h2 className="text-base font-bold text-navy">Field audit record</h2>
          {c.audit ? (
            <div className="mt-3 overflow-x-auto">
              <table className="tbl">
                <tbody>
                  {[
                    ['Tag No.', c.audit.tagNo], ['Spot / bay', c.spot], ['Date & time', fmtDate(c.audit.inspectedAt, true)], ['Auditor', c.audit.auditor], ['Photo Drive link', c.audit.photoLink],
                    ['Lock', c.audit.lock], ['Rust', c.audit.rust], ['Dust', c.audit.dust], ['Blocked in?', c.audit.blockedIn == null ? '—' : c.audit.blockedIn ? 'Y' : 'N'], ['Hostel sticker', c.audit.sticker],
                    ['Main fault / parts missing', c.audit.mainFault], ['Auditor grade', c.audit.auditorGrade ?? 'not recorded'], ['Re-check', c.audit.recheckAt ? fmtDate(c.audit.recheckAt, true) : 'not yet'], ['Moved?', c.audit.moved == null ? '—' : c.audit.moved ? 'Y' : 'N'], ['Tag still there?', c.audit.tagIntact == null ? '—' : c.audit.tagIntact ? 'Y' : 'N'],
                    ['Notes', c.audit.notes], ['Source', c.audit.sourceFile ? `${c.audit.sourceFile}, row ${c.audit.sourceRow}` : c.provenance === 'DEMO' ? 'Demo fixture (synthetic)' : '—'],
                  ].map(([k, v]) => (
                    <tr key={k as string}><th className="w-56 font-semibold">{k}</th><td>{v ?? '—'}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted">Signals present: {sig.list.join(', ') || 'none'}. Field rules: never move, ride or unlock a cycle; no owner names or roll numbers.</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Owner-registered cycle: no field audit record.</p>
          )}
        </section>
      ) : null}

      {tab === 'claims' ? (
        <section className="card p-5">
          <h2 className="text-base font-bold text-navy">Notices &amp; claims</h2>
          <p className="mt-1 text-[13px] text-muted">Notice: {c.noticeStart ? `${fmtDate(c.noticeStart, true)} → ${fmtDate(c.noticeDeadline, true)}` : 'none'} · physical tag {c.physicalTagPlaced ? 'placed' : 'not placed'} · reminder {c.reminderAt ? fmtDate(c.reminderAt, true) : 'not logged'}</p>
          {claims.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No claims on this cycle.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {claims.map((cl) => (
                <li key={cl.id} className="rounded-xl border border-line p-3 text-[13px]">
                  <div className="flex items-center justify-between"><b>{cl.claimantId}</b><Chip tone={CLAIM[cl.status].tone}>{CLAIM[cl.status].label}</Chip></div>
                  <div className="mt-1 text-body">“{cl.description}”</div>
                  <div className="mt-1 text-xs text-muted">Evidence: {cl.evidence.join(', ')} · submitted {fmtDate(cl.submittedAt, true)}{cl.reviewNote ? ` · note: ${cl.reviewNote}` : ''}</div>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/admin/claims?cycle=${c.id}`} className="btn btn-secondary mt-3">Open in claims desk</Link>
        </section>
      ) : null}

      {tab === 'timeline' ? (
        <section className="card p-5">
          <h2 className="text-base font-bold text-navy">State history</h2>
          <ol className="relative mt-4 border-l border-line pl-5">
            {timeline.map((e) => (
              <li key={e.id} className="mb-4 last:mb-0">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-accent" aria-hidden />
                <div className="text-[13px]"><b>{e.actor}</b> <span className="text-xs text-muted">({e.role})</span> · <span className="font-semibold text-navy">{e.action.replaceAll('_', ' ').toLowerCase()}</span></div>
                <div className="text-[13px] text-body">{e.summary}</div>
                <div className="text-xs text-muted">{fmtDate(e.at, true)} · {relTime(e.at)}</div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="text-xs text-muted">
        Values: R <Money v={c.repairItems.length ? c.repairItems.reduce((s, i) => s + i.marketPrice, 0) : null} /> · V <Money v={c.refurbishedValueV} /> · S <Money v={c.salePriceS} />. Illustrative prices until replaced with written shop quotes.
      </p>
    </div>
  );
}
