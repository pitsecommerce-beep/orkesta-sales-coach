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
    <aside className="w-56 flex-shrink-0 flex flex-col bg-navy-800 border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <PhoneCall size={14} className="text-white" />
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">Orkesta</span>
        </div>
        <p className="text-[11px] text-white/25 mt-1.5 ml-[42px] tracking-wide">Sales Coach</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                active
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-white/45 hover:text-white/75 hover:bg-white/[0.06]',
              )}
            >
              <Icon
                size={16}
                className={cn('transition-colors duration-200', active ? 'text-indigo-300' : '')}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <p className="text-[11px] text-white/20 tracking-wide">v0.1.0</p>
      </div>
    </aside>
  );
}
