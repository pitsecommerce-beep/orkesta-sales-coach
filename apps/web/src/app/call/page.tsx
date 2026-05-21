import Link from 'next/link';
import { Phone } from 'lucide-react';
import { supabaseServer } from '@/lib/supabaseServer';

async function getData() {
  if (!supabaseServer) {
    return { clients: [] };
  }

  const { data } = await supabaseServer
    .from('clients')
    .select('id, name, company, default_product_id')
    .order('name');

  return { clients: data ?? [] };
}

export default async function CallSelectPage() {
  const { clients } = await getData();

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Nueva llamada</h1>
        <p className="text-slate-400 text-sm mt-1">Selecciona el cliente para iniciar sesión con AI Coach</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={
              client.default_product_id
                ? `/call/${client.id}?productId=${client.default_product_id}`
                : `/call/${client.id}`
            }
            className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{client.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{client.company}</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-emerald-50 flex items-center justify-center transition-all duration-200">
              <Phone size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors duration-200" />
            </div>
          </Link>
        ))}

        {clients.length === 0 && (
          <div className="col-span-2 text-center py-16 text-slate-400">
            <p className="font-medium text-slate-500">No hay clientes disponibles</p>
            <p className="text-sm mt-1">
              <Link href="/clients" className="text-indigo-500 hover:underline">Agrega clientes</Link> para poder iniciar una llamada.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
