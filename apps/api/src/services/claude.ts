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
  maxTokens = 250,
): Promise<string> {
  let fullText = '';
  try {
    const stream = anthropic.messages.stream(
      {
        model,
        max_tokens: maxTokens,
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
  maxTokens = 250,
): Promise<string> {
  let fullText = '';
  try {
    const stream = await getOpenAI().chat.completions.create(
      {
        model,
        max_tokens: maxTokens,
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

export async function generateOpeningScript(
  context: SessionContext,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { client, product, seller, pastCalls } = context;
  const config = seller.agent_config;
  const personaName = config?.persona_name || seller.name || 'Vendedor';
  const provider = config?.llm_provider ?? 'anthropic';
  const model = config?.llm_model ?? DEFAULT_ANTHROPIC_MODEL;

  const pastCallsSummary =
    pastCalls.length > 0
      ? pastCalls
          .map(
            (c) =>
              `- ${new Date(c.created_at).toLocaleDateString('es-MX')}: ${c.ai_notes ?? 'Sin notas'} | Resultado: ${c.outcome ?? 'No registrado'}`,
          )
          .join('\n')
      : null;

  const systemPrompt = `Eres un coach de ventas experto. Tu trabajo es generar guiones de venta detallados, naturales y listos para ejecutar.

VENDEDOR: ${personaName}${config?.sales_methodology ? `\nMETODOLOGÍA: ${config.sales_methodology}` : ''}
TONO: ${config?.language_style === 'formal' ? 'formal y profesional' : config?.language_style === 'tecnico' ? 'técnico y preciso' : 'cercano y natural'}
${config?.forbidden_topics?.length ? `TEMAS A EVITAR: ${config.forbidden_topics.join(', ')}` : ''}
PRODUCTO: ${product.name} — ${product.description}
- Características: ${product.features.join(', ')}
- Precio sugerido: $${product.suggested_price.toLocaleString()} MXN | Mínimo: $${product.min_price.toLocaleString()} MXN${product.pricing_model ? `\n- Modelo comercial: ${product.pricing_model}` : ''}`;

  const userMessage = `Genera el guion de apertura completo para una llamada de ventas de ${personaName} con:

CLIENTE: ${client.name}
EMPRESA: ${client.company} (${client.industry})
PAIN POINTS CONOCIDOS: ${client.pain_points || 'No especificados'}
NOTAS: ${client.notes || 'Ninguna'}${client.current_plan ? `\nPLAN ACTUAL: ${JSON.stringify(client.current_plan)}` : ''}
${pastCallsSummary ? `\nHISTORIAL DE LLAMADAS ANTERIORES:\n${pastCallsSummary}` : ''}

Genera el guion con EXACTAMENTE este formato (sin variaciones, sin texto extra):

**APERTURA**
[Saludo y presentación inicial, 2-3 oraciones naturales. Menciona el nombre del cliente y abre con algo relevante a su contexto]

**PREGUNTAS DE DESCUBRIMIENTO**
[3-4 preguntas abiertas para profundizar en sus necesidades. Deben fluir naturalmente]
• [Pregunta 1]
• [Pregunta 2]
• [Pregunta 3]
• [Pregunta 4 si aplica]

**PROPUESTA DE VALOR**
[Cómo presentar el producto conectando sus características con los pain points específicos de este cliente. 3-4 oraciones]

**OBJECIONES PROBABLES**
• [Objeción más probable]: [Respuesta concreta de 1-2 oraciones]
• [Segunda objeción probable]: [Respuesta concreta de 1-2 oraciones]

**CIERRE**
[Frase o pregunta de cierre específica para este cliente, orientada al siguiente paso concreto]`;

  if (provider === 'openai') {
    return streamOpenAI(model, systemPrompt, userMessage, onChunk, signal, 900);
  }
  return streamAnthropic(model, systemPrompt, userMessage, onChunk, signal, 900);
}

export async function generateSalesScript(
  context: SessionContext,
  recentTranscript: TranscriptEntry[],
  clientUtterance: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const { client, product, seller } = context;
  const config = seller.agent_config;
  const personaName = config?.persona_name || seller.name || 'Vendedor';
  const provider = config?.llm_provider ?? 'anthropic';
  const model = config?.llm_model ?? DEFAULT_ANTHROPIC_MODEL;

  const systemPrompt = `Eres un coach de ventas experto. Tu trabajo es guiar al vendedor ${personaName} en tiempo real durante una llamada con un cliente.

PRODUCTO:
- Nombre: ${product.name}
- Descripción: ${product.description}
- Características clave: ${product.features.join(', ')}
- Precio sugerido: $${product.suggested_price.toLocaleString()} MXN | Mínimo: $${product.min_price.toLocaleString()} MXN${product.pricing_model ? `\n- Modelo comercial: ${product.pricing_model}` : ''}
${config?.sales_methodology ? `\nMETODOLOGÍA DE VENTAS: ${config.sales_methodology}` : ''}
CLIENTE:
- Nombre: ${client.name} | Empresa: ${client.company} (${client.industry})
- Pain points: ${client.pain_points || 'No especificados'}
- Notas: ${client.notes || 'Ninguna'}${client.current_plan ? `\n- Plan actual: ${JSON.stringify(client.current_plan)}` : ''}
${config?.forbidden_topics?.length ? `\nTEMAS A EVITAR: ${config.forbidden_topics.join(', ')}` : ''}
REGLAS DEL GUION:
- El vendedor habla en español, tono ${config?.language_style === 'formal' ? 'formal y profesional' : config?.language_style === 'tecnico' ? 'técnico y preciso' : 'cercano y natural'}
- El guion debe ser listo para leer casi palabra por palabra
- Nunca sugerir precio menor a $${product.min_price.toLocaleString()} MXN
- Máximo 3 puntos clave, concisos y accionables`;

  const transcriptBlock = recentTranscript
    .slice(-8)
    .map((t) => `${t.speaker === 'agent' ? 'VENDEDOR' : 'CLIENTE'}: ${t.text}`)
    .join('\n');

  const userMessage = `${transcriptBlock ? `CONVERSACIÓN RECIENTE:\n${transcriptBlock}\n\n` : ''}EL CLIENTE ACABA DE DECIR:\n"${clientUtterance}"\n\nGenera el guion con EXACTAMENTE este formato (sin variaciones):\n\n**LO QUE EL CLIENTE QUIERE**\n[1 oración: qué necesita o le preocupa]\n\n**DI ESTO AHORA**\n[Guion exacto, 2-3 oraciones naturales y conversacionales que el vendedor puede decir de inmediato]\n\n**PUNTOS CLAVE**\n• [punto 1]\n• [punto 2]\n• [punto 3 si aplica]\n\n**CIERRE / MANEJO**\n[Si hay objeción evidente: cómo manejarla con una frase concreta. Si no: próximo paso específico a proponer]`;

  if (provider === 'openai') {
    return streamOpenAI(model, systemPrompt, userMessage, onChunk, signal, 700);
  }
  return streamAnthropic(model, systemPrompt, userMessage, onChunk, signal, 700);
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
