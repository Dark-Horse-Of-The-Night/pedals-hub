import QRCode from 'qrcode';
import { headers } from 'next/headers';

export async function originUrl() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}

/** Permanent tag QR: encodes only the public scan URL (no owner data). */
export async function QR({ id, size = 96, label = true }: { id: string; size?: number; label?: boolean }) {
  const url = `${await originUrl()}/app/c/${encodeURIComponent(id)}`;
  const svg = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#102A43', light: '#FFFFFF' } });
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <div
        role="img"
        aria-label={`QR tag for ${id}, opens ${url}`}
        style={{ width: size, height: size }}
        className="[&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {label ? <figcaption className="font-display text-xs font-extrabold tracking-wide text-navy">{id}</figcaption> : null}
    </figure>
  );
}
