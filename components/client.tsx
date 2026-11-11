'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export function Flash() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ok = sp.get('ok');
  const err = sp.get('err');
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (ok || err) setShown(ok ?? err);
  }, [ok, err]);
  if (!(ok || err) || shown == null) return null;
  const close = () => {
    const next = new URLSearchParams(sp.toString());
    next.delete('ok');
    next.delete('err');
    setShown(null);
    router.replace(pathname + (next.toString() ? `?${next}` : ''), { scroll: false });
  };
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <div
        role={err ? 'alert' : 'status'}
        className={`pointer-events-auto flex max-w-xl items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg ${err ? 'border-[#F3C2C8] bg-[#FFF6F7] text-red-ink' : 'border-[#A9E0D3] bg-[#F2FBF8] text-teal-ink'}`}
      >
        {err ? <AlertTriangle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
        <span className="font-medium">{shown}</span>
        <button onClick={close} className="ml-2 rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export function NavLink({ href, children, exact, badge, badgeTone }: { href: string; children: ReactNode; exact?: boolean; badge?: number; badgeTone?: string }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-sm font-medium transition ${active ? 'bg-pale font-semibold text-primary' : 'text-body hover:bg-[#EEF4FB] hover:text-navy'}`}
    >
      {children}
      {badge ? <span className={`chip ml-auto ${badgeTone ?? 'bg-pale text-primary'}`}>{badge}</span> : null}
    </Link>
  );
}

export function TabLink({ href, children, active }: { href: string; children: ReactNode; active: boolean }) {
  return (
    <Link href={href} scroll={false} aria-current={active ? 'page' : undefined} className={`-mb-px border-b-2 px-0.5 py-3 text-sm font-semibold ${active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-navy'}`}>
      {children}
    </Link>
  );
}

export function Submit({ children, className = 'btn btn-primary', confirm, disabled, name, value, title }: { children: ReactNode; className?: string; confirm?: string; disabled?: boolean; name?: string; value?: string; title?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      title={title}
      disabled={disabled || pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        // Carry the clicked button's decision in a hidden field (robust across submit paths).
        const form = e.currentTarget.form;
        if (name && form) {
          let h = form.querySelector<HTMLInputElement>(`input[data-submitter="${name}"]`);
          if (!h) {
            h = document.createElement('input');
            h.type = 'hidden';
            h.name = name;
            h.dataset.submitter = name;
            form.appendChild(h);
          }
          h.value = value ?? '';
        }
      }}
    >
      {children}
    </button>
  );
}

export function AutoSubmitSelect({ name, value, options, label, className = '' }: { name: string; value: string; options: { value: string; label: string }[]; label: string; className?: string }) {
  return (
    <select
      name={name}
      defaultValue={value}
      aria-label={label}
      className={className}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Hidden "back" field pointing at the current URL, so actions return the user to where they were. */
export function BackHere() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const q = new URLSearchParams(sp.toString());
  q.delete('ok');
  q.delete('err');
  const v = pathname + (q.toString() ? `?${q}` : '');
  return <input type="hidden" name="back" value={v} />;
}

export function PrintButton() {
  return (
    <button className="btn btn-primary no-print" onClick={() => window.print()}>
      Print tags
    </button>
  );
}
