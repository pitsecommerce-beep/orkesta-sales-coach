import { PhoneCall, Users, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabaseServer } from '@/lib/supabaseServer';

async function getStats() {
  if (!supabaseServer) {
    return { recentCalls: [], totalClients: 0, activeCalls: 0 };
  }

  const [callsRes, clientsRes] = await Promise.all([
    supabaseServer.from('calls').select('id, status, started_at, ended_at').order('created_at', { ascending: false }).limit(5),
    supabaseServer.from('clients').select('id', { count: 'exact', head: true }),
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
      textColor: 'text-indigo-600',
      iconBg: 'bg-indigo-500',
      tileBg: 'bg-indigo-50/50',
    },
    {
      icon: PhoneCall,
      label: 'Llamadas activas',
      value: stats.activeCalls,
      textColor: 'text-emerald-600',
      iconBg: 'bg-emerald-500',
      tileBg: 'bg-emerald-50/50',
    },
    {
      icon: TrendingUp,
      label: 'Llamadas hoy',
      value: stats.recentCalls.length,
      textColor: 'text-violet-600',
      iconBg: 'bg-violet-500',
      tileBg: 'bg-violet-50/50',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen de actividad de ventas</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {tiles.map(({ icon: Icon, label, value, textColor, iconBg, tileBg }) => (
          <div
            key={label}
            className={`rounded-2xl border border-slate-100 p-5 shadow-card ${tileBg} transition-all duration-200 hover:shadow-card-hover`}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500 font-medium">{label}</p>
              <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shadow-sm`}>
                <Icon size={16} className="text-white" />
              </div>
            </div>
            <p className={`text-3xl font-bold ${textColor} tracking-tight`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/clients"
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors duration-200">
              <Users size={18} className="text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Ver clientes</p>
              <p className="text-xs text-slate-400 mt-0.5">Gestiona el CRM</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-200" />
        </Link>

        <Link
          href="/call"
          className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors duration-200">
              <PhoneCall size={18} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Nueva llamada</p>
              <p className="text-xs text-slate-400 mt-0.5">Iniciar sesión con AI coach</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all duration-200" />
        </Link>
      </div>

      {/* Recent calls */}
      {stats.recentCalls.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-500 mb-3 flex items-center gap-2">
            <Clock size={13} className="text-slate-400" />
            Llamadas recientes
          </h2>
          <div className="space-y-2">
            {stats.recentCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-100 shadow-card"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      call.status === 'active'
                        ? 'bg-emerald-400 animate-pulse'
                        : call.status === 'completed'
                          ? 'bg-slate-300'
                          : 'bg-rose-400'
                    }`}
                  />
                  <span className="text-sm text-slate-600 font-mono text-xs">{call.id.slice(0, 8)}&hellip;</span>
                </div>
                <span className="text-xs text-slate-400">
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
