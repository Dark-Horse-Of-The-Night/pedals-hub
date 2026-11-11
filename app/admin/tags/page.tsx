import { readDb } from '@/lib/store';
import { QR, originUrl } from '@/components/QR';
import { PageHeader } from '@/components/ui';
import { PrintButton } from '@/components/client';

export const dynamic = 'force-dynamic';

export default async function Tags({ searchParams }: { searchParams: Promise<{ standee?: string; ids?: string }> }) {
  const sp = await searchParams;
  const db = readDb();
  const origin = await originUrl();
  if (sp.standee) {
    return (
      <div className="flex flex-col items-center gap-6 py-6">
        <div className="no-print self-stretch"><PageHeader title="Semester check standee" actions={<PrintButton />} /></div>
        <div className="flex w-[420px] flex-col items-center gap-4 rounded-3xl border-2 border-navy bg-white p-8 text-center">
          <div className="font-display text-3xl font-extrabold text-navy">Back from the break?</div>
          <p className="text-base text-body">Confirm your cycle in under a minute. Same tag, no app to install.</p>
          <div className="rounded-2xl border border-line p-4"><QRStatic url={`${origin}/app/semester`} /></div>
          <div className="text-sm text-muted">Or open <b>{origin.replace(/^https?:\/\//, '')}/app</b> · help at the hostel desk</div>
          <div className="text-xs text-muted">No reply means a friendly follow-up, never removal.</div>
        </div>
      </div>
    );
  }
  const list = db.cycles.filter((c) => c.ownershipStatus !== 'TRANSFERRED' && c.salvageStatus === 'NONE');
  return (
    <div className="flex flex-col gap-5">
      <div className="no-print">
        <PageHeader title="Permanent QR tags" sub="One weatherproof tag per cycle, for life. The record updates each term; the sticker never changes. The QR opens a public page with ID, bay and status only." actions={<PrintButton />} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 print:grid-cols-4">
        {list.map((c) => (
          <div key={c.id} className="flex break-inside-avoid flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong bg-white p-3">
            <div className="text-[10px] font-bold tracking-widest text-primary">PEDALS HUB</div>
            <QR id={c.id} size={110} label={false} />
            <div className="font-display text-lg font-extrabold tracking-wide text-navy">{c.id}</div>
            <div className="text-center text-[10px] leading-tight text-muted">Scan or type this ID at {origin.replace(/^https?:\/\//, '')}/app</div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function QRStatic({ url }: { url: string }) {
  const QRCode = (await import('qrcode')).default;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 0, color: { dark: '#102A43', light: '#FFFFFF' } });
  return <div role="img" aria-label={`QR code for ${url}`} className="h-[200px] w-[200px] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
