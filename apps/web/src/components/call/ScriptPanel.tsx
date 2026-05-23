'use client';

import { useEffect, useRef } from 'react';
import { Mic, Clock, FileText } from 'lucide-react';
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

export function ScriptPanel({ scripts, currentChunk, isListening, isCallActive, onListen }: ScriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isGenerating = currentChunk.length > 0;
  const latest = scripts[scripts.length - 1];
  const history = scripts.slice(0, -1).reverse();

  useEffect(() => {
    if (isGenerating) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentChunk, isGenerating]);

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

        <button
          onClick={onListen}
          disabled={!isCallActive || isGenerating}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200',
            isListening
              ? 'bg-amber-100 text-amber-700 border border-amber-200 cursor-default'
              : isGenerating
                ? 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed'
                : !isCallActive
                  ? 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                  : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/25 hover:shadow-md hover:shadow-amber-500/30',
          )}
        >
          <Mic
            size={11}
            className={cn(isListening && 'animate-pulse')}
          />
          {isListening ? 'Escuchando…' : isGenerating ? 'Generando…' : 'Escuchar cliente'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
        {/* Listening indicator */}
        {isListening && !isGenerating && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl flex-shrink-0">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <span className="text-xs font-semibold text-amber-700">Escuchando al cliente…</span>
          </div>
        )}

        {/* Streaming script */}
        {isGenerating && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 animate-slide-in flex-shrink-0">
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

        {/* Latest completed script */}
        {!isGenerating && latest && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4 animate-slide-in shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={12} className="text-amber-600" />
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                Guion listo
              </span>
            </div>
            <ScriptContent text={latest.text} />
          </div>
        )}

        {/* Empty state */}
        {!isGenerating && !latest && !isListening && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Mic size={20} className="text-amber-300" />
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
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
      </div>
    </div>
  );
}
