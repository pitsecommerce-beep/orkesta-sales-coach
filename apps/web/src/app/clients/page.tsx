import Link from 'next/link';
import { Phone, Building2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/lib/types';

async function getClients(): Promise<Client[]> {
  if (!supabase) return [];
  const { data } = await supabase.from('clients').select('*').order('name');
  return data ?? [];
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Clientes</h1>
          <p className="text-slate-500 text-sm mt-1">{clients.length} clientes registrados</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:shadow-md hover:shadow-indigo-500/25">
          <Plus size={15} />
          Nuevo cliente
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {clients.map((client) => (
          <ClientRow key={client.id} client={client} />
        ))}

        {clients.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} className="text-slate-300" />
            </div>
            <p className="font-medium text-slate-500">No hay clientes registrados</p>
            <p className="text-sm mt-1 text-slate-400">Ejecuta la migración de Supabase para ver los datos de ejemplo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientRow({ client }: { client: Client }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-card hover:shadow-card-hover hover:-translate-y-px transition-all duration-200">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
          {client.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{client.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {client.company} · {client.industry}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {client.phone && (
          <span className="text-xs text-slate-400">{client.phone}</span>
        )}
        <Link
          href={`/call/${client.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-medium hover:bg-emerald-100 hover:border-emerald-200 transition-all duration-150"
        >
          <Phone size={12} />
          Llamar
        </Link>
      </div>
    </div>
  );
}
