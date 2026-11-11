import Link from 'next/link';
import { Bike, Check, ChevronRight, GraduationCap, Plus, QrCode, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { readDb } from '@/lib/store';
import { studentActor } from '@/lib/session';
import { CLAIM, OWNERSHIP, STUDENTS } from '@/lib/labels';
import { Chip, fmtDate } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function StudentHome() {
  const db = readDb();
  const me = await studentActor();
  const persona = STUDENTS.find((s) => s.id === me.studentId);
  const mine = db.cycles.filter((c) => c.ownerId === me.studentId && c.ownershipStatus !== 'TRANSFERRED');
  const bought = db.cycles.filter((c) => c.ownerId === me.studentId && c.ownershipStatus === 'TRANSFERRED');
  const term = db.settings.term;
  const now = Date.now();
  const windowOpen = now >= Date.parse(db.settings.semesterStart) && now <= Date.parse(db.settings.semesterEnd);
  const dueCheck = windowOpen ? mine.find((c) => !db.confirmations.some((x) => x.cycleId === c.id && x.term === term)) : undefined;
  const myClaims = db.claims.filter((c) => c.claimantId === me.studentId);
  const myRes = db.listings.find((l) => l.reservedBy === me.studentId && db.cycles.find((c) => c.id === l.cycleId)?.listingStatus === 'RESERVED');
  const live = db.cycles.filter((c) => c.listingStatus === 'LIVE').length;
  const notices = db.cycles.filter((c) => c.ownershipStatus === 'NOTICE_ACTIVE').length;

  return (
    <div>
      <div className="bg-navy px-5 pt-5 pb-16 text-white">
        <div className="flex items-center gap-2"><Bike size={22} aria-hidden /><b className="font-display text-[17px]">Pedals Hub</b></div>
        <div className="mt-4 text-[13px] text-[#B7C6D8]">Hi {me.studentId}{persona ? ` · ${persona.persona.toLowerCase()}` : ''} · no app download needed</div>
        <h1 className="mt-0.5 font-display text-[22px] font-extrabold">Your cycle, one tag for life</h1>
      </div>

      <form action="/app/lookup" className="mx-4 -mt-12 rounded-2xl bg-white p-4 shadow-[0_8px_24px_rgba(16,42,67,.12)]">
        <div className="flex items-center gap-3">
          <Link href="/app/scan" className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-xl bg-pale text-primary" aria-label="Scan with camera"><QrCode size={28} aria-hidden /></Link>
          <div><div className="font-bold">Scan a cycle tag</div><div className="text-xs text-muted">or type the ID printed under the QR</div></div>
        </div>
        <div className="mt-3 flex gap-2">
          <label className="flex h-11 flex-1 items-center rounded-[10px] border border-line-strong px-3 text-sm focus-within:outline-2 focus-within:outline-accent">
            <span className="mr-1 text-muted">{db.settings.idPrefix}</span>
            <input name="id" inputMode="numeric" placeholder="0342" aria-label="Cycle ID" className="w-full outline-none" />
          </label>
          <button className="btn btn-primary h-11">Open</button>
        </div>
      </form>

      {dueCheck ? (
        <Link href="/app/semester" className="mx-4 mt-3.5 flex items-center gap-3 rounded-2xl border border-[#F6D58E] bg-[#FEF7E8] px-3.5 py-3">
          <RefreshCw size={22} className="shrink-0 text-amber-ink" aria-hidden />
          <div className="flex-1 text-[13px]"><b>Welcome back! Is {dueCheck.id} still yours?</b><div className="text-xs text-[#7A5300]">Semester check · about 1 min · closes {fmtDate(db.settings.semesterEnd).replace(/ \d{4}$/, '')}</div></div>
          <span className="text-[13px] font-bold text-amber-ink">Verify</span>
        </Link>
      ) : null}

      <div className="mx-4 mt-3.5 grid grid-cols-2 gap-2.5">
        <Tile href="/app/register" icon={<Plus size={20} />} bg="bg-pale text-primary" title="Register my cycle" sub="Spot + condition" />
        <Tile href="/app/claim" icon={<ShieldCheck size={20} />} bg="bg-amber-soft text-amber-ink" title="Claim my cycle" sub={`${notices} under ${db.settings.noticeDays}-day notice`} />
        <Tile href="/app/cycles" icon={<Bike size={20} />} bg="bg-teal-soft text-teal-ink" title="Buy a cycle" sub={`${live} cleared listing${live === 1 ? '' : 's'}`} />
        <Tile href="/app/exit" icon={<GraduationCap size={20} />} bg="bg-slate-soft text-body" title="Leaving IITG?" sub="Sell or donate" />
      </div>

      <div className="mx-4 mt-3.5 flex flex-col gap-2.5">
        {mine.map((c) => (
          <Link key={c.id} href="/app/my-cycle" className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-teal-soft text-teal-ink"><Check size={20} aria-hidden /></div>
            <div className="flex-1 text-[13px]"><b>My cycle · {c.id}</b><div className="text-xs text-muted">{OWNERSHIP[c.ownershipStatus].label} · {c.bay} · last confirmed {fmtDate(c.lastVerified).replace(/ \d{4}$/, '')}</div></div>
            <ChevronRight size={18} className="text-muted" aria-hidden />
          </Link>
        ))}
        {myClaims.map((cl) => (
          <Link key={cl.id} href={`/app/c/${cl.cycleId}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-amber-soft text-amber-ink"><ShieldCheck size={20} aria-hidden /></div>
            <div className="flex-1 text-[13px]"><b>My claim · {cl.cycleId}</b><div className="text-xs text-muted">Submitted {fmtDate(cl.submittedAt).replace(/ \d{4}$/, '')}</div></div>
            <Chip tone={CLAIM[cl.status].tone}>{CLAIM[cl.status].label}</Chip>
          </Link>
        ))}
        {myRes ? (
          <Link href={`/app/cycles/${myRes.cycleId}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-teal-soft text-teal-ink"><Bike size={20} aria-hidden /></div>
            <div className="flex-1 text-[13px]"><b>Reserved · {myRes.cycleId}</b><div className="text-xs text-muted">Collect at the hostel desk · ₹{myRes.priceS} cycle only</div></div>
            <ChevronRight size={18} className="text-muted" aria-hidden />
          </Link>
        ) : null}
        {bought.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-3 text-[13px]">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-pale text-primary"><Bike size={20} aria-hidden /></div>
            <div><b>Bought · {c.id}</b><div className="text-xs text-muted">Handed over with receipt. Register it to keep the tag active.</div></div>
          </div>
        ))}
        <Link href="/app/cycles" className="flex items-center gap-3 rounded-2xl border border-dashed border-line-strong px-3.5 py-3 text-[13px] text-body">
          <Wrench size={18} className="text-muted" aria-hidden />
          <span className="flex-1">Partner repair shop: ~{db.settings.discountPct}% off listed repairs <span className="text-xs text-amber-ink">({db.settings.discountConfirmed ? 'confirmed' : 'proposed'})</span></span>
        </Link>
      </div>
    </div>
  );
}

function Tile({ href, icon, bg, title, sub }: { href: string; icon: React.ReactNode; bg: string; title: string; sub: string }) {
  return (
    <Link href={href} className="flex min-h-[100px] flex-col gap-2 rounded-2xl border border-line bg-white p-3.5 transition hover:border-[#BBD6F2]">
      <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${bg}`} aria-hidden>{icon}</span>
      <b className="text-sm">{title}</b>
      <span className="-mt-1 text-xs text-muted">{sub}</span>
    </Link>
  );
}
