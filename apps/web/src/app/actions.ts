'use server';

import { revalidatePath } from 'next/cache';
import { supabaseServer } from '@/lib/supabaseServer';
import type { AgentConfig } from '@/lib/types';

export async function createClientAction(formData: FormData): Promise<{ error?: string }> {
  if (!supabaseServer) return { error: 'Base de datos no configurada.' };

  const data = {
    name: (formData.get('name') as string).trim(),
    company: (formData.get('company') as string | null)?.trim() || null,
    industry: (formData.get('industry') as string | null)?.trim() || null,
    email: (formData.get('email') as string | null)?.trim() || null,
    phone: (formData.get('phone') as string | null)?.trim() || null,
    pain_points: (formData.get('pain_points') as string | null)?.trim() || null,
    notes: (formData.get('notes') as string | null)?.trim() || null,
  };

  const { error } = await supabaseServer.from('clients').insert(data);
  if (error) return { error: error.message };

  revalidatePath('/clients');
  return {};
}

export async function updateClientAction(id: string, formData: FormData): Promise<{ error?: string }> {
  if (!supabaseServer) return { error: 'Base de datos no configurada.' };

  const defaultProductId = (formData.get('default_product_id') as string | null)?.trim() || null;

  const data: Record<string, unknown> = {
    name: (formData.get('name') as string).trim(),
    company: (formData.get('company') as string | null)?.trim() || null,
    industry: (formData.get('industry') as string | null)?.trim() || null,
    email: (formData.get('email') as string | null)?.trim() || null,
    phone: (formData.get('phone') as string | null)?.trim() || null,
    pain_points: (formData.get('pain_points') as string | null)?.trim() || null,
    notes: (formData.get('notes') as string | null)?.trim() || null,
    default_product_id: defaultProductId || null,
  };

  const { error } = await supabaseServer.from('clients').update(data).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/clients');
  return {};
}

export async function importClientsAction(rows: Record<string, string>[]) {
  if (!supabaseServer) throw new Error('Base de datos no configurada.');

  const clients = rows
    .map((r) => ({
      id: r.id?.trim() || undefined,
      name: r.nombre?.trim() || r.name?.trim() || '',
      company: r.empresa?.trim() || r.company?.trim() || null,
      industry: r.industria?.trim() || r.industry?.trim() || null,
      email: r.email?.trim() || null,
      phone: r.telefono?.trim() || r.phone?.trim() || null,
      pain_points: r.pain_points?.trim() || null,
      notes: r.notas?.trim() || r.notes?.trim() || null,
    }))
    .filter((c) => c.name);

  // Split into updates (have id) and inserts (no id)
  const toUpdate = clients.filter((c) => c.id);
  const toInsert = clients.filter((c) => !c.id).map(({ id: _id, ...rest }) => rest);

  const errors: string[] = [];

  if (toUpdate.length > 0) {
    for (const client of toUpdate) {
      const { id, ...fields } = client;
      const { error } = await supabaseServer.from('clients').update(fields).eq('id', id!);
      if (error) errors.push(error.message);
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabaseServer.from('clients').insert(toInsert);
    if (error) errors.push(error.message);
  }

  if (errors.length > 0) throw new Error(errors.join('; '));

  revalidatePath('/clients');
  return { inserted: toInsert.length, updated: toUpdate.length };
}

export async function updateSellerAgentConfig(
  sellerId: string,
  agentConfig: AgentConfig,
): Promise<{ error?: string }> {
  if (!supabaseServer) return { error: 'Base de datos no configurada.' };

  const { error } = await supabaseServer
    .from('sellers')
    .update({ agent_config: agentConfig })
    .eq('id', sellerId);

  if (error) return { error: error.message };

  revalidatePath(`/sellers/${sellerId}/agent`);
  revalidatePath('/sellers');
  return {};
}
