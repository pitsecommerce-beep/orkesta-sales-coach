'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DollarSign, Building2, AlertCircle, Tag, WifiOff } from 'lucide-react';

const wsConfigured = Boolean(process.env.NEXT_PUBLIC_API_WS_URL);
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useCoachSocket } from '@/hooks/useCoachSocket';
import { TranscriptFeed } from './TranscriptFeed';
import { SuggestionPanel } from './SuggestionPanel';
import { AudioControls } from './AudioControls';
import type { Client, Product, TranscriptEntry, Suggestion, ServerMessage } from '@/lib/types';

interface CallCoachProps {
  client: Client;
  product: Product;
  sellerId: string;
}

export function CallCoach({ client, product, sellerId }: CallCoachProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [liveText, setLiveText] = useState('');
  const [liveSpeaker, setLiveSpeaker] = useState<'seller' | 'client'>('client');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [currentSuggestion, setCurrentSuggestion] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => stopTimer(), []);

  const handleTranscript = useCallback((msg: Extract<ServerMessage, { type: 'transcript' }>) => {
    setLiveText(msg.isFinal ? '' : msg.text);
    setLiveSpeaker(msg.speaker);

    if (msg.isFinal && msg.text.trim()) {
      setTranscript((prev) => [
        ...prev,
        { speaker: msg.speaker, text: msg.text, timestamp: msg.timestamp },
      ]);
    }
  }, []);

  const handleSuggestionChunk = useCallback((text: string) => {
    setCurrentSuggestion((prev) => prev + text);
  }, []);

  const handleSuggestionComplete = useCallback((text: string) => {
    setSuggestions((prev) => [...prev, { text, timestamp: Date.now() }]);
    setCurrentSuggestion('');
  }, []);

  const handleSessionStarted = useCallback((_callId: string) => {
    startTimer();
  }, []);

  const handleSessionEnded = useCallback(() => {
    setIsCallActive(false);
    stopTimer();
  }, []);

  const { sendAudio, sendMessage, connect, disconnect } = useCoachSocket({
    onTranscript: handleTranscript,
    onSuggestionChunk: handleSuggestionChunk,
    onSuggestionComplete: handleSuggestionComplete,
    onSessionStarted: handleSessionStarted,
    onSessionEnded: handleSessionEnded,
    onError: (msg) => console.error('[Coach]', msg),
  });

  const { isRecording, error: audioError, startCapture, stopCapture } = useAudioCapture({
    onChunk: sendAudio,
  });

  const handleStartCall = useCallback(
    async (withSystemAudio: boolean) => {
      connect();
      await new Promise((r) => setTimeout(r, 300));
      await startCapture(withSystemAudio);
      sendMessage({ type: 'start_session', clientId: client.id, productId: product.id, sellerId });
      setIsCallActive(true);
      setTranscript([]);
      setSuggestions([]);
      setCurrentSuggestion('');
    },
    [client.id, product.id, sellerId, connect, startCapture, sendMessage],
  );

  const handleEndCall = useCallback(async () => {
    sendMessage({ type: 'end_session' });
    stopCapture();
    stopTimer();
    setTimeout(disconnect, 1500);
    setIsCallActive(false);
    setLiveText('');
  }, [sendMessage, stopCapture, disconnect]);

  return (
    <div className="flex flex-col h-full gap-4 min-h-0 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">{client.name}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {client.company} · {client.industry}
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium bg-white border border-slate-100 shadow-card px-3 py-1.5 rounded-lg">
          {product.name}
        </div>
      </div>

      {/* WebSocket not configured warning */}
      {!wsConfigured && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm flex-shrink-0">
          <WifiOff size={14} className="flex-shrink-0 text-rose-400" />
          <span>
            <strong className="font-semibold">Servidor de coaching no configurado.</strong>{' '}
            <code className="text-xs bg-rose-100 px-1.5 py-0.5 rounded font-mono">NEXT_PUBLIC_API_WS_URL</code> no está
            definida. Las llamadas se intentarán en{' '}
            <code className="text-xs bg-rose-100 px-1.5 py-0.5 rounded font-mono">ws://localhost:3001/ws</code>.
          </span>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-[220px_1fr_280px] gap-4 flex-1 min-h-0">
        {/* Client context panel */}
        <div className="bg-white rounded-2xl p-4 overflow-y-auto border border-slate-100 shadow-card space-y-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Contexto del cliente
          </h2>

          {client.pain_points && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle size={11} className="text-amber-500" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500">
                  Pain Points
                </p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{client.pain_points}</p>
            </section>
          )}

          {client.notes && (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Notas
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">{client.notes}</p>
            </section>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Producto
            </h2>

            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Building2 size={11} className="text-indigo-400" />
                <p className="text-xs text-slate-700 font-semibold">{product.name}</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <DollarSign size={10} />
                  Precio sugerido
                </div>
                <span className="text-xs font-semibold text-emerald-600">
                  ${product.suggested_price.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <DollarSign size={10} />
                  Mínimo
                </div>
                <span className="text-xs font-semibold text-rose-500">
                  ${product.min_price.toLocaleString()}
                </span>
              </div>
            </div>

            {product.features.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                  <Tag size={9} />
                  Características
                </p>
                <ul className="space-y-1.5">
                  {product.features.map((f) => (
                    <li key={f} className="text-xs text-slate-500 flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5 font-bold">·</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Transcript */}
        <TranscriptFeed
          entries={transcript}
          liveText={liveText}
          liveSpeaker={liveSpeaker}
          isActive={isCallActive}
        />

        {/* AI Suggestions */}
        <SuggestionPanel suggestions={suggestions} currentSuggestion={currentSuggestion} />
      </div>

      {/* Audio controls bar */}
      <div className="flex-shrink-0">
        <AudioControls
          isCallActive={isCallActive}
          isRecording={isRecording}
          audioError={audioError}
          duration={duration}
          onStartCall={handleStartCall}
          onEndCall={handleEndCall}
        />
      </div>
    </div>
  );
}
