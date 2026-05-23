import type { WebSocket } from '@fastify/websocket';
import type { LiveClient } from '@deepgram/sdk';
import { createDeepgramStream, type DeepgramWord } from '../services/deepgram.js';
import { streamAgentResponse, generateIntroduction, generateCallSummary, generateSalesScript } from '../services/claude.js';
import { synthesizeSpeech } from '../services/tts.js';
import { supabase } from '../services/supabase.js';
import type { SessionContext, TranscriptEntry, ClientMessage, ServerMessage } from '../types.js';

export class CallSession {
  private context: SessionContext | null = null;
  private transcript: TranscriptEntry[] = [];
  private callId: string | null = null;
  private deepgramConn: LiveClient | null = null;
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;
  private isGeneratingResponse = false;
  private currentResponseController: AbortController | null = null;
  // Accumulates speech_final segments until UtteranceEnd confirms turn is over
  private pendingUtterance: string[] = [];
  // True while agent TTS audio is being played — used to discard echo transcripts
  private isAgentSpeaking = false;
  // Last few agent responses, used for content-based echo detection
  private recentAgentTexts: string[] = [];
  // Set during intentional teardown so the close handler doesn't reconnect
  private isShuttingDown = false;
  // 'agent': AI responds automatically | 'script': AI generates a coaching script for the human
  private sessionMode: 'agent' | 'script' = 'agent';
  // True when the salesperson pressed the listen button and we're waiting for the client's next utterance
  private scriptListenArmed = false;
  private isGeneratingScript = false;

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

    switch (msg.type) {
      case 'start_session':
        await this.startSession(msg.clientId, msg.productId, msg.sellerId);
        break;
      case 'end_session':
        await this.endSession();
        break;
      case 'tts_ended':
        this.isAgentSpeaking = false;
        break;
      case 'set_mode':
        this.sessionMode = msg.mode;
        if (msg.mode === 'agent') {
          this.scriptListenArmed = false;
        }
        if (this.isGeneratingResponse) {
          this.interruptCurrentResponse();
        }
        break;
      case 'start_script_listen':
        if (!this.isGeneratingScript) {
          this.scriptListenArmed = true;
          this.pendingUtterance = [];
          this.send({ type: 'script_listening' });
        }
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
      console.log('[Session] Started, callId:', this.callId);
      this.send({ type: 'session_started', callId: this.callId });

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
      this.recentAgentTexts = [introText, ...this.recentAgentTexts].slice(0, 3);

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
      () => {
        console.log('[Session] Deepgram closed');
        this.deepgramConn = null;
        // Reconnect automatically if the session is still alive (unexpected drop)
        if (!this.isShuttingDown && this.callId && this.ws.readyState === 1) {
          console.log('[Session] Reconnecting Deepgram...');
          this.startDeepgram();
        }
      },
    );

