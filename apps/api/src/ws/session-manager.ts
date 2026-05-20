import type { WebSocket } from '@fastify/websocket';
import type { LiveClient } from '@deepgram/sdk';
import { createDeepgramStream, type DeepgramWord } from '../services/deepgram.js';
import { streamSuggestion, generateCallSummary } from '../services/claude.js';
import { supabase } from '../services/supabase.js';
import type { SessionContext, TranscriptEntry, ClientMessage, ServerMessage } from '../types.js';

export class CallSession {
  private context: SessionContext | null = null;
  private transcript: TranscriptEntry[] = [];
  private callId: string | null = null;
  private deepgramConn: LiveClient | null = null;
  private sellerSpeakerId = 0;
  private isGeneratingSuggestion = false;

  constructor(private readonly ws: WebSocket) {}

  async handleMessage(raw: Buffer | string) {
    // Binary = audio chunk → forward to Deepgram
    if (Buffer.isBuffer(raw)) {
      // Convert Node Buffer to ArrayBuffer for Deepgram SDK compatibility
      const ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
      this.deepgramConn?.send(ab);
      return;
    }

    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case 'start_session':
        await this.startSession(msg.clientId, msg.productId, msg.sellerId);
        break;
      case 'end_session':
        await this.endSession();
        break;
      case 'set_seller_speaker':
        this.sellerSpeakerId = msg.speakerId;
        break;
    }
  }

  private async startSession(clientId: string, productId: string, sellerId: string) {
    try {
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

      if (clientRes.error) throw clientRes.error;
      if (productRes.error) throw productRes.error;
      if (sellerRes.error) throw sellerRes.error;

      this.context = {
        client: clientRes.data,
        product: productRes.data,
        seller: sellerRes.data,
        pastCalls: pastCallsRes.data ?? [],
      };

      const { data: call, error: callError } = await supabase
        .from('calls')
        .insert({ client_id: clientId, product_id: productId, seller_id: sellerId, status: 'active' })
        .select()
        .single();

      if (callError) throw callError;
      this.callId = call.id as string;

      this.startDeepgram();
      this.send({ type: 'session_started', callId: this.callId });
    } catch (err) {
      console.error('[Session] Failed to start:', err);
      this.send({ type: 'error', message: 'Error al iniciar la sesión. Verifica la configuración.' });
    }
  }

  private startDeepgram() {
    this.deepgramConn = createDeepgramStream(
      (transcript, words, isFinal) => this.onTranscript(transcript, words, isFinal),
      (err) => this.send({ type: 'error', message: `Transcripción: ${err.message}` }),
      () => console.log('[Session] Deepgram closed'),
    );
  }

  private async onTranscript(transcript: string, words: DeepgramWord[], isFinal: boolean) {
    if (!transcript.trim()) return;

    // Determine speaker from first word with a speaker label
    const speakerId = words.find((w) => w.speaker !== undefined)?.speaker ?? this.sellerSpeakerId;
    const isClient = speakerId !== this.sellerSpeakerId;
    const speaker: 'seller' | 'client' = isClient ? 'client' : 'seller';

    this.send({
      type: 'transcript',
      text: transcript,
      speaker,
      speakerId,
      isFinal,
      timestamp: Date.now(),
    });

    if (isFinal) {
      const entry: TranscriptEntry = { speaker, text: transcript, timestamp: Date.now() };
      this.transcript.push(entry);

      // Generate coaching suggestion only when client finishes speaking
      if (isClient && !this.isGeneratingSuggestion && this.context) {
        await this.generateSuggestion(transcript);
      }
    }
  }

  private async generateSuggestion(clientUtterance: string) {
    if (!this.context) return;
    this.isGeneratingSuggestion = true;

    try {
      const fullText = await streamSuggestion(
        this.context,
        this.transcript,
        clientUtterance,
        (chunk) => this.send({ type: 'suggestion_chunk', text: chunk }),
      );

      if (fullText) {
        this.send({ type: 'suggestion_complete', text: fullText });
      }
    } catch (err) {
      console.error('[Session] Claude error:', err);
    } finally {
      this.isGeneratingSuggestion = false;
    }
  }

  private async endSession() {
    this.deepgramConn?.finish();
    this.deepgramConn = null;

    if (this.callId && this.transcript.length > 0) {
      try {
        const aiNotes = await generateCallSummary(this.transcript);
        await supabase.from('calls').update({
          status: 'completed',
          transcript: this.transcript,
          ai_notes: aiNotes,
          ended_at: new Date().toISOString(),
        }).eq('id', this.callId);
      } catch (err) {
        console.error('[Session] Failed to save call:', err);
      }
    } else if (this.callId) {
      await supabase.from('calls').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', this.callId);
    }

    this.send({ type: 'session_ended' });
  }

  async cleanup() {
    this.deepgramConn?.finish();
    if (this.callId) {
      await supabase
        .from('calls')
        .update({ status: 'failed', ended_at: new Date().toISOString() })
        .eq('id', this.callId)
        .eq('status', 'active');
    }
  }

  private send(msg: ServerMessage) {
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
