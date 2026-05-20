import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CallCoach } from '@/components/call/CallCoach';
import type { Client, Product } from '@/lib/types';

interface Props {
  params: { clientId: string };
  searchParams: { productId?: string };
}

async function getData(clientId: string, productId?: string): Promise<{ client: Client; product: Product; sellerId: string } | null> {
  const [clientRes, productRes, sellerRes] = await Promise.all([
    supabase.from('clients').select('*').eq('id', clientId).single(),
    productId
      ? supabase.from('products').select('*').eq('id', productId).single()
      : supabase.from('products').select('*').limit(1).single(),
    supabase.from('sellers').select('id').limit(1).single(),
  ]);

  if (clientRes.error || !clientRes.data) return null;
  if (productRes.error || !productRes.data) return null;
  if (sellerRes.error || !sellerRes.data) return null;

  return {
    client: clientRes.data,
    product: productRes.data,
    sellerId: sellerRes.data.id,
  };
}

export default async function CallPage({ params, searchParams }: Props) {
  const data = await getData(params.clientId, searchParams.productId);

  if (!data) {
    notFound();
  }

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col">
      <CallCoach
        client={data.client}
        product={data.product}
        sellerId={data.sellerId}
      />
    </div>
  );
}