    // KeepAlive every 8s prevents Deepgram from closing during quiet periods
    this.keepAliveInterval = setInterval(() => {
      try { this.deepgramConn?.keepAlive(); } catch { /* ignore */ }
    }, 8000);
  }

  private async onTranscript(transcript: string, _words: DeepgramWord[], isFinal: boolean) {
    if (!transcript.trim()) return;

    if (this.isAgentSpeaking) {
      // Echo check: content matches recent agent speech → discard silently
      if (this.isAgentEcho(transcript)) return;

      // Non-echo speech while agent is talking → barge-in
      // Only act on final segments with enough content to be intentional
      if (isFinal && transcript.trim().length >= 8) {
        console.log('[Session] Barge-in:', transcript.slice(0, 60));
        this.isAgentSpeaking = false;
        this.send({ type: 'barge_in' });
        // Fall through to process as normal client speech
      } else {
        return;
      }
    } else {
      // Content-based echo detection after speaking flag cleared (hardware reverb)
      if (isFinal && this.isAgentEcho(transcript)) {
        console.log('[Session] Late echo discarded:', transcript.slice(0, 60));
        return;
      }
    }

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
      this.pendingUtterance.push(transcript);

      // Client is still speaking while we were already generating — cancel stale response
      if (this.isGeneratingResponse) {
        this.interruptCurrentResponse();
      }
    }
  }

  // Aborts the in-flight LLM stream so we can regenerate once the client truly finishes.
  private interruptCurrentResponse() {
    const controller = this.currentResponseController;
    if (!controller) return;
    console.log('[Session] Client still speaking — interrupting stale response');
    controller.abort();
    this.currentResponseController = null;
    this.isGeneratingResponse = false;
    this.send({ type: 'agent_response_cancelled' });
  }

  // Returns true when text looks like a fragment of the agent's own recent speech.
  private isAgentEcho(text: string): boolean {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[¿¡.,!?;:«»]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const normText = normalize(text);
    // Short responses ("sí", "ok", "entendido", etc.) are never echo — only check
    // substantial transcripts that could realistically be a re-capture of TTS audio.
    if (normText.length < 25) return false;

    for (const agentText of this.recentAgentTexts) {
      const normAgent = normalize(agentText);
      // Require the two texts to be of similar length before doing substring checks.
      // This prevents common short user phrases (e.g. "para conocer cómo")
      // from being falsely flagged just because they appear inside a long agent sentence.
      const minLen = Math.min(normText.length, normAgent.length);
      const maxLen = Math.max(normText.length, normAgent.length);
      if (minLen / maxLen < 0.5) continue;
      if (normAgent.includes(normText) || normText.includes(normAgent)) return true;
      if (normText.length >= 15 && normAgent.includes(normText.slice(0, 20))) return true;
    }
    return false;
  }

  // Called by Deepgram after utterance_end_ms of silence — real end-of-turn signal.
  private async onUtteranceEnd() {
    if (this.isAgentSpeaking) {
      this.pendingUtterance = [];
      return;
    }

    if (this.pendingUtterance.length === 0 || !this.context) {
      this.pendingUtterance = [];
      return;
    }

    const fullUtterance = this.pendingUtterance.join(' ').trim();
    this.pendingUtterance = [];

    if (this.sessionMode === 'script') {
      if (this.scriptListenArmed && !this.isGeneratingScript) {
        this.scriptListenArmed = false;
        await this.generateScript(fullUtterance);
      }
      // In script mode but not armed: transcript is still shown, no response generated
    } else {
      if (!this.isGeneratingResponse) {
        await this.generateAgentResponse(fullUtterance);
      }
    }
  }

  private async generateScript(clientUtterance: string) {
    if (!this.context) return;
    this.isGeneratingScript = true;
    try {
      const fullText = await generateSalesScript(
        this.context,
        this.transcript,
        clientUtterance,
        (chunk) => {
          this.send({ type: 'script_chunk', text: chunk });
        },
      );
      if (fullText) {
        this.send({ type: 'script_ready', text: fullText });
      }
    } catch (err) {
      console.error('[Session] Script generation error:', err);
      this.send({ type: 'error', message: 'Error al generar el guion de ventas.' });
    } finally {
      this.isGeneratingScript = false;
    }
  }

  private async generateAgentResponse(clientUtterance: string) {
    if (!this.context) return;

    const controller = new AbortController();
    this.currentResponseController = controller;
    this.isGeneratingResponse = true;

    const voice = this.context.seller.agent_config?.tts_voice ?? 'aura-asteria-es';
    let pendingText = '';
    const ttsTasks: Array<Promise<Buffer>> = [];

    // Kick off TTS synthesis for a sentence segment as soon as it's complete,
    // so Deepgram processes it in parallel while Claude generates the rest.
    const flushSentence = (text: string) => {
      const trimmed = text.trim();
      if (trimmed) ttsTasks.push(synthesizeSpeech(trimmed, voice));
    };

    // Matches the first complete sentence (non-greedy up to .!?; then optional whitespace).
    const sentenceRe = /^(.*?[.!?;]+)(\s|$)/;

    try {
      const fullText = await streamAgentResponse(
        this.context,
        this.transcript,
        clientUtterance,
        (chunk) => {
          if (!controller.signal.aborted) {
            this.send({ type: 'agent_chunk', text: chunk });
            pendingText += chunk;
            // Extract and flush every complete sentence found so far
            let m: RegExpExecArray | null;
            while ((m = sentenceRe.exec(pendingText)) !== null) {
              flushSentence(m[1]);
              pendingText = pendingText.slice(m[1].length + m[2].length).trimStart();
            }
          }
        },
        controller.signal,
      );

      // Cancelled mid-stream — discard result, don't save or send anything
      if (controller.signal.aborted) return;

      if (fullText) {
        const entry: TranscriptEntry = { speaker: 'agent', text: fullText, timestamp: Date.now() };
        this.transcript.push(entry);
        this.recentAgentTexts = [fullText, ...this.recentAgentTexts].slice(0, 3);

        this.send({ type: 'agent_response', text: fullText });

        this.send({
          type: 'transcript',
          text: fullText,
          speaker: 'agent',
          isFinal: true,
          timestamp: entry.timestamp,
        });

        // Flush any trailing text that didn't end with a sentence boundary
        flushSentence(pendingText);

        this.sendTtsFromTasks(ttsTasks, fullText).catch((err: unknown) => console.error('[TTS]', err));
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('[Session] Agent response error:', err);
    } finally {
      // Only reset if this controller is still active — a new response may have started
      if (this.currentResponseController === controller) {
        this.isGeneratingResponse = false;
        this.currentResponseController = null;
      }
    }
  }

  // Awaits all sentence-level TTS tasks (started in parallel), concatenates their
  // MP3 buffers, and sends the combined audio to the client.
  private async sendTtsFromTasks(tasks: Array<Promise<Buffer>>, fullText: string): Promise<void> {
    this.isAgentSpeaking = true;
    try {
      const buffers = await Promise.all(tasks);
      const audioBuffer = Buffer.concat(buffers);
      this.send({ type: 'agent_audio_ready' });
      if (this.ws.readyState === 1) {
        this.ws.send(audioBuffer);
      }
      const safetyMs = Math.min(30000, Math.max(5000, fullText.length * 80 + 3000));
      setTimeout(() => { this.isAgentSpeaking = false; }, safetyMs);
    } catch (err) {
      this.isAgentSpeaking = false;
      throw err;
    }
  }

  private async sendTtsAudio(text: string, voice: string): Promise<void> {
    this.isAgentSpeaking = true;
    try {
      const audioBuffer = await synthesizeSpeech(text, voice);
      this.send({ type: 'agent_audio_ready' });
      if (this.ws.readyState === 1) {
        this.ws.send(audioBuffer);
      }
      const safetyMs = Math.min(30000, Math.max(5000, text.length * 80 + 3000));
      setTimeout(() => { this.isAgentSpeaking = false; }, safetyMs);
    } catch (err) {
      this.isAgentSpeaking = false;
      throw err;
    }
  }

  private async endSession() {
    this.isShuttingDown = true;
    this.stopKeepAlive();
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
    this.isShuttingDown = true;
    this.stopKeepAlive();
    this.deepgramConn?.finish();
    this.deepgramConn = null;
    if (this.callId) {
      await supabase
        .from('calls')
        .update({ status: 'failed', ended_at: new Date().toISOString() })
        .eq('id', this.callId)
        .eq('status', 'active');
    }
  }

  private stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private send(msg: ServerMessage) {
    if (this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
