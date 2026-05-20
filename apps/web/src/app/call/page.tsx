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
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Nueva llamada</h1>
        <p className="text-slate-500 text-sm mt-1">Selecciona el cliente para iniciar sesión con AI Coach</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/call/${client.id}`}
            className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                {client.name.charAt(0)}
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
      </div>
    </div>
  );
}
