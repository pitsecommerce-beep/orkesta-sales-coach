'use client';

import { useRef, useState, useCallback } from 'react';
import type { ClientMessage, ServerMessage } from '@/lib/types';

interface UseCoachSocketOptions {
  onTranscript: (msg: Extract<ServerMessage, { type: 'transcript' }>) => void;
  onAgentChunk: (text: string) => void;
  onAgentResponse: (text: string) => void;
  onAgentIntro: (text: string) => void;
  onSessionStarted: (callId: string) => void;
  onSessionEnded: () => void;
  onError: (message: string) => void;
  onConnectError?: () => void;
}

// How long to keep the mic paused after TTS finishes to prevent late echo pickup.
// Needs to be long enough for speaker hardware buffers to drain completely.
const POST_SPEAK_COOLDOWN_MS = 1200;

export function useCoachSocket({
  onTranscript,
  onAgentChunk,
  onAgentResponse,
  onAgentIntro,
  onSessionStarted,
  onSessionEnded,
  onError,
  onConnectError,
}: UseCoachSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const didOpenRef = useRef(false);
  const expectingAudioRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Ref-based speaking flag so sendAudio never has a stale closure
  const isSpeakingRef = useRef(false);
  const postSpeakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

                if (activeSourceRef.current) {
                  try {
                    activeSourceRef.current.stop();
                  } catch {
                    // source may have already ended
                  }
                  activeSourceRef.current = null;
                }

                const audioBuffer = await ctx.decodeAudioData(buffer);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                // Mark speaking: mic will be muted until cooldown expires
                if (postSpeakTimerRef.current) clearTimeout(postSpeakTimerRef.current);
                isSpeakingRef.current = true;
                setIsSpeaking(true);

                const resumeListening = () => {
                  if (postSpeakTimerRef.current) clearTimeout(postSpeakTimerRef.current);
                  postSpeakTimerRef.current = setTimeout(() => {
                    isSpeakingRef.current = false;
                    setIsSpeaking(false);
                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                      wsRef.current.send(JSON.stringify({ type: 'tts_ended' }));
                    }
                  }, POST_SPEAK_COOLDOWN_MS);
                };

                // Safety timeout: resume listening even if onended never fires
                const safetyTimer = setTimeout(
                  resumeListening,
                  audioBuffer.duration * 1000 + 2500,
                );

                source.onended = () => {
                  clearTimeout(safetyTimer);
                  activeSourceRef.current = null;
                  resumeListening();
                };

                source.start();
                activeSourceRef.current = source;
              } catch (err) {
                console.error('[Audio playback]', err);
                isSpeakingRef.current = false;
                setIsSpeaking(false);
                // Notify backend so it doesn't stay blocked waiting for tts_ended
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
          case 'agent_intro':
            onAgentIntro(msg.text);
            break;
          case 'agent_audio_ready':
            expectingAudioRef.current = true;
            break;
          case 'session_started':
            onSessionStarted(msg.callId);
            break;
          case 'session_ended':
            onSessionEnded();
            break;
          case 'error':
            onError(msg.message);
            break;
        }
      };

      wsRef.current = ws;
    });
  }, [onTranscript, onAgentChunk, onAgentResponse, onAgentIntro, onSessionStarted, onSessionEnded, onError, onConnectError]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  // Drops audio chunks while agent TTS is playing to prevent self-echo
  const sendAudio = useCallback((chunk: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN && !isSpeakingRef.current) {
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
