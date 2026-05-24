import { PassThrough } from 'node:stream';
import type { FastifyInstance } from 'fastify';
import { supabase } from '../services/supabase.js';
import { generateOpeningScript } from '../services/claude.js';
import type { SessionContext } from '../types.js';

export async function openingScriptRoute(app: FastifyInstance): Promise<void> {
  app.post('/opening-script', async (request, reply) => {
    const { clientId, productId, sellerId } = request.body as {
      clientId: string;
      productId: string;
      sellerId: string;
    };

    if (!clientId || !productId || !sellerId) {
      return reply.status(400).send({ error: 'clientId, productId y sellerId son requeridos.' });
    }

    const [clientRes, productRes, sellerRes, pastCallsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('products').select('*').eq('id', productId).single(),
      supabase.from('sellers').select('*').eq('id', sellerId).single(),
      supabase
        .from('calls')
        .select('id, ai_notes, outcome, created_at')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    if (clientRes.error || productRes.error || sellerRes.error) {
      return reply.status(404).send({ error: 'No se pudo cargar el contexto del cliente.' });
    }

    const context: SessionContext = {
      client: clientRes.data,
      product: productRes.data,
      seller: sellerRes.data,
      pastCalls: pastCallsRes.data ?? [],
    };

    const stream = new PassThrough();

    void generateOpeningScript(context, (chunk) => {
      stream.write(chunk);
    })
      .then(() => stream.end())
      .catch(() => stream.end());

    return reply
      .type('text/plain; charset=utf-8')
      .header('Cache-Control', 'no-cache')
      .header('X-Accel-Buffering', 'no')
      .send(stream);
  });
}
