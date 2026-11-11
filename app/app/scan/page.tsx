import { Scanner } from './scanner';

export default function ScanPage() {
  return (
    <div className="px-4 pt-4">
      <h1 className="font-display text-xl font-extrabold text-navy">Scan a cycle tag</h1>
      <p className="mt-1 text-[13px] text-muted">Point the camera at the QR on the handlebar tag. Your phone camera app works too: the QR is a normal web link.</p>
      <Scanner />
    </div>
  );
}
