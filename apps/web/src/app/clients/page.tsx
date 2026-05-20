import Link from 'next/link';
import { Phone, Building2 } from 'lucide-react';
import { supabaseServer } from '@/lib/supabaseServer';
import { NewClientButton } from '@/components/clients/NewClientDialog';
import { ClientsToolbar } from '@/components/clients/ClientsToolbar';
import type { Client } from '@/lib/types';

async function getClients(): Promise<Client[]> {
  if (!supabaseServer) return [];
  const { data } = await supabaseServer.from('clients').select('*').order('name');
  return data ?? [];
}

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Clientes</h1>
          <p className="text-slate-400 text-sm mt-1">
            {clients.length > 0
              ? `${clients.length} cliente${clients.length !== 1 ? 's' : ''} registrado${clients.length !== 1 ? 's' : ''}`
              : 'Sin clientes aún'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          <ClientsToolbar clients={clients} />
          <NewClientButton />
        </div>
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
            <p className="font-semibold text-slate-500">No hay clientes registrados</p>
            <p className="text-sm mt-1.5 text-slate-400 max-w-sm mx-auto">
              Agrega tu primer cliente con el botón de arriba, o importa un CSV con la plantilla descargable.
            </p>
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
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{client.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {[client.company, client.industry].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {client.phone && (
          <span className="text-xs text-slate-400 font-mono">{client.phone}</span>
        )}
        <Link
          href={`/call/${client.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-semibold hover:bg-emerald-100 hover:border-emerald-200 transition-all duration-150"
        >
          <Phone size={12} />
          Llamar
        </Link>
      </div>
    </div>
  );
}
