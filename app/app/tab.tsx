'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function StudentTab({ href, icon, label, exact }: { href: string; icon: ReactNode; label: string; exact?: boolean }) {
  const p = usePathname();
  const active = exact ? p === href : p === href || p.startsWith(href + '/');
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? 'text-primary' : 'text-muted hover:text-navy'}`}>
      {icon}
      {label}
    </Link>
  );
}
