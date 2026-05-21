import 'dotenv/config';
import Fastify from 'fastify';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { wsHandler } from './ws/handler.js';
import { ttsPreviewRoute } from './routes/tts-preview.js';

const server = Fastify({ logger: { level: 'info' } });

// Normalize origin: Railway env vars are sometimes set without the https:// prefix
const rawOrigin = process.env.ALLOWED_ORIGIN ?? '*';
const corsOrigin =
  rawOrigin !== '*' && !rawOrigin.startsWith('http') ? `https://${rawOrigin}` : rawOrigin;

await server.register(fastifyCors, {
  origin: corsOrigin,
});

await server.register(fastifyWebsocket);

server.register(async (app) => {
  app.get('/ws', { websocket: true }, wsHandler);
});

server.get('/health', () => ({ ok: true, timestamp: new Date().toISOString() }));

await server.register(ttsPreviewRoute);

const port = Number(process.env.PORT) || 3001;

try {
  await server.listen({ port, host: '0.0.0.0' });
  console.log(`[API] Listening on port ${port}`);
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
