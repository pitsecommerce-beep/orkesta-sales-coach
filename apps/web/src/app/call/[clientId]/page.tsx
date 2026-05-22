import { notFound } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { supabaseServer } from '@/lib/supabaseServer';
import { CallCoach } from '@/components/call/CallCoach';
import type { Client, Product, Seller } from '@/lib/types';

// Always fetch fresh seller config — persona name and voice can change between sessions.
export const dynamic = 'force-dynamic';

interface Props {
  params: { clientId: string };
  searchParams: { productId?: string };
}

async function getData(
  clientId: string,
  productId?: string,
): Promise<{ client: Client; product: Product; sellerId: string; agentName: string } | null> {
  if (!supabaseServer) return null;

  // Fetch client and seller in parallel; product depends on client's default_product_id
  const [clientRes, sellerRes] = await Promise.all([
    supabaseServer.from('clients').select('*').eq('id', clientId).single(),
    supabaseServer.from('sellers').select('id, name, agent_config').limit(1).single(),
  ]);

  if (clientRes.error || !clientRes.data) return null;
  if (sellerRes.error || !sellerRes.data) return null;

  // Priority: URL param → client's assigned product → first product in DB
  const effectiveProductId = productId || clientRes.data.default_product_id;
  const productRes = effectiveProductId
    ? await supabaseServer.from('products').select('*').eq('id', effectiveProductId).single()
    : await supabaseServer.from('products').select('*').limit(1).single();

  if (productRes.error || !productRes.data) return null;

  const seller = sellerRes.data as Pick<Seller, 'id' | 'name' | 'agent_config'>;
  const agentName = seller.agent_config?.persona_name || seller.name || 'Agente';

  return {
    client: clientRes.data,
    product: productRes.data,
    sellerId: seller.id,
    agentName,
  };
}

export default async function CallPage({ params, searchParams }: Props) {
  if (!supabaseServer) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)]">
        <div className="text-center space-y-3 max-w-sm bg-white rounded-2xl p-8 shadow-card border border-slate-100">
          <AlertTriangle size={32} className="text-amber-400 mx-auto" />
          <p className="text-slate-800 font-semibold">Base de datos no configurada</p>
          <p className="text-slate-500 text-sm leading-relaxed">
            Define{' '}
            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
            <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
            para cargar el contexto del cliente.
          </p>
        </div>
      </div>
    );
  }

  const data = await getData(params.clientId, searchParams.productId);

  if (!data) return notFound();

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <CallCoach
        client={data.client}
        product={data.product}
        sellerId={data.sellerId}
        agentName={data.agentName}
      />
    </div>
  );
}
