import { readDb } from '@/lib/store';
import { staffActor } from '@/lib/session';
import { Callout, Card, PageHeader } from '@/components/ui';
import { BackHere, Submit } from '@/components/client';
import { aSettings, resetDemoData } from '@/app/actions';

export const dynamic = 'force-dynamic';

const local = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default async function Settings() {
  const db = readDb();
  const s = db.settings;
  const actor = await staffActor();
  const admin = actor.role === 'admin';
  const L = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <label className="block text-[13px] font-semibold text-body">
      {label}
      {children}
      {hint ? <span className="mt-1 block text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Policy settings" sub="Every rule here is a team proposal until the institute approves it. Changing a value updates every gate and dashboard immediately." />
      {!admin ? <Callout tone="slate">Read-only: only the admin role can change policy.</Callout> : null}
      <form action={aSettings} className="grid gap-4 lg:grid-cols-2">
        <BackHere />
        <Card title="Due process">
          <div className="grid gap-4">
            <L label="Claim window (days)" hint="Proposed: 7 days with a mid-way reminder. Subject to institute policy; day 7 never clears a cycle on its own.">
              <input name="noticeDays" type="number" min={1} max={60} defaultValue={s.noticeDays} className="field mt-1.5" disabled={!admin} />
            </L>
            <L label="Current term"><input name="term" defaultValue={s.term} className="field mt-1.5" disabled={!admin} /></L>
            <div className="grid grid-cols-2 gap-3">
              <L label="Semester check opens"><input name="semesterStart" type="datetime-local" defaultValue={local(s.semesterStart)} className="field mt-1.5" disabled={!admin} /></L>
              <L label="Semester check closes"><input name="semesterEnd" type="datetime-local" defaultValue={local(s.semesterEnd)} className="field mt-1.5" disabled={!admin} /></L>
            </div>
          </div>
        </Card>
        <Card title="Reuse economics">
          <div className="grid gap-4">
            <L label="Repair-viability cut-off (% of V)" hint="Team-proposed 40%. Eligible when R ÷ V × 100 ≤ this value; safety is a separate veto.">
              <input name="thresholdPct" type="number" min={1} max={100} step="0.5" defaultValue={s.thresholdPct} className="field mt-1.5" disabled={!admin} />
            </L>
            <L label="Indicative partner discount (%)" hint="Shown to buyers as “proposed” until a written agreement exists.">
              <input name="discountPct" type="number" min={0} max={80} defaultValue={s.discountPct} className="field mt-1.5" disabled={!admin} />
            </L>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="discountConfirmed" defaultChecked={s.discountConfirmed} disabled={!admin} /> Partner discount confirmed in writing</label>
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <L label="Cycle ID prefix"><input name="idPrefix" defaultValue={s.idPrefix} className="field mt-1.5" disabled={!admin} /></L>
              <L label="Receipt footer"><input name="receiptFooter" defaultValue={s.receiptFooter} className="field mt-1.5" disabled={!admin} /></L>
            </div>
          </div>
        </Card>
        <div className="lg:col-span-2"><Submit className="btn btn-primary btn-lg" disabled={!admin}>Save settings</Submit></div>
      </form>

      <Card title="Dataset" subtitle={`Current mode: ${s.datasetMode === 'DEMO' ? 'synthetic demo fixtures' : 'imported field audit'}. Synthetic and imported records are never mixed.`}>
        <div className="flex flex-wrap items-center gap-3">
          <form action={resetDemoData}>
            <BackHere />
            <Submit className="btn btn-danger" disabled={!admin} confirm="Reset to the 22 synthetic demo records? Every change (and any imported audit data) will be replaced.">Reset demo data</Submit>
          </form>
          <a href="/admin/import" className="btn btn-secondary">Import field audit instead</a>
          <span className="text-xs text-muted">Reset regenerates dates relative to now, so the demo scenarios are repeatable for recording.</span>
        </div>
      </Card>
      <Card title="Not built on purpose">
        <p className="text-[13px] leading-relaxed text-body">No peer-to-peer ownership transfer, no public “report a bike” feature, no GPS/IoT/AI detection, no payments, no automated messaging, no IITG SSO. Integrations with registration, OneStop or hostel clearance are possible future work only with approval.</p>
      </Card>
    </div>
  );
}
