import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FAULT_OPTIONS } from '@/lib/labels';
import { BackHere, Submit } from '@/components/client';
import { sRegister } from '@/app/actions';

export default function Register() {
  return (
    <div className="px-4 pt-3">
      <Link href="/app" className="inline-flex items-center gap-1 text-[13px] font-semibold text-primary"><ArrowLeft size={16} aria-hidden /> Home</Link>
      <h1 className="mt-2 font-display text-xl font-extrabold text-navy">Register my cycle</h1>
      <p className="mt-1 text-[13px] text-muted">Get one permanent tag. Each semester you just confirm it, so it is never mistaken for an abandoned cycle.</p>
      <form action={sRegister} className="mt-4 flex flex-col gap-3.5">
        <BackHere />
        <label className="text-[13px] font-semibold text-body">Cycle description
          <input name="description" required minLength={3} placeholder="e.g. Blue MTB, white saddle" className="field mt-1" />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="text-[13px] font-semibold text-body">Parking zone
            <select name="zone" className="field mt-1"><option>North Parking Zone</option><option>South Parking Zone</option></select>
          </label>
          <label className="text-[13px] font-semibold text-body">Bay
            <select name="bay" className="field mt-1"><option>Bay A</option><option>Bay B</option><option>Bay C</option><option>Bay D</option></select>
          </label>
        </div>
        <label className="text-[13px] font-semibold text-body">Usual spot
          <input name="spot" required minLength={2} placeholder="e.g. Bay B, row 2" className="field mt-1" />
          <span className="mt-1 block text-xs font-normal text-muted">Never write a hostel name.</span>
        </label>
        <fieldset>
          <legend className="text-[13px] font-semibold text-body">Condition (your own view)</legend>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {[['ok', 'Rides fine'], ['minor', '1–2 small fixes'], ['major', 'Major fix']].map(([v, l], i) => (
              <label key={v} className="flex min-h-[44px] items-center justify-center rounded-xl border border-line-strong bg-white px-2 text-center text-xs font-semibold has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-pale has-[:checked]:text-primary">
                <input type="radio" name="condition" value={v} defaultChecked={i === 0} className="sr-only" />{l}
              </label>
            ))}
          </div>
        </fieldset>
        <details className="rounded-xl border border-line bg-white px-3 py-2">
          <summary className="cursor-pointer text-[13px] font-semibold text-body">Anything faulty? (optional)</summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FAULT_OPTIONS.map((f) => (
              <label key={f} className="chip cursor-pointer border border-line bg-white text-body has-[:checked]:border-[#BBD6F2] has-[:checked]:bg-pale has-[:checked]:text-primary"><input type="checkbox" name="faults" value={f} className="sr-only" />{f}</label>
            ))}
          </div>
        </details>
        <div className="flex h-[88px] items-center justify-center rounded-xl border border-dashed border-line-strong text-xs text-muted">Photo upload (optional): planned for pilot</div>
        <label className="flex items-start gap-2.5 text-[13px]"><input type="checkbox" name="ack" className="mt-0.5" /> This cycle is mine. I understand a self-report is not a mechanic’s safety check.</label>
        <Submit className="btn btn-primary btn-lg w-full">Save &amp; get my tag</Submit>
      </form>
    </div>
  );
}
