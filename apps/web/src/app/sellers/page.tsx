import Link from 'next/link';
import { Bot, ChevronRight, AlertTriangle } from 'lucide-react';
import { supabaseServer } from '@/lib/supabaseServer';
import type { Seller } from '@/lib/types';

export default async function SellersPage() {
  if (!supabaseServer) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
        <div className="text-center space-y-3 max-w-sm bg-white rounded-2xl p-8 shadow-card border border-slate-100">
          <AlertTriangle size={32} className="text-amber-400 mx-auto" />
          <p className="text-slate-800 font-semibold">Base de datos no configurada</p>
          <p className="text-slate-500 text-sm leading-relaxed">
            Define las variables de entorno de Supabase para acceder a los agentes.
          </p>
        </div>
      </div>
    );
  }

  const { data: sellers } = await supabaseServer
    .from('sellers')
    .select('*')
    .order('name');

  const sellerList = (sellers ?? []) as Seller[];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Agentes</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Configura la personalidad y comportamiento del coach de IA por vendedor
        </p>
      </div>

      {sellerList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
            <Bot size={24} className="text-slate-300" />
          </div>
          <p className="text-slate-500 text-sm">No hay vendedores registrados aún.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sellerList.map((seller) => (
            <div
              key={seller.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-card px-5 py-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{seller.name}</p>
                  {seller.email && (
                    <p className="text-xs text-slate-400 mt-0.5">{seller.email}</p>
                  )}
                  {seller.agent_config?.persona_name && (
                    <p className="text-xs text-indigo-500 mt-0.5">
                      Agente: {seller.agent_config.persona_name}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={`/sellers/${seller.id}/agent`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors duration-150"
              >
                Configurar agente
                <ChevronRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
