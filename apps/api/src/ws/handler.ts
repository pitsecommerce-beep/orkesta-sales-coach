import type { FastifyRequest } from 'fastify';
import type { WebSocket } from '@fastify/websocket';
import { CallSession } from './session-manager.js';

export async function wsHandler(socket: WebSocket, _req: FastifyRequest) {
  const session = new CallSession(socket);

  console.log('[WS] Client connected');

  socket.on('message', async (data: Buffer | string, isBinary: boolean) => {
    try {
      await session.handleMessage(data, isBinary);
    } catch (err: unknown) {
      console.error('[WS] Message error:', err);
    }
  });

  socket.on('close', async () => {
    console.log('[WS] Client disconnected');
    await session.cleanup();
  });

  socket.on('error', (err: unknown) => {
    console.error('[WS] Socket error:', err);
  });
}
