'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { DollarSign, Building2, AlertCircle, Tag, WifiOff } from 'lucide-react';

const wsConfigured = Boolean(process.env.NEXT_PUBLIC_API_WS_URL);
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { useCoachSocket } from '@/hooks/useCoachSocket';
import { TranscriptFeed } from './TranscriptFeed';
import { AgentResponsePanel } from './AgentResponsePanel';
import { ScriptPanel } from './ScriptPanel';
import { AudioControls } from './AudioControls';
import type { Client, Product, TranscriptEntry, AgentResponse, ServerMessage } from '@/lib/types';

interface CallCoachProps {
  client: Client;
  product: Product;
  sellerId: string;
  agentName?: string;
}

export function CallCoach({ client, product, sellerId, agentName = 'Agente' }: CallCoachProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [liveText, setLiveText] = useState('');
  const [liveSpeaker, setLiveSpeaker] = useState<'agent' | 'client'>('client');
  const [agentResponses, setAgentResponses] = useState<AgentResponse[]>([]);
  const [currentAgentChunk, setCurrentAgentChunk] = useState('');
  const [isCallActive, setIsCallActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Script mode state
  const [appMode, setAppMode] = useState<'agent' | 'script'>('agent');
  const [scripts, setScripts] = useState<AgentResponse[]>([]);
  const [currentScriptChunk, setCurrentScriptChunk] = useState('');
  const [isScriptListening, setIsScriptListening] = useState(false);
  const [openingScript, setOpeningScript] = useState<string | null>(null);
  const [openingScriptChunk, setOpeningScriptChunk] = useState('');
  const [isGeneratingOpening, setIsGeneratingOpening] = useState(false);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const handleGenerateOpening = useCallback(async () => {
    if (isGeneratingOpening) return;
    setIsGeneratingOpening(true);
    setOpeningScript(null);
    setOpeningScriptChunk('');
    try {
      const wsUrl = process.env.NEXT_PUBLIC_API_WS_URL ?? 'ws://localhost:3001/ws';
      const apiUrl = wsUrl
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://')
        .replace(/\/ws$/, '');

      const res = await fetch(`${apiUrl}/opening-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, productId: product.id, sellerId }),
      });

      if (!res.ok || !res.body) throw new Error('Error del servidor al generar el guion.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setOpeningScriptChunk(fullText);
      }

      setOpeningScript(fullText);
      setOpeningScriptChunk('');
    } catch (err) {
      console.error('[Opening script]', err);
      setServerError(err instanceof Error ? err.message : 'Error al generar el guion de apertura.');
    } finally {
      setIsGeneratingOpening(false);
    }
  }, [isGeneratingOpening, client.id, product.id, sellerId]);

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

  const handleAgentChunk = useCallback((text: string) => {
    setCurrentAgentChunk((prev) => prev + text);
  }, []);

  const handleAgentResponse = useCallback((text: string) => {
    setAgentResponses((prev) => [...prev, { text, timestamp: Date.now() }]);
    setCurrentAgentChunk('');
  }, []);

  const handleAgentResponseCancelled = useCallback(() => {
    setCurrentAgentChunk('');
  }, []);

  const handleAgentIntro = useCallback((text: string) => {
    // Add intro to transcript as agent entry
    setTranscript((prev) => [...prev, { speaker: 'agent', text, timestamp: Date.now() }]);
    setAgentResponses((prev) => [...prev, { text, timestamp: Date.now() }]);
  }, []);

  const handleScriptListening = useCallback(() => {
    setIsScriptListening(true);
  }, []);

  const handleScriptChunk = useCallback((text: string) => {
    setIsScriptListening(false);
    setCurrentScriptChunk((prev) => prev + text);
  }, []);

  const handleScriptReady = useCallback((text: string) => {
    setScripts((prev) => [...prev, { text, timestamp: Date.now() }]);
    setCurrentScriptChunk('');
    setIsScriptListening(false);
  }, []);

  const handleSessionStarted = useCallback((_callId: string) => {}, []);

  const handleSessionEnded = useCallback(() => {
    setIsCallActive(false);
    stopTimer();
  }, [stopTimer]);

  const handleConnectError = useCallback(() => {
    setIsCallActive(false);
    stopTimer();
    setServerError('No se pudo conectar al servidor. Verifica que NEXT_PUBLIC_API_WS_URL esté configurada correctamente.');
  }, [stopTimer]);

  const { sendAudio, sendMessage, connect, disconnect, isSpeaking } = useCoachSocket({
    onTranscript: handleTranscript,
    onAgentChunk: handleAgentChunk,
    onAgentResponse: handleAgentResponse,
    onAgentResponseCancelled: handleAgentResponseCancelled,
    onAgentIntro: handleAgentIntro,
    onSessionStarted: handleSessionStarted,
    onSessionEnded: handleSessionEnded,
    onError: (msg) => { console.error('[Agent]', msg); setServerError(msg); },
    onConnectError: handleConnectError,
    onScriptListening: handleScriptListening,
    onScriptChunk: handleScriptChunk,
    onScriptReady: handleScriptReady,
  });

  const { isRecording, error: audioError, startCapture, stopCapture } = useAudioCapture({
    onChunk: sendAudio,
  });

  const handleSwitchMode = useCallback(
    (mode: 'agent' | 'script') => {
      setAppMode(mode);
      setIsScriptListening(false);
      setCurrentScriptChunk('');
      sendMessage({ type: 'set_mode', mode });
    },
    [sendMessage],
  );

  const handleScriptListen = useCallback(() => {
    setCurrentScriptChunk('');
    sendMessage({ type: 'start_script_listen' });
  }, [sendMessage]);

  const handleStartCall = useCallback(
    async (withSystemAudio: boolean) => {
      setTranscript([]);
      setAgentResponses([]);
      setCurrentAgentChunk('');
      setScripts([]);
      setCurrentScriptChunk('');
      setIsScriptListening(false);
      setServerError(null);
      setIsCallActive(true);
      startTimer();
      try {
        await connect();
        sendMessage({ type: 'start_session', clientId: client.id, productId: product.id, sellerId });
        await startCapture(withSystemAudio);
      } catch (err) {
        setIsCallActive(false);
        stopTimer();
        setServerError(err instanceof Error ? err.message : 'Error al conectar con el servidor.');
      }
    },
    [client.id, product.id, sellerId, connect, startCapture, sendMessage, startTimer, stopTimer],
  );

  const handleEndCall = useCallback(async () => {
    sendMessage({ type: 'end_session' });
    stopCapture();
    stopTimer();
    setTimeout(disconnect, 1500);
    setIsCallActive(false);
    setLiveText('');
  }, [sendMessage, stopCapture, disconnect, stopTimer]);

  return (
    <div className="flex flex-col h-full gap-4 min-h-0 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{client.name}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {[client.company, client.industry].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => handleSwitchMode('agent')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                appMode === 'agent'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Modo Agente
            </button>
            <button
              onClick={() => handleSwitchMode('script')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                appMode === 'script'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Modo Guion
            </button>
          </div>
          <div className="text-xs text-slate-500 font-medium bg-white border border-slate-100 shadow-card px-3 py-1.5 rounded-lg">
            {product.name}
          </div>
        </div>
      </div>

      {/* WebSocket not configured warning */}
      {!wsConfigured && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm flex-shrink-0">
          <WifiOff size={14} className="flex-shrink-0 text-rose-400" />
          <span>
            <strong className="font-semibold">Servidor no configurado.</strong>{' '}
            <code className="text-xs bg-rose-100 px-1.5 py-0.5 rounded font-mono">NEXT_PUBLIC_API_WS_URL</code> no está definida.
          </span>
        </div>
      )}

      {/* Server error banner */}
      {serverError && (
        <div className="flex items-start gap-2.5 px-4 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm flex-shrink-0">
          <AlertCircle size={14} className="flex-shrink-0 text-rose-400 mt-0.5" />
          <div>
            <strong className="font-semibold">Error del servidor: </strong>
            {serverError}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-[220px_1fr_280px] gap-4 flex-1 min-h-0">
        {/* Client context panel */}
        <div className="bg-white rounded-2xl p-4 overflow-y-auto border border-slate-100 shadow-card space-y-4">
          <h2 className="text-xs font-semibold text-slate-400">Contexto del cliente</h2>

          {client.pain_points && (
            <section>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle size={12} className="text-amber-500" />
                <p className="text-xs font-semibold text-amber-600">Pain Points</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{client.pain_points}</p>
            </section>
          )}

          {client.notes && (
            <section>
              <p className="text-xs font-semibold text-slate-400 mb-1.5">Notas</p>
              <p className="text-xs text-slate-500 leading-relaxed">{client.notes}</p>
            </section>
          )}

          {client.current_plan && (
            <section>
              <p className="text-xs font-semibold text-indigo-500 mb-2">Plan actual</p>
              <div className="space-y-1.5">
                {(client.current_plan.status as string | undefined) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Estado</span>
                    <span className="text-xs font-medium text-slate-700 capitalize">
                      {client.current_plan.status as string}
                    </span>
                  </div>
                )}
                {(client.current_plan.proposed_plan as string | undefined) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Plan propuesto</span>
                    <span className="text-xs font-medium text-slate-700">
                      {client.current_plan.proposed_plan as string}
                    </span>
                  </div>
                )}
                {(client.current_plan.stage as string | undefined) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Etapa</span>
                    <span className="text-xs font-medium text-slate-700 capitalize">
                      {client.current_plan.stage as string}
                    </span>
                  </div>
                )}
                {(client.current_plan.next_step as string | undefined) && (
                  <div className="mt-1.5 p-2 bg-indigo-50 rounded-lg">
                    <p className="text-xs text-slate-400 mb-0.5">Próximo paso</p>
                    <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                      {client.current_plan.next_step as string}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <h2 className="text-xs font-semibold text-slate-400">Producto</h2>

            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Building2 size={12} className="text-indigo-400" />
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
                <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                  <Tag size={10} />
                  Características
                </p>
                <ul className="space-y-1.5">
                  {product.features.map((f) => (
                    <li key={f} className="text-xs text-slate-500 flex items-start gap-1.5">
                      <span className="text-indigo-400 mt-0.5">·</span>
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
          agentName={agentName}
        />

        {/* Right panel: Agent responses (agent mode) or Script panel (script mode) */}
        {appMode === 'agent' ? (
          <AgentResponsePanel
            responses={agentResponses}
            currentChunk={currentAgentChunk}
            isSpeaking={isSpeaking}
            agentName={agentName}
          />
        ) : (
          <ScriptPanel
            scripts={scripts}
            currentChunk={currentScriptChunk}
            isListening={isScriptListening}
            isCallActive={isCallActive}
            onListen={handleScriptListen}
            clientName={client.name}
            openingScript={openingScript}
            openingScriptChunk={openingScriptChunk}
            isGeneratingOpening={isGeneratingOpening}
            onGenerateOpening={handleGenerateOpening}
          />
        )}
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
