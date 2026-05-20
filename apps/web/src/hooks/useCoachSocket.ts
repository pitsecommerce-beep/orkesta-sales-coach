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
}

export function useCoachSocket({
  onTranscript,
  onSuggestionChunk,
  onSuggestionComplete,
  onSessionStarted,
  onSessionEnded,
  onError,
}: UseCoachSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    const url = process.env.NEXT_PUBLIC_API_WS_URL ?? 'ws://localhost:3001/ws';
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
    };

    ws.onmessage = (event: MessageEvent<string>) => {
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
  }, [onTranscript, onSuggestionChunk, onSuggestionComplete, onSessionStarted, onSessionEnded, onError]);

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

  return { isConnected, connect, disconnect, sendAudio, sendMessage };
}
