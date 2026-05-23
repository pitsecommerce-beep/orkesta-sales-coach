'use client';

import { useRef, useState, useCallback } from 'react';
import type { ClientMessage, ServerMessage } from '@/lib/types';

interface UseCoachSocketOptions {
  onTranscript: (msg: Extract<ServerMessage, { type: 'transcript' }>) => void;
  onAgentChunk: (text: string) => void;
  onAgentResponse: (text: string) => void;
  onAgentResponseCancelled: () => void;
  onAgentIntro: (text: string) => void;
  onSessionStarted: (callId: string) => void;
  onSessionEnded: () => void;
  onError: (message: string) => void;
  onConnectError?: () => void;
  onScriptListening?: () => void;
  onScriptChunk?: (text: string) => void;
  onScriptReady?: (text: string) => void;
}

// Brief pause after TTS finishes before telling the backend to resume listening.
// Lets hardware audio buffers drain; mic is still active during this period.
const POST_SPEAK_COOLDOWN_MS = 600;

export function useCoachSocket({
  onTranscript,
  onAgentChunk,
  onAgentResponse,
  onAgentResponseCancelled,
  onAgentIntro,
  onSessionStarted,
  onSessionEnded,
  onError,
  onConnectError,
  onScriptListening,
  onScriptChunk,
  onScriptReady,
}: UseCoachSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const didOpenRef = useRef(false);
  const expectingAudioRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const postSpeakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stops any active TTS playback and signals the backend that speaking has ended.
  const stopTts = useCallback(() => {
    if (postSpeakTimerRef.current) clearTimeout(postSpeakTimerRef.current);
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch { /* already ended */ }
      activeSourceRef.current = null;
    }
    setIsSpeaking(false);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'tts_ended' }));
    }
  }, []);

  const connect = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      const url = process.env.NEXT_PUBLIC_API_WS_URL ?? 'ws://localhost:3001/ws';
      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';
      didOpenRef.current = false;

      ws.onopen = () => {
        didOpenRef.current = true;
        setIsConnected(true);
        resolve();
      };
      ws.onerror = () => {
        if (!didOpenRef.current) {
          onConnectError?.();
          reject(new Error('WebSocket connection failed'));
        }
      };
      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
      };

      ws.onmessage = (event: MessageEvent<ArrayBuffer | string>) => {
        // Binary frame: TTS audio payload
        if (event.data instanceof ArrayBuffer) {
          if (expectingAudioRef.current) {
            expectingAudioRef.current = false;
            const buffer = event.data.slice(0);
            (async () => {
              try {
                if (!audioCtxRef.current) {
                  audioCtxRef.current = new AudioContext();
                }
                const ctx = audioCtxRef.current;
                await ctx.resume();

                // Stop any currently-playing TTS before starting the new one
                if (activeSourceRef.current) {
                  try { activeSourceRef.current.stop(); } catch { /* already ended */ }
                  activeSourceRef.current = null;
                }

                const audioBuffer = await ctx.decodeAudioData(buffer);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                if (postSpeakTimerRef.current) clearTimeout(postSpeakTimerRef.current);
                setIsSpeaking(true);

                // Safety: resume listening after audio duration + buffer even if onended never fires
                const safetyTimer = setTimeout(() => {
                  setIsSpeaking(false);
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'tts_ended' }));
                  }
                }, audioBuffer.duration * 1000 + 2500);

                source.onended = () => {
                  clearTimeout(safetyTimer);
                  activeSourceRef.current = null;
                  postSpeakTimerRef.current = setTimeout(() => {
                    setIsSpeaking(false);
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({ type: 'tts_ended' }));
                    }
                  }, POST_SPEAK_COOLDOWN_MS);
                };

                source.start();
                activeSourceRef.current = source;
              } catch (err) {
                console.error('[Audio playback]', err);
                setIsSpeaking(false);
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({ type: 'tts_ended' }));
                }
              }
            })();
          }
          return;
        }

        let msg: ServerMessage;
        try {
          msg = JSON.parse(event.data) as ServerMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case 'transcript':
            onTranscript(msg);
            break;
          case 'agent_chunk':
            onAgentChunk(msg.text);
            break;
          case 'agent_response':
            onAgentResponse(msg.text);
            break;
          case 'agent_response_cancelled':
            onAgentResponseCancelled();
            break;
          case 'agent_intro':
            onAgentIntro(msg.text);
            break;
          case 'agent_audio_ready':
            expectingAudioRef.current = true;
            break;
          case 'barge_in':
            // User spoke while agent was talking — stop TTS immediately
            stopTts();
            break;
          case 'session_started':
            // Pre-warm AudioContext so the first TTS doesn't pay initialization cost.
            // session_started fires from a user-initiated action, so resume() is allowed.
            if (!audioCtxRef.current) {
              try {
                audioCtxRef.current = new AudioContext();
                audioCtxRef.current.resume().catch(() => { /* browser may defer until gesture */ });
              } catch { /* ignore */ }
            }
            onSessionStarted(msg.callId);
            break;
          case 'session_ended':
            onSessionEnded();
            break;
          case 'error':
            onError(msg.message);
            break;
          case 'script_listening':
            onScriptListening?.();
            break;
          case 'script_chunk':
            onScriptChunk?.(msg.text);
            break;
          case 'script_ready':
            onScriptReady?.(msg.text);
            break;
        }
      };

      wsRef.current = ws;
    });
  }, [onTranscript, onAgentChunk, onAgentResponse, onAgentResponseCancelled, onAgentIntro, onSessionStarted, onSessionEnded, onError, onConnectError, stopTts, onScriptListening, onScriptChunk, onScriptReady]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  // Mic is always active — never muted. Deepgram connection stays alive.
  // Echo suppression is handled on the backend via isAgentSpeaking + content detection.
  const sendAudio = useCallback((chunk: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(chunk);
    }
  }, []);

  const sendMessage = useCallback((msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { isConnected, isSpeaking, connect, disconnect, sendAudio, sendMessage };
}
