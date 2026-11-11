import Link from 'next/link';
import { LayoutDashboard, Rows3, ShieldCheck, Wrench, Store, Settings2, Recycle, RefreshCw, GraduationCap, LineChart, SlidersHorizontal, Search, Upload, QrCode, Smartphone } from 'lucide-react';
import { readDb } from '@/lib/store';
import { overview } from '@/lib/metrics';
import { staffActor } from '@/lib/session';
import { NavLink, AutoSubmitSelect, BackHere } from '@/components/client';
import { Logo, DemoPill } from '@/components/Logo';
import { setRole } from '@/app/actions';
import { ROLE_LABEL } from '@/lib/labels';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = readDb();
  const o = overview(db);
  const actor = await staffActor();
  const mode = o.provenance.demo > 0 ? (o.provenance.imported > 0 ? 'MIXED' : 'DEMO') : 'IMPORTED';
  const ic = { size: 18, strokeWidth: 2, 'aria-hidden': true } as const;
  const sec = (t: string) => <div className="lbl px-3 pt-4 pb-1 text-[11px]">{t}</div>;

  return (
    <div className="flex min-h-screen flex-wrap">
      <aside className="no-print flex w-full flex-col gap-4 border-b border-line bg-white px-3.5 py-5 lg:sticky lg:top-0 lg:h-screen lg:w-[248px] lg:overflow-y-auto lg:border-r lg:border-b-0">
        <Link href="/admin" className="px-1.5">
          <Logo />
        </Link>
        <nav aria-label="Operations" className="flex flex-col gap-0.5">
          <NavLink href="/admin" exact>
            <LayoutDashboard {...ic} />
            Overview
          </NavLink>
          <NavLink href="/admin/inventory" badge={o.total} badgeTone="bg-slate-soft text-body">
            <Rows3 {...ic} />
            Inventory
          </NavLink>
          {sec('Recover')}
          <NavLink href="/admin/claims" badge={o.inClaim + o.awaiting} badgeTone={o.awaiting ? 'bg-red-soft text-red-ink' : 'bg-amber-soft text-amber-ink'}>
            <ShieldCheck {...ic} />
            Claims &amp; clearance
          </NavLink>
          <NavLink href="/admin/review">
            <Wrench {...ic} />
            Grading &amp; R/V
          </NavLink>
          {sec('Reuse')}
          <NavLink href="/admin/marketplace" badge={o.market.draft + o.market.reserved || undefined} badgeTone="bg-teal-soft text-teal-ink">
            <Store {...ic} />
            Marketplace
          </NavLink>
          <NavLink href="/admin/repairs">
            <Settings2 {...ic} />
            Repairs &amp; partners
          </NavLink>
          <NavLink href="/admin/salvage" badge={o.salvage.length || undefined} badgeTone="bg-slate-soft text-body">
            <Recycle {...ic} />
            Salvage &amp; parts
          </NavLink>
          {sec('Prevent')}
          <NavLink href="/admin/semester" badge={o.semester.pending.length || undefined} badgeTone="bg-pale text-primary">
            <RefreshCw {...ic} />
            Semester check
          </NavLink>
          <NavLink href="/admin/exit" badge={o.exitsOpen.length || undefined}>
            <GraduationCap {...ic} />
            Graduation exit
          </NavLink>
          {sec('Programme')}
          <NavLink href="/admin/impact">
            <LineChart {...ic} />
            Impact &amp; reports
          </NavLink>
          <NavLink href="/admin/tags">
            <QrCode {...ic} />
            QR tags
          </NavLink>
          <NavLink href="/admin/import">
            <Upload {...ic} />
            Import audit sheet
          </NavLink>
          <NavLink href="/admin/settings">
            <SlidersHorizontal {...ic} />
            Policy settings
          </NavLink>
        </nav>
        <div className="mt-auto space-y-2">
          <Link href="/app" className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-primary hover:bg-pale">
            <Smartphone size={16} aria-hidden /> Open student web app
          </Link>
          <div className="rounded-xl border border-line bg-page p-3 text-xs leading-relaxed text-muted">
            <div className="mb-0.5 font-bold text-navy">Pilot · {db.settings.term}</div>
            Team proposals in force: {db.settings.noticeDays}-day notice, {db.settings.thresholdPct}% R/V cut-off, ~{db.settings.discountPct}% partner discount ({db.settings.discountConfirmed ? 'confirmed' : 'unconfirmed'}).
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-[999_1_560px] flex-col">
        <header className="no-print sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-line bg-white/95 px-5 py-3 backdrop-blur lg:px-7">
          <form action="/admin/inventory" className="flex h-10 min-w-[220px] max-w-[420px] flex-1 items-center gap-2 rounded-[10px] border border-line-strong bg-[#F8FAFD] px-3 text-sm text-muted">
            <Search size={16} aria-hidden />
            <input name="q" aria-label="Search cycles" placeholder="Search cycle ID, bay, grade or status…" className="w-full bg-transparent text-ink outline-none" />
          </form>
          <span className="hidden text-sm text-muted xl:inline">{db.settings.pilotArea}</span>
          <DemoPill mode={mode} />
          <form action={setRole} className="ml-auto flex items-center gap-2">
            <BackHere />
            <span className="hidden text-right text-xs leading-tight sm:block">
              <span className="block font-bold text-navy">{actor.name}</span>
              <span className="text-muted">demo role · no real login</span>
            </span>
            <AutoSubmitSelect
              name="role"
              value={actor.role}
              label="Switch demo role"
              className="h-10 rounded-[10px] border border-line-strong bg-white px-2.5 text-sm font-semibold text-navy"
              options={(['admin', 'auditor', 'mechanic'] as const).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            />
          </form>
        </header>
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-5 py-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
