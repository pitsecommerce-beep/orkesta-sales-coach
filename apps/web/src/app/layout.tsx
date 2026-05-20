import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { supabaseConfigured } from '@/lib/supabase';
import { AlertTriangle } from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Orkesta Sales Coach',
  description: 'AI coaching en tiempo real para vendedores',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="flex h-screen overflow-hidden bg-[#F2F5FB] font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {!supabaseConfigured && (
            <div className="flex items-center gap-2.5 px-5 py-3 bg-amber-50 border-b border-amber-100 text-amber-800 text-sm flex-shrink-0">
              <AlertTriangle size={14} className="flex-shrink-0 text-amber-500" />
              <span>
                <strong className="font-semibold">Base de datos no configurada.</strong> Faltan{' '}
                <code className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-mono">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
                y/o{' '}
                <code className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
                {' '}Los datos reales no están disponibles.
              </span>
            </div>
          )}
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
