'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, PhoneCall, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clients', icon: Users, label: 'Clientes' },
  { href: '/call', icon: PhoneCall, label: 'Nueva llamada' },
  { href: '/settings', icon: Settings, label: 'Configuración' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-[#0a1628] border-r border-slate-800">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
            <PhoneCall size={14} className="text-white" />
          </div>
          <span className="font-semibold text-white text-sm">Orkesta</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 ml-9">Sales Coach</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-sky-500/10 text-sky-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60',
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-xs text-slate-600">v0.1.0 · Claude claude-sonnet-4-6</p>
      </div>
    </aside>
  );
}
