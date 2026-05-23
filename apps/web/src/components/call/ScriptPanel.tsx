'use client';

import { useEffect, useRef } from 'react';
import { Mic, Clock, FileText, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScriptEntry {
  text: string;
  timestamp: number;
}

interface ScriptPanelProps {
  scripts: ScriptEntry[];
  currentChunk: string;
  isListening: boolean;
  isCallActive: boolean;
  onListen: () => void;
  clientName: string;
  openingScript: string | null;
  openingScriptChunk: string;
  isGeneratingOpening: boolean;
  onGenerateOpening: () => void;
}

function ScriptLine({ line, index }: { line: string; index: number }) {
  const trimmed = line.trim();
  if (!trimmed) return <div key={index} className="h-2" />;

  if (/^\*\*.+\*\*$/.test(trimmed)) {
    const label = trimmed.slice(2, -2);
    return (
      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mt-3 mb-1 first:mt-0">
        {label}
      </p>
    );
  }

  if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
    return (
      <div className="flex gap-2 mb-1">
        <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
        <p className="text-sm text-slate-700 leading-relaxed">{trimmed.slice(2)}</p>
      </div>
    );
  }

  return <p className="text-sm text-slate-800 leading-relaxed mb-1">{trimmed}</p>;
}

function ScriptContent({ text }: { text: string }) {
  return (
    <div className="space-y-0.5">
      {text.split('\n').map((line, i) => (
        <ScriptLine key={i} line={line} index={i} />
      ))}
    </div>
  );
}

export function ScriptPanel({
  scripts,
  currentChunk,
  isListening,
  isCallActive,
  onListen,
  clientName,
  openingScript,
  openingScriptChunk,
  isGeneratingOpening,
  onGenerateOpening,
}: ScriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const openingBottomRef = useRef<HTMLDivElement>(null);
  const isGeneratingScript = currentChunk.length > 0;
  const latest = scripts[scripts.length - 1];
  const history = scripts.slice(0, -1).reverse();
  const isOpeningStreaming = openingScriptChunk.length > 0;

  useEffect(() => {
    if (isGeneratingScript) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChunk, isGeneratingScript]);

  useEffect(() => {
    if (isOpeningStreaming) {
      openingBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [openingScriptChunk, isOpeningStreaming]);

  return (
    <div className="bg-white rounded-2xl flex flex-col overflow-hidden border border-slate-100 shadow-card">
      {/* Header with listen button */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center">
            <FileText size={11} className="text-amber-600" />
          </div>
          <h2 className="text-xs font-semibold text-slate-400">Modo Guion</h2>
        </div>

        {isCallActive && (
          <button
            onClick={onListen}
            disabled={isGeneratingScript}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
              isListening
                ? 'bg-amber-100 text-amber-700 border border-amber-200 cursor-default'
                : isGeneratingScript
                  ? 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
                  : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/25 hover:shadow-md hover:shadow-amber-500/30',
            )}
          >
            <Mic size={11} className={cn(isListening && 'animate-pulse')} />
            {isListening ? 'Escuchando…' : isGeneratingScript ? 'Generando…' : 'Escuchar cliente'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">

        {/* ── OPENING SCRIPT SECTION ── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <Sparkles size={10} />
              Guion de apertura — {clientName}
            </p>
            <button
              onClick={onGenerateOpening}
              disabled={isGeneratingOpening || isOpeningStreaming}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-200',
                isGeneratingOpening || isOpeningStreaming
                  ? 'text-slate-400 cursor-not-allowed'
                  : openingScript
                    ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/25',
              )}
            >
              {openingScript ? (
                <>
                  <RefreshCw size={9} className={cn(isGeneratingOpening && 'animate-spin')} />
                  Regenerar
                </>
              ) : (
                <>
                  <Sparkles size={9} />
                  {isGeneratingOpening || isOpeningStreaming ? 'Generando…' : 'Generar'}
                </>
              )}
            </button>
          </div>

          {/* Generating opening script */}
          {isOpeningStreaming && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                  Generando guion de apertura…
                </span>
              </div>
              <ScriptContent text={openingScriptChunk} />
              <div ref={openingBottomRef} />
            </div>
          )}

          {/* Completed opening script */}
          {!isOpeningStreaming && openingScript && (
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4">
              <ScriptContent text={openingScript} />
            </div>
          )}

          {/* Empty state for opening */}
          {!isOpeningStreaming && !openingScript && (
            <div className="flex flex-col items-center justify-center py-6 gap-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Sparkles size={16} className="text-slate-300" />
              <p className="text-xs text-slate-400 text-center leading-relaxed">
                Genera un guion completo antes de llamar:<br />
                apertura, descubrimiento, propuesta y cierre
              </p>
            </div>
          )}
        </section>

        {/* ── REACTIVE SCRIPTS SECTION (during call) ── */}
        {(isCallActive || scripts.length > 0 || isListening || isGeneratingScript) && (
          <section>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
              <Mic size={10} />
              Durante la llamada
            </p>

            {/* Listening indicator */}
            {isListening && !isGeneratingScript && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl mb-3">
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                </span>
                <span className="text-xs font-semibold text-amber-700">Escuchando al cliente…</span>
              </div>
            )}

            {/* Streaming reactive script */}
            {isGeneratingScript && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 animate-slide-in mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                    Generando guion…
                  </span>
                </div>
                <ScriptContent text={currentChunk} />
                <div ref={bottomRef} />
              </div>
            )}

            {/* Latest completed reactive script */}
            {!isGeneratingScript && latest && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4 animate-slide-in shadow-sm mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={12} className="text-amber-600" />
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                    Último guion
                  </span>
                </div>
                <ScriptContent text={latest.text} />
              </div>
            )}

            {/* Empty state during call */}
            {!isGeneratingScript && !latest && !isListening && isCallActive && (
              <div className="flex flex-col items-center justify-center py-5 text-center gap-2">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pulsa <strong className="text-slate-500 font-semibold">Escuchar cliente</strong><br />
                  justo antes de que hable el cliente
                </p>
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                  <Clock size={10} />
                  Anteriores
                </p>
                {history.map((s, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl px-3.5 py-3 border border-slate-100">
                    <ScriptContent text={s.text} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
