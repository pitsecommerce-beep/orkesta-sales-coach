import { PhoneCall, Users, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

async function getStats() {
  const [callsRes, clientsRes] = await Promise.all([
    supabase.from('calls').select('id, status, started_at, ended_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
  ]);

  return {
    recentCalls: callsRes.data ?? [],
    totalClients: clientsRes.count ?? 0,
    activeCalls: callsRes.data?.filter((c) => c.status === 'active').length ?? 0,
  };
}

export default async function DashboardPage() {
  const stats = await getStats();

  const tiles = [
    {
      icon: Users,
      label: 'Clientes',
      value: stats.totalClients,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      icon: PhoneCall,
      label: 'Llamadas activas',
      value: stats.activeCalls,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      icon: TrendingUp,
      label: 'Llamadas hoy',
      value: stats.recentCalls.length,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen de actividad de ventas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {tiles.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-5 ${bg}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-400">{label}</p>
              <Icon size={18} className={color} />
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/clients"
          className="flex items-center gap-3 p-4 bg-[#0d1b2e] border border-slate-800/60 rounded-xl hover:border-sky-500/30 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
            <Users size={18} className="text-sky-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Ver clientes</p>
            <p className="text-xs text-slate-500">Gestiona el CRM</p>
          </div>
        </Link>

        <Link
          href="/call"
          className="flex items-center gap-3 p-4 bg-[#0d1b2e] border border-slate-800/60 rounded-xl hover:border-emerald-500/30 transition-colors group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
            <PhoneCall size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Nueva llamada</p>
            <p className="text-xs text-slate-500">Iniciar sesión con AI coach</p>
          </div>
        </Link>
      </div>

      {/* Recent calls */}
      {stats.recentCalls.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Clock size={14} className="text-slate-500" />
            Llamadas recientes
          </h2>
          <div className="space-y-2">
            {stats.recentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between px-4 py-3 bg-[#0d1b2e] rounded-lg border border-slate-800/40"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      call.status === 'active'
                        ? 'bg-emerald-400 animate-pulse'
                        : call.status === 'completed'
                          ? 'bg-slate-500'
                          : 'bg-red-400'
                    }`}
                  />
                  <span className="text-sm text-slate-300">{call.id.slice(0, 8)}...</span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(call.started_at).toLocaleString('es-MX')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
