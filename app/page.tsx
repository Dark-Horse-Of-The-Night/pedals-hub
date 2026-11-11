import Link from 'next/link';
import { ArrowRight, LayoutDashboard, Smartphone } from 'lucide-react';
import { readDb } from '@/lib/store';
import { Logo, DemoPill } from '@/components/Logo';

export const dynamic = 'force-dynamic';

const SCENARIOS = [
  ['A', 'Owner claims a flagged cycle', 'Student S-14 → PP-0342 claim · admin approves → out of the disposal path', '/admin/claims?cycle=PP-0342'],
  ['B', 'Cleared & repairable', 'PP-0118: window over, no claim → admin clearance → R/V 32% → list at ₹700 → S-40 reserves', '/admin/cycles/PP-0118'],
  ['C', 'Above threshold → salvage', 'PP-0207: R ₹1,500 / V ₹3,000 = 50% → salvage review → parts ledger', '/admin/cycles/PP-0207'],
  ['D', 'Semester self-check', 'Student S-21 confirms PP-0602 → adoption % rises', '/app/semester'],
  ['E', 'Graduation exit', 'Student S-33 offers PP-0612 → admin exit queue → handover receipt', '/app/exit'],
] as const;

export default function Landing() {
  const db = readDb();
  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-8 px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Logo sub="Project Pedals · Sahyog 2026-27" />
          <DemoPill mode={db.settings.datasetMode === 'DEMO' ? 'DEMO' : 'IMPORTED'} />
        </div>
        <div>
          <div className="flex gap-2 text-xs font-bold tracking-[0.08em]"><span className="text-primary">RECOVER</span><span className="text-[#B7C6D8]">•</span><span className="text-teal-ink">REUSE</span><span className="text-[#B7C6D8]">•</span><span className="text-amber-ink">PREVENT</span></div>
          <h1 className="mt-2 max-w-3xl text-4xl font-extrabold leading-tight text-navy">Giving forgotten cycles a second life.</h1>
          <p className="mt-3 max-w-2xl text-base text-muted">A QR-linked registry, fair owner claims with written admin clearance, a 40% repair-viability gate, transparent resale and a semester + graduation loop that stops the next backlog.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/admin" className="card group flex items-start gap-4 p-6 transition hover:border-[#BBD6F2]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white"><LayoutDashboard size={24} aria-hidden /></div>
            <div className="flex-1"><div className="text-lg font-bold text-navy">Operations Centre</div><p className="mt-1 text-sm text-muted">Hostel office, volunteers and mechanic: claims, clearance, grading, listings, salvage, adoption.</p></div>
            <ArrowRight className="mt-1 text-muted group-hover:text-primary" aria-hidden />
          </Link>
          <Link href="/app" className="card group flex items-start gap-4 p-6 transition hover:border-[#BBD6F2]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-white"><Smartphone size={24} aria-hidden /></div>
            <div className="flex-1"><div className="text-lg font-bold text-navy">Student web app</div><p className="mt-1 text-sm text-muted">Opens from the tag: scan, register, claim, buy, semester check, sell/donate. No download.</p></div>
            <ArrowRight className="mt-1 text-muted group-hover:text-primary" aria-hidden />
          </Link>
        </div>
        <section className="card p-6">
          <h2 className="text-lg font-bold text-navy">Demo scenarios</h2>
          <p className="mt-1 text-sm text-muted">Pre-seeded and repeatable: reset demo data in Policy settings before each recording.</p>
          <ul className="mt-4 grid gap-2.5">
            {SCENARIOS.map(([k, t, d, href]) => (
              <li key={k}>
                <Link href={href} className="flex items-center gap-4 rounded-xl border border-line px-4 py-3 transition hover:border-[#BBD6F2] hover:bg-[#F8FBFE]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pale font-display font-extrabold text-primary">{k}</span>
                  <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-navy">{t}</div><div className="text-xs text-muted">{d}</div></div>
                  <ArrowRight size={18} className="text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <p className="text-xs text-muted">Prototype for Students’ Welfare Board · Social Service Club, IIT Guwahati. Demo roles, no real login. The 7-day window, 40% cut-off and ~20% partner discount are team proposals pending institute approval.</p>
      </div>
    </div>
  );
}
