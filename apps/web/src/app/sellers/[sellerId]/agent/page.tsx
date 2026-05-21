import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { supabaseServer } from '@/lib/supabaseServer';
import { AgentConfigForm } from '@/components/sellers/AgentConfigForm';
import type { Seller } from '@/lib/types';

interface Props {
  params: { sellerId: string };
}

export default async function AgentPage({ params }: Props) {
  if (!supabaseServer) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
        <div className="text-center space-y-3 max-w-sm bg-white rounded-2xl p-8 shadow-card border border-slate-100">
          <AlertTriangle size={32} className="text-amber-400 mx-auto" />
          <p className="text-slate-800 font-semibold">Base de datos no configurada</p>
          <p className="text-slate-500 text-sm leading-relaxed">
            Define las variables de entorno de Supabase para acceder a la configuración del agente.
          </p>
        </div>
      </div>
    );
  }

  const { data: seller, error } = await supabaseServer
    .from('sellers')
    .select('*')
    .eq('id', params.sellerId)
    .single();

  if (error || !seller) {
    notFound();
  }

  return (
    <div className="overflow-y-auto">
      <AgentConfigForm seller={seller as Seller} />
    </div>
  );
}
