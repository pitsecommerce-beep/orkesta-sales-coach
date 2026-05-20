import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';

export const metadata: Metadata = {
  title: 'Orkesta Sales Coach',
  description: 'AI coaching en tiempo real para vendedores',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex h-screen overflow-hidden bg-[#080f1e]">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </body>
    </html>
  );
}
