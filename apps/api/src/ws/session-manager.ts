import type { WebSocket } from '@fastify/websocket';
import type { LiveClient } from '@deepgram/sdk';
import { createDeepgramStream, type DeepgramWord } from '../services/deepgram.js';
import { streamAgentResponse, generateIntroduction, generateCallSummary } from '../services/claude.js';
import { synthesizeSpeech } from '../services/tts.js';
import { supabase } from '../services/supabase.js';
import type { SessionContext, TranscriptEntry, ClientMessage, ServerMessage } from '../types.js';

export class CallSession {
  private context: SessionContext | null = null;
  private transcript: TranscriptEntry[] = [];
  private callId: string | null = null;
  private deepgramConn: LiveClient | null = null;
  private isGeneratingResponse = false;
  // Accumulates speech_final segments until UtteranceEnd confirms turn is over
  private pendingUtterance: string[] = [];
  // True while agent TTS audio is being played — used to discard echo transcripts
  private isAgentSpeaking = false;

  constructor(private readonly ws: WebSocket) {}

  async handleMessage(raw: Buffer | string, isBinary = false) {
    if (isBinary) {
      if (!this.deepgramConn) {
        console.warn('[Session] Audio received but no Deepgram session active — start_session may not have been received');
      }
      const buf = raw instanceof Buffer ? raw : Buffer.from(raw as string, 'binary');
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      this.deepgramConn?.send(ab);
      return;
    }

    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw.toString()) as ClientMessage;
    } catch {
      console.warn('[Session] Received unparseable message:', raw.toString().slice(0, 100));
      return;
    }

    console.log('[Session] Message received:', msg.type);

    switch (msg.type) {
      case 'start_session':
        await this.startSession(msg.clientId, msg.productId, msg.sellerId);
        break;
      case 'end_session':
        await this.endSession();
        break;
      case 'tts_ended':
        // Frontend signals TTS playback finished — agent can listen again
        this.isAgentSpeaking = false;
        console.log('[Session] TTS playback ended, resuming listening');
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
      console.log('[Session] Started successfully, callId:', this.callId);
      this.send({ type: 'session_started', callId: this.callId });

      // Agent introduces itself immediately after session starts
      this.sendAgentIntroduction().catch((err: unknown) => console.error('[Intro]', err));
    } catch (err) {
      console.error('[Session] Failed to start:', err);
      this.send({ type: 'error', message: 'Error al iniciar la sesión. Verifica la configuración.' });
    }
  }

  private async sendAgentIntroduction() {
    if (!this.context) return;
    try {
      const introText = await generateIntroduction(this.context);
      if (!introText) return;

      const entry: TranscriptEntry = { speaker: 'agent', text: introText, timestamp: Date.now() };
      this.transcript.push(entry);

      this.send({ type: 'agent_intro', text: introText });

      const voice = this.context.seller.agent_config?.tts_voice ?? 'aura-asteria-es';
      await this.sendTtsAudio(introText, voice);
    } catch (err) {
      console.error('[Session] Failed to generate intro:', err);
    }
  }

  private startDeepgram() {
    this.deepgramConn = createDeepgramStream(
      (transcript, words, isFinal) => this.onTranscript(transcript, words, isFinal),
      () => this.onUtteranceEnd(),
      (err) => this.send({ type: 'error', message: `Transcripción: ${err.message}` }),
      () => console.log('[Session] Deepgram closed'),
    );
  }

  private async onTranscript(transcript: string, _words: DeepgramWord[], isFinal: boolean) {
    if (!transcript.trim()) return;

    // Discard anything transcribed while agent is speaking — it's echo
    if (this.isAgentSpeaking) return;

    // Send to frontend for live display
    this.send({
      type: 'transcript',
      text: transcript,
      speaker: 'client',
      isFinal,
      timestamp: Date.now(),
    });

    if (isFinal) {
      const entry: TranscriptEntry = { speaker: 'client', text: transcript, timestamp: Date.now() };
      this.transcript.push(entry);
      // Accumulate speech_final segments — response fires only on UtteranceEnd
      this.pendingUtterance.push(transcript);
    }
  }

  // Called by Deepgram after utterance_end_ms of silence — the real end-of-turn signal
  private async onUtteranceEnd() {
    // If agent is still speaking, discard any echo that leaked through
    if (this.isAgentSpeaking) {
      this.pendingUtterance = [];
      return;
    }

    if (this.pendingUtterance.length === 0 || this.isGeneratingResponse || !this.context) {
      this.pendingUtterance = [];
      return;
    }

    const fullUtterance = this.pendingUtterance.join(' ').trim();
    this.pendingUtterance = [];

    await this.generateAgentResponse(fullUtterance);
  }

  private async generateAgentResponse(clientUtterance: string) {
    if (!this.context) return;
    this.isGeneratingResponse = true;

    try {
      const fullText = await streamAgentResponse(
        this.context,
        this.transcript,
        clientUtterance,
        (chunk) => this.send({ type: 'agent_chunk', text: chunk }),
      );

      if (fullText) {
        const entry: TranscriptEntry = { speaker: 'agent', text: fullText, timestamp: Date.now() };
        this.transcript.push(entry);

        this.send({ type: 'agent_response', text: fullText });

        this.send({
          type: 'transcript',
          text: fullText,
          speaker: 'agent',
          isFinal: true,
          timestamp: entry.timestamp,
        });

        const voice = this.context?.seller.agent_config?.tts_voice ?? 'aura-asteria-es';
        this.sendTtsAudio(fullText, voice).catch((err: unknown) => console.error('[TTS]', err));
      }
    } catch (err) {
      console.error('[Session] Agent response error:', err);
    } finally {
      this.isGeneratingResponse = false;
    }
  }

  private async sendTtsAudio(text: string, voice: string): Promise<void> {
    this.isAgentSpeaking = true;
    const audioBuffer = await synthesizeSpeech(text, voice);
    this.send({ type: 'agent_audio_ready' });
    if (this.ws.readyState === 1) {
      this.ws.send(audioBuffer);
    }
    // isAgentSpeaking is cleared when frontend sends tts_ended
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
