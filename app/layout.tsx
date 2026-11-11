import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { Flash } from '@/components/client';

export const metadata: Metadata = {
  title: 'Pedals Hub · Recover · Reuse · Prevent',
  description: 'Project Pedals operations dashboard and student web app (demo prototype).',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#102A43' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Suspense>
          <Flash />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
