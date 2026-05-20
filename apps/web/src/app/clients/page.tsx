import Link from 'next/link';
import { Phone, Building2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/lib/types';

async function getClients(): Promise<Client[]> {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .order('name');
  return data ?? [];
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clientes</h1>
          <p className="text-slate-400 text-sm mt-1">{clients.length} clientes registrados</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={15} />
          Nuevo cliente
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {clients.map((client) => (
          <ClientRow key={client.id} client={client} />
        ))}

        {clients.length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <Building2 size={32} className="mx-auto mb-3 opacity-50" />
            <p>No hay clientes registrados.</p>
            <p className="text-sm mt-1">Ejecuta la migración de Supabase para ver los datos de ejemplo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientRow({ client }: { client: Client }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#0d1b2e] rounded-xl border border-slate-800/60 hover:border-slate-700/60 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-500/20 flex items-center justify-center text-sky-300 font-semibold text-sm">
          {client.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{client.name}</p>
          <p className="text-xs text-slate-400">
            {client.company} · {client.industry}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {client.phone && (
          <span className="text-xs text-slate-500">{client.phone}</span>
        )}
        <Link
          href={`/call/${client.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors"
        >
          <Phone size={12} />
          Llamar
        </Link>
      </div>
    </div>
  );
}
