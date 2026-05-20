import Anthropic from '@anthropic-ai/sdk';
import type { SessionContext, TranscriptEntry } from '../types.js';

const anthropic = new Anthropic();

export async function streamSuggestion(
  context: SessionContext,
  recentTranscript: TranscriptEntry[],
  clientUtterance: string,
  onChunk: (text: string) => void,
): Promise<string> {
  const { client, product, seller, pastCalls } = context;

  const pastCallsSummary =
    pastCalls.length > 0
      ? pastCalls
          .map(
            (c) =>
              `- ${new Date(c.created_at).toLocaleDateString('es-MX')}: ${c.ai_notes ?? 'Sin notas'} | Resultado: ${c.outcome ?? 'No registrado'}`,
          )
          .join('\n')
      : 'Esta es la primera llamada con este cliente.';

  const transcriptBlock = recentTranscript
    .slice(-12)
    .map((t) => `${t.speaker === 'seller' ? 'VENDEDOR' : 'CLIENTE'}: ${t.text}`)
    .join('\n');

  const systemPrompt = `Eres Orkesta, el mejor coach de ventas del mundo. Asistes a un vendedor durante una llamada en TIEMPO REAL.

CONTEXTO DEL CLIENTE:
- Nombre: ${client.name}
- Empresa: ${client.company} (${client.industry})
- Pain points: ${client.pain_points || 'No especificado'}
- Notas adicionales: ${client.notes || 'Ninguna'}

PRODUCTO A OFRECER:
- Nombre: ${product.name}
- Descripción: ${product.description}
- Características: ${product.features.join(', ')}
- Precio sugerido: $${product.suggested_price.toLocaleString()} MXN
- Precio mínimo aceptable: $${product.min_price.toLocaleString()} MXN (NUNCA ofrezcas menos)${product.pricing_model ? `\n- MODELO COMERCIAL COMPLETO:\n${product.pricing_model}` : ''}${client.current_plan ? `\n- PLAN ACTUAL DEL CLIENTE: ${JSON.stringify(client.current_plan, null, 2)}` : ''}

PERFIL DEL VENDEDOR:
${seller.coaching_notes || 'Sin notas de coaching previas.'}

HISTORIAL DE LLAMADAS CON ESTE CLIENTE:
${pastCallsSummary}

REGLAS:
1. Tu respuesta es el GUIÓN EXACTO que el vendedor debe decir, sin prefacio
2. Máximo 2 oraciones, directo al punto
3. Nunca sugieras precio menor a $${product.min_price.toLocaleString()} MXN
4. Adapta el tono: si el cliente es formal, responde formal; si es casual, casual
5. Responde en español`;

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Conversación reciente:\n${transcriptBlock}\n\nEl cliente acaba de decir: "${clientUtterance}"\n\n¿Qué debe decir el vendedor AHORA?`,
      },
    ],
  });

  let fullText = '';

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      fullText += event.delta.text;
      onChunk(event.delta.text);
    }
  }

  return fullText;
}

export async function generateCallSummary(transcript: TranscriptEntry[]): Promise<string> {
  const transcriptText = transcript
    .map((t) => `${t.speaker === 'seller' ? 'VENDEDOR' : 'CLIENTE'}: ${t.text}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Resume esta llamada de ventas en 4-5 puntos clave para el CRM. Incluye: interés del cliente, objeciones principales, acuerdos alcanzados y próximos pasos. Usa bullets.\n\nTranscripción:\n${transcriptText}`,
      },
    ],
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}
