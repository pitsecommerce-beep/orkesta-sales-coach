'use client';

import { useRef, useState, useCallback } from 'react';
import type { ClientMessage, ServerMessage } from '@/lib/types';

interface UseCoachSocketOptions {
  onTranscript: (msg: Extract<ServerMessage, { type: 'transcript' }>) => void;
  onSuggestionChunk: (text: string) => void;
  onSuggestionComplete: (text: string) => void;
  onSessionStarted: (callId: string) => void;
  onSessionEnded: () => void;
  onError: (message: string) => void;
  onConnectError?: () => void;
}

export function useCoachSocket({
  onTranscript,
  onSuggestionChunk,
  onSuggestionComplete,
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
        // Binary frame: audio payload for TTS playback
        if (event.data instanceof ArrayBuffer) {
          if (expectingAudioRef.current) {
            expectingAudioRef.current = false;
            const buffer = event.data.slice(0); // copy before async hand-off
            (async () => {
              try {
                if (!audioCtxRef.current) {
                  audioCtxRef.current = new AudioContext();
                }
                const ctx = audioCtxRef.current;
                await ctx.resume(); // satisfy browser autoplay policy

                // Cancel any currently-playing suggestion audio
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
                setIsSpeaking(true);
                source.onended = () => {
                  setIsSpeaking(false);
                  activeSourceRef.current = null;
                };
                source.start();
                activeSourceRef.current = source;
              } catch (err) {
                console.error('[Audio playback]', err);
                setIsSpeaking(false);
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
          case 'suggestion_chunk':
            onSuggestionChunk(msg.text);
            break;
          case 'suggestion_complete':
            onSuggestionComplete(msg.text);
            break;
          case 'suggestion_audio_ready':
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
  }, [onTranscript, onSuggestionChunk, onSuggestionComplete, onSessionStarted, onSessionEnded, onError, onConnectError]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

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
