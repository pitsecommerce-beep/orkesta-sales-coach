import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { supabaseConfigured } from '@/lib/supabase';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Orkesta Sales Coach',
  description: 'AI coaching en tiempo real para vendedores',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex h-screen overflow-hidden bg-[#080f1e]">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {!supabaseConfigured && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-sm flex-shrink-0">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>
                <strong>Base de datos no configurada.</strong> Faltan{' '}
                <code className="text-xs bg-amber-500/10 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
                y/o{' '}
                <code className="text-xs bg-amber-500/10 px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
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
