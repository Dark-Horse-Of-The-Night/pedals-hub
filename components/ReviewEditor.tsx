'use client';
import { useMemo, useState } from 'react';
import { Plus, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { FAULT_OPTIONS, GRADE } from '@/lib/labels';
import { technicalRoute, partnerQuote } from '@/lib/rules';
import type { Cycle, Grade, RateCardItem, RepairItem, SafetyStatus, Settings } from '@/lib/types';
import { Submit, BackHere } from './client';
import { aSaveReview } from '@/app/actions';
import { Meter } from './ui';

type Props = {
  cycle: Cycle;
  rateCard: RateCardItem[];
  settings: Pick<Settings, 'thresholdPct' | 'discountPct' | 'discountConfirmed'>;
  canEdit: boolean;
  lockedReason?: string;
  clearanceOk: boolean;
};

const inr = (n: number | null | undefined) => (n == null ? '—' : '₹' + n.toLocaleString('en-IN'));

export function ReviewEditor({ cycle, rateCard, settings, canEdit, lockedReason, clearanceOk }: Props) {
  const [grade, setGrade] = useState<Grade | null>(cycle.grade);
  const [faults, setFaults] = useState<string[]>(cycle.faults);
  const [items, setItems] = useState<RepairItem[]>(cycle.repairItems);
  const [safety, setSafety] = useState<SafetyStatus>(cycle.safety);
  const [safetyNote, setSafetyNote] = useState(cycle.safetyNote ?? '');
  const [V, setV] = useState<string>(cycle.refurbishedValueV?.toString() ?? '');
  const [S, setS] = useState<string>(cycle.salePriceS?.toString() ?? '');
  const [pick, setPick] = useState('');

  const draft: Cycle = { ...cycle, grade, faults, repairItems: items, safety, safetyNote, refurbishedValueV: V === '' ? null : Number(V), salePriceS: S === '' ? null : Number(S) };
  const route = useMemo(() => technicalRoute(draft, settings), [grade, items, safety, V, safetyNote]); // eslint-disable-line react-hooks/exhaustive-deps
  const R = items.length ? items.reduce((s, i) => s + (Number(i.marketPrice) || 0), 0) : grade === 'A' ? 0 : null;
  const pq = partnerQuote(draft, settings, rateCard);
  const v = route.viability;
  const dirty = JSON.stringify([grade, faults, items, safety, safetyNote, V, S]) !== JSON.stringify([cycle.grade, cycle.faults, cycle.repairItems, cycle.safety, cycle.safetyNote ?? '', cycle.refurbishedValueV?.toString() ?? '', cycle.salePriceS?.toString() ?? '']);

  const payload = JSON.stringify({
    id: cycle.id,
    grade,
    faults,
    repairItems: items.map(({ id, component, operation, marketPrice }) => ({ id, component, operation, marketPrice: Number(marketPrice) || 0 })),
    safety,
    safetyNote: safetyNote.trim() || null,
    refurbishedValueV: V === '' ? null : Number(V),
    salePriceS: S === '' ? null : Number(S),
  });

  const addItem = (rcId: string) => {
    const rc = rateCard.find((r) => r.id === rcId);
    if (!rc) return;
    setItems((x) => [...x, { id: '', component: rc.component, operation: rc.operation, marketPrice: rc.marketPrice }]);
    if (!faults.includes(rc.component)) setFaults((f) => [...f, rc.component]);
    setPick('');
  };
  const dis = !canEdit;

  return (
    <form action={aSaveReview} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BackHere />
      <input type="hidden" name="payload" value={payload} />
      <section className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-navy">3 · Condition &amp; faults</h2>
          {cycle.selfReported ? <span className="chip bg-amber-soft text-amber-ink">Owner self-report: needs mechanic</span> : cycle.gradedBy ? <span className="text-xs text-muted">by {cycle.gradedBy}</span> : null}
        </div>
        <fieldset className="mt-3.5 grid grid-cols-4 gap-1.5" disabled={dis}>
          <legend className="sr-only">Grade</legend>
          {(['A', 'B', 'C', 'D'] as Grade[]).map((g) => (
            <label key={g} className={`flex cursor-pointer flex-col items-center rounded-[10px] border px-1 py-2 text-center transition ${grade === g ? 'border-2 border-primary bg-pale text-primary' : 'border-line-strong text-body hover:border-[#B7C6D8]'}`}>
              <input type="radio" name="g" value={g} checked={grade === g} onChange={() => setGrade(g)} className="sr-only" />
              <b className="font-display text-lg">{g}</b>
              <span className="text-[11px] font-medium">{GRADE[g].short}</span>
            </label>
          ))}
        </fieldset>
        {grade ? <p className="mt-2 text-xs text-muted">{GRADE[grade].hint}</p> : <p className="mt-2 text-xs text-amber-ink">Not graded yet.</p>}

        <div className="lbl mt-4">Faulty parts (audit checklist)</div>
        <fieldset className="mt-2 flex flex-wrap gap-1.5" disabled={dis}>
          <legend className="sr-only">Faulty parts</legend>
          {FAULT_OPTIONS.map((f) => {
            const on = faults.includes(f);
            return (
              <label key={f} className={`chip cursor-pointer border ${on ? 'border-[#BBD6F2] bg-pale text-primary' : 'border-line bg-white text-body'}`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => setFaults((x) => (on ? x.filter((y) => y !== f) : [...x, f]))} />
                {on ? '✓ ' : ''}
                {f}
              </label>
            );
          })}
        </fieldset>

        <div className="lbl mt-4">Itemised repairs · regular quote (R)</div>
        <ul className="mt-1.5 text-[13px]">
          {items.length === 0 ? <li className="py-2 text-xs text-muted">No repair items. Grade A needs none; B/C need an itemised estimate.</li> : null}
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-2 border-b border-[#EEF2F7] py-1.5">
              <span className="min-w-0 flex-1">
                {it.operation}
                <span className="block text-[11px] text-muted">{it.component}</span>
              </span>
              <label className="flex items-center gap-1 text-xs text-muted">
                ₹
                <input
                  type="number"
                  min={0}
                  disabled={dis}
                  aria-label={`Price for ${it.operation}`}
                  value={it.marketPrice}
                  onChange={(e) => setItems((x) => x.map((y, j) => (j === i ? { ...y, marketPrice: Number(e.target.value) } : y)))}
                  className="h-8 w-20 rounded-md border border-line-strong px-2 text-right text-[13px] text-ink"
                />
              </label>
              {!dis ? (
                <button type="button" onClick={() => setItems((x) => x.filter((_, j) => j !== i))} className="rounded p-1 text-muted hover:text-red-ink" aria-label={`Remove ${it.operation}`}>
                  <Trash2 size={15} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {!dis ? (
          <div className="mt-2 flex gap-2">
            <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Add repair from rate card" className="h-9 min-w-0 flex-1 rounded-[9px] border border-line-strong bg-white px-2 text-[13px]">
              <option value="">Add from rate card…</option>
              {rateCard.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.component} · {r.operation} · ₹{r.marketPrice}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-soft" disabled={!pick} onClick={() => addItem(pick)}>
              <Plus size={15} /> Add
            </button>
          </div>
        ) : null}
        <div className="mt-3 flex justify-between border-t border-line pt-2.5 text-sm">
          <b>R · necessary repairs</b>
          <b className="font-display text-base">{inr(R)}</b>
        </div>

        <fieldset className="mt-4" disabled={dis}>
          <legend className="lbl">Mechanic safety check (separate veto)</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(
              [
                ['UNCHECKED', 'Not checked'],
                ['SAFE', 'Frame & fork safe'],
                ['UNSAFE', 'Unsafe'],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className={`chip cursor-pointer border px-3 py-1.5 ${safety === k ? (k === 'UNSAFE' ? 'border-red bg-red-soft text-red-ink' : k === 'SAFE' ? 'border-teal bg-teal-soft text-teal-ink' : 'border-[#9FB3C8] bg-slate-soft text-body') : 'border-line bg-white text-body'}`}>
                <input type="radio" className="sr-only" checked={safety === k} onChange={() => setSafety(k)} />
                {l}
              </label>
            ))}
          </div>
          {safety !== 'UNCHECKED' ? (
            <input value={safetyNote} onChange={(e) => setSafetyNote(e.target.value)} placeholder={safety === 'UNSAFE' ? 'Why unsafe? e.g. crack at down-tube weld (required)' : 'What was checked (optional)'} className="field mt-2" aria-label="Safety note" />
          ) : null}
        </fieldset>
      </section>

      <section className="card flex flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-navy">4 · Repair-viability gate</h2>
          <span className="chip bg-slate-soft text-body">{settings.thresholdPct}% cut-off · team proposal</span>
        </div>
        <div className="mt-3.5 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-line p-3">
            <div className="lbl">R · repairs</div>
            <div className="mt-1 font-display text-[22px] font-extrabold">{inr(R)}</div>
            <div className="text-[11px] text-muted">regular quote, never partner</div>
          </div>
          <label className="rounded-xl border border-line p-3">
            <span className="lbl">V · after repair</span>
            <span className="mt-1 flex items-center font-display text-[22px] font-extrabold">
              ₹
              <input type="number" min={0} value={V} disabled={dis} onChange={(e) => setV(e.target.value)} placeholder="—" aria-label="Expected value after repair (V)" className="w-full min-w-0 bg-transparent outline-none" />
            </span>
            <span className="text-[11px] text-muted">expected resale, not MRP</span>
          </label>
          <label className="rounded-xl border border-line p-3">
            <span className="lbl">S · sale price</span>
            <span className="mt-1 flex items-center font-display text-[22px] font-extrabold">
              ₹
              <input type="number" min={0} value={S} disabled={dis} onChange={(e) => setS(e.target.value)} placeholder="—" aria-label="As-is sale price (S)" className="w-full min-w-0 bg-transparent outline-none" />
            </span>
            <span className="text-[11px] text-muted">as-is, paid to Pedals</span>
          </label>
        </div>

        {grade === 'B' || grade === 'C' ? (
          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between text-[13px]">
              <span>R ÷ V × 100</span>
              <b className={`font-display text-2xl ${v?.kind === 'ELIGIBLE' ? 'text-teal-ink' : v?.kind === 'NOT_VIABLE' ? 'text-red-ink' : 'text-muted'}`}>{v?.pct != null ? `${v.pct}%` : 'n/a'}</b>
            </div>
            <Meter pct={v?.pct ?? null} threshold={settings.thresholdPct} />
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-page px-3 py-2.5 text-[13px] text-body">{grade === 'A' ? 'Grade A: ride-ready once the safety check passes. R/V does not apply.' : grade === 'D' ? 'Grade D: goes to salvage. R/V does not apply.' : 'Grade the cycle to run the gate.'}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className={`chip ${route.route === 'LIST' ? 'bg-teal-soft text-teal-ink' : route.route === 'SALVAGE' ? 'bg-red-soft text-red-ink' : 'bg-amber-soft text-amber-ink'}`}>
            {route.route === 'LIST' ? '✓ Technical route: list' : route.route === 'SALVAGE' ? '→ Technical route: salvage' : '… Needs review'}
          </span>
          <span className={`chip ${safety === 'SAFE' ? 'bg-teal-soft text-teal-ink' : safety === 'UNSAFE' ? 'bg-red-soft text-red-ink' : 'bg-slate-soft text-body'}`}>
            {safety === 'SAFE' ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />} Safety: {safety === 'SAFE' ? 'passed' : safety === 'UNSAFE' ? 'VETO' : 'pending'}
          </span>
          <span className={`chip ${clearanceOk ? 'bg-teal-soft text-teal-ink' : 'bg-red-soft text-red-ink'}`}>{clearanceOk ? '✓ Clearance: given' : '✕ Clearance: not given'}</span>
        </div>
        <ul className="mt-2 text-xs text-muted">
          {route.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        {pq ? (
          <div className="mt-4 rounded-xl border border-line bg-page p-3 text-[13px]">
            <div className="flex justify-between">
              <span>Regular mechanic quote (R)</span>
              <b>{inr(R)}</b>
            </div>
            <div className="mt-1 flex justify-between">
              <span>
                Partner quote <span className="text-xs text-amber-ink">{pq.confirmed ? '(confirmed)' : `(~${settings.discountPct}% off · indicative)`}</span>
              </span>
              <b>{inr(pq.rp)}</b>
            </div>
            <div className="mt-1 text-[11px] text-muted">Shown to buyers as optional choices. The 40% test always uses the regular quote.</div>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          <span className="text-xs text-muted">{dis ? lockedReason : dirty ? 'Unsaved changes' : 'Saved'}</span>
          {!dis ? (
            <Submit className="btn btn-primary" disabled={!dirty || !grade}>
              Save technical review
            </Submit>
          ) : null}
        </div>
      </section>
    </form>
  );
}
