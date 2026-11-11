import Link from 'next/link';
import { Home, QrCode, Store, UserRound } from 'lucide-react';
import { readDb } from '@/lib/store';
import { studentActor } from '@/lib/session';
import { STUDENTS } from '@/lib/labels';
import { AutoSubmitSelect, BackHere } from '@/components/client';
import { setStudent } from '@/app/actions';
import { StudentTab } from './tab';

export const dynamic = 'force-dynamic';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const db = readDb();
  const me = await studentActor();
  const demo = db.settings.datasetMode === 'DEMO';
  return (
    <div className="min-h-screen bg-[#E9EFF6] sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-page shadow-[0_10px_40px_rgba(16,42,67,.12)] sm:min-h-[calc(100vh-48px)] sm:overflow-hidden sm:rounded-[28px]">
        <div className="flex items-center gap-2 border-b border-line bg-white px-4 py-2 text-xs">
          <span className={`chip ${demo ? 'bg-amber-soft text-amber-ink' : 'bg-teal-soft text-teal-ink'}`}>{demo ? 'DEMO' : 'PILOT'}</span>
          <span className="text-muted">Prototype · demo student:</span>
          <form action={setStudent} className="ml-auto">
            <BackHere />
            <AutoSubmitSelect
              name="student"
              value={me.studentId!}
              label="Switch demo student"
              className="h-8 rounded-lg border border-line-strong bg-white px-1.5 text-xs font-semibold text-navy"
              options={STUDENTS.map((s) => ({ value: s.id, label: `${s.id} · ${s.persona}` }))}
            />
          </form>
        </div>
        <main className="flex-1 pb-4">{children}</main>
        <nav aria-label="Student" className="sticky bottom-0 z-10 flex border-t border-line bg-white pb-1">
          <StudentTab href="/app" exact icon={<Home size={20} aria-hidden />} label="Home" />
          <StudentTab href="/app/scan" icon={<QrCode size={20} aria-hidden />} label="Scan" />
          <StudentTab href="/app/cycles" icon={<Store size={20} aria-hidden />} label="Cycles" />
          <StudentTab href="/app/my-cycle" icon={<UserRound size={20} aria-hidden />} label="My cycle" />
        </nav>
      </div>
      <p className="mx-auto mt-3 hidden max-w-[440px] text-center text-xs text-muted sm:block">
        Mobile web: opens from the QR tag, no app download. <Link href="/admin" className="font-semibold text-primary">Operations Centre →</Link>
      </p>
    </div>
  );
}
