'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/** Camera scanning where the browser supports BarcodeDetector; manual ID entry always works. */
export function Scanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'idle' | 'running' | 'unsupported' | 'denied'>('idle');

  useEffect(() => () => {
    const s = video.current?.srcObject as MediaStream | null;
    s?.getTracks().forEach((t) => t.stop());
  }, []);

  const start = async () => {
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!BD || !navigator.mediaDevices?.getUserMedia) return setState('unsupported');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (!video.current) return;
      video.current.srcObject = stream;
      await video.current.play();
      setState('running');
      const det = new BD({ formats: ['qr_code'] });
      const tick = async () => {
        if (!video.current || video.current.readyState < 2) return requestAnimationFrame(tick);
        const codes = await det.detect(video.current).catch(() => []);
        const hit = codes.map((c) => c.rawValue).find((v) => /\/app\/c\/|^PP-?\d+/i.test(v));
        if (hit) {
          stream.getTracks().forEach((t) => t.stop());
          const id = hit.includes('/app/c/') ? decodeURIComponent(hit.split('/app/c/')[1]) : hit;
          router.push(`/app/c/${id}`);
        } else requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setState('denied');
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-navy">
        <video ref={video} className={`h-full w-full object-cover ${state === 'running' ? '' : 'hidden'}`} muted playsInline />
        {state !== 'running' ? (
          <button onClick={start} className="flex flex-col items-center gap-2 text-white">
            <Camera size={40} aria-hidden />
            <span className="text-sm font-semibold">Start camera</span>
          </button>
        ) : (
          <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-white/80" aria-hidden />
        )}
      </div>
      {state === 'unsupported' ? <p className="rounded-xl bg-amber-soft px-3 py-2 text-xs text-amber-ink">This browser cannot scan in-page. Use the phone camera app on the tag, or type the ID below.</p> : null}
      {state === 'denied' ? <p className="rounded-xl bg-amber-soft px-3 py-2 text-xs text-amber-ink">Camera permission was not given. Type the ID below instead.</p> : null}
      <form action="/app/lookup" className="flex gap-2">
        <input name="id" placeholder="Type the ID, e.g. PP-0342" aria-label="Cycle ID" className="field h-11 flex-1" />
        <button className="btn btn-primary h-11">Open</button>
      </form>
      <p className="text-center text-xs text-muted">Faded tag or no phone? The hostel desk can look it up by ID.</p>
    </div>
  );
}
