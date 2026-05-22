import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { SessionContext, TranscriptEntry } from '../types.js';

const anthropic = new Anthropic();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured on this server.');
    }
    _openai = new OpenAI();
  }
  return _openai;
}

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';

function buildAgentSystemPrompt(context: SessionContext): string {
  const { client, product, seller, pastCalls } = context;
  const config = seller.agent_config;

  const personaName = config?.persona_name || seller.name || 'Agente';

  const pastCallsSummary =
    pastCalls.length > 0
      ? pastCalls
          .map(
            (c) =>
              `- ${new Date(c.created_at).toLocaleDateString('es-MX')}: ${c.ai_notes ?? 'Sin notas'} | Resultado: ${c.outcome ?? 'No registrado'}`,
          )
          .join('\n')
      : 'Esta es la primera conversación con este cliente.';

  return `Eres ${personaName}, un agente de ventas especializado. Estás hablando DIRECTAMENTE con ${client.name} de ${client.company} (${client.industry}).${config?.personality ? `\n\nTU PERSONALIDAD: ${config.personality}` : ''}${config?.sales_methodology ? `\nTU METODOLOGÍA DE VENTAS: ${config.sales_methodology}` : ''}

INFORMACIÓN DEL CLIENTE:
- Nombre: ${client.name}
- Empresa: ${client.company} (${client.industry})
- Pain points conocidos: ${client.pain_points || 'No especificados'}
- Notas: ${client.notes || 'Ninguna'}${client.current_plan ? `\n- Plan actual: ${JSON.stringify(client.current_plan)}` : ''}

PRODUCTO QUE OFRECES:
- Nombre: ${product.name}
- Descripción: ${product.description}
- Características: ${product.features.join(', ')}
- Precio sugerido: $${product.suggested_price.toLocaleString()} MXN
- Precio mínimo: $${product.min_price.toLocaleString()} MXN (nunca ofrezcas menos)${product.pricing_model ? `\n- Modelo comercial: ${product.pricing_model}` : ''}

HISTORIAL CON ESTE CLIENTE:
${pastCallsSummary}
${config?.forbidden_topics?.length ? `\nTEMAS PROHIBIDOS: ${config.forbidden_topics.join(', ')}` : ''}${config?.escalation_triggers?.length ? `\nSEÑALES DE CIERRE (cuando el cliente lo indique, propón cerrar): ${config.escalation_triggers.join(', ')}` : ''}

REGLAS:
1. Habla en primera persona, eres tú quien responde al cliente directamente
2. Máximo 2-3 oraciones, conciso y directo
3. Nunca ofrezcas precio menor a $${product.min_price.toLocaleString()} MXN
4. Adapta tu tono: ${config?.language_style === 'formal' ? 'formal y profesional' : config?.language_style === 'tecnico' ? 'técnico y preciso' : 'cercano y natural'}
5. Responde siempre en español`;
}

export async function streamAgentResponse(
  context: SessionContext,
  recentTranscript: TranscriptEntry[],
  clientUtterance: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const provider = context.seller.agent_config?.llm_provider ?? 'anthropic';
  const model = context.seller.agent_config?.llm_model ?? DEFAULT_ANTHROPIC_MODEL;

  const systemPrompt = buildAgentSystemPrompt(context);

  const transcriptBlock = recentTranscript
    .slice(-12)
    .map((t) => `${t.speaker === 'agent' ? 'TÚ (AGENTE)' : 'CLIENTE'}: ${t.text}`)
    .join('\n');

  const userMessage = `Conversación reciente:\n${transcriptBlock}\n\nEl cliente acaba de decir: "${clientUtterance}"\n\n¿Qué respondes tú como agente?`;

  if (provider === 'openai') {
    return streamOpenAI(model, systemPrompt, userMessage, onChunk, signal);
  }
  return streamAnthropic(model, systemPrompt, userMessage, onChunk, signal);
}

export async function generateIntroduction(context: SessionContext): Promise<string> {
  const { client, product, seller } = context;
  const config = seller.agent_config;
  const personaName = config?.persona_name || seller.name || 'Agente';
  const provider = config?.llm_provider ?? 'anthropic';
  const model = config?.llm_model ?? DEFAULT_ANTHROPIC_MODEL;

  const systemPrompt = buildAgentSystemPrompt(context);
  const userMessage = `Genera tu saludo inicial para comenzar la llamada con ${client.name}. Preséntate como ${personaName}, menciona brevemente el producto "${product.name}" y abre la conversación de forma natural. Máximo 2 oraciones.`;

  if (provider === 'openai') {
    return streamOpenAI(model, systemPrompt, userMessage, () => {});
  }
  return streamAnthropic(model, systemPrompt, userMessage, () => {});
}

async function streamAnthropic(
  model: string,
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let fullText = '';
  try {
    const stream = anthropic.messages.stream(
      {
        model,
        max_tokens: 250,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      },
      { signal },
    );

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text;
        onChunk(event.delta.text);
      }
    }
  } catch (err) {
    if (signal?.aborted) return fullText;
    throw err;
  }
  return fullText;
}

async function streamOpenAI(
  model: string,
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let fullText = '';
  try {
    const stream = await getOpenAI().chat.completions.create(
      {
        model,
        max_tokens: 250,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      },
      { signal },
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      if (delta) {
        fullText += delta;
        onChunk(delta);
      }
    }
  } catch (err) {
    if (signal?.aborted) return fullText;
    throw err;
  }
  return fullText;
}

export async function generateCallSummary(transcript: TranscriptEntry[]): Promise<string> {
  const transcriptText = transcript
    .map((t) => `${t.speaker === 'agent' ? 'AGENTE' : 'CLIENTE'}: ${t.text}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: DEFAULT_ANTHROPIC_MODEL,
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `Resume esta conversación de ventas en 4-5 puntos clave para el CRM. Incluye: interés del cliente, objeciones principales, acuerdos alcanzados y próximos pasos. Usa bullets.\n\nTranscripción:\n${transcriptText}`,
      },
    ],
  });

  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}
