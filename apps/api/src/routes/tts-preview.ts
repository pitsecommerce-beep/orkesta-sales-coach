import type { FastifyInstance } from 'fastify';
import { synthesizeSpeech } from '../services/tts.js';

export async function ttsPreviewRoute(app: FastifyInstance): Promise<void> {
  app.get('/tts-preview', async (request, reply) => {
    const { text = 'Hola, soy tu asistente de ventas Orkesta.', voice = 'aura-asteria-es' } =
      request.query as { text?: string; voice?: string };

    const audioBuffer = await synthesizeSpeech(text.slice(0, 200), voice);

    return reply
      .header('Content-Type', 'audio/mpeg')
      .header('Cache-Control', 'no-cache')
      .send(audioBuffer);
  });
}
