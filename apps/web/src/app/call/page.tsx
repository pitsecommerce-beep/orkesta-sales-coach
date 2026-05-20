import Link from 'next/link';
import { Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

async function getData() {
  if (!supabase) {
    return { clients: [], products: [] };
  }

  const [clientsRes, productsRes] = await Promise.all([
    supabase.from('clients').select('id, name, company').order('name'),
    supabase.from('products').select('id, name, suggested_price').order('name'),
  ]);

  return {
    clients: clientsRes.data ?? [],
    products: productsRes.data ?? [],
  };
}

export default async function CallSelectPage() {
  const { clients } = await getData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Nueva llamada</h1>
        <p className="text-slate-400 text-sm mt-1">Selecciona el cliente para iniciar sesión con AI Coach</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/call/${client.id}`}
            className="flex items-center justify-between p-4 bg-[#0d1b2e] border border-slate-800/60 rounded-xl hover:border-emerald-500/30 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-500/20 flex items-center justify-center text-sky-300 font-semibold text-sm">
                {client.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{client.name}</p>
                <p className="text-xs text-slate-500">{client.company}</p>
              </div>
            </div>
            <Phone size={15} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
